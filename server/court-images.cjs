const { inTransaction } = require('./transaction.cjs');
const { parseImage, readImage, sendImage } = require('./complex-images.cjs');

// Court photos used to live inside courts.data, with a limit of 2.4 million characters.
const LEGACY_MAX_BYTES = 1800000;
const MAX_UPLOADS_PER_HOUR = 120;
const FALLBACK_IMAGE = 'assets/padel-v1.webp';
const INVALID_PHOTO = 'Foto inválida.';

const imageAddress = (courtId, version) => `api/courts/${encodeURIComponent(courtId)}/image?v=${version}`;
const addressedCourt = value => value.match(/^api\/courts\/([a-z0-9_-]+)\/image\?v=[a-f0-9]{32}$/i)?.[1];
const isLegacy = image => typeof image === 'string' && image.startsWith('data:');
const legacyFile = image => readImage(image, LEGACY_MAX_BYTES);

function courtImages({ db, fail, limit }) {
  // Until the conversion runs, legacy photos are published through the same address they will keep.
  function publicCourt(court) {
    if (!isLegacy(court.image)) return court;
    const file = legacyFile(court.image);
    return { ...court, image: file ? imageAddress(court.id, file.version) : FALLBACK_IMAGE };
  }

  function chosenPhoto(value, courtId, complexId, current) {
    if (typeof value !== 'string') fail(400, INVALID_PHOTO);
    if (value === current || addressedCourt(value) === courtId) {
      if (!isLegacy(current)) return { image: current };
      const file = legacyFile(current);
      return file ? { image: imageAddress(courtId, file.version), file } : { image: FALLBACK_IMAGE, remove: true };
    }
    if (/^assets\/[a-z0-9_.-]+$/i.test(value)) return { image: value, remove: true };
    if (!value.startsWith('data:')) fail(400, INVALID_PHOTO);
    limit(`court-image:${complexId}`, MAX_UPLOADS_PER_HOUR, 3600000);
    const file = parseImage(value, fail);
    return { image: imageAddress(courtId, file.version), file };
  }

  async function storedFile(courtId) {
    const row = await db.prepare('SELECT complex_id,mime,data,version FROM court_images WHERE court_id=?').get(courtId);
    if (row) return row;
    const court = await db.prepare('SELECT complex_id,data FROM courts WHERE id=?').get(courtId);
    const image = court && JSON.parse(court.data).image;
    const file = isLegacy(image) ? legacyFile(image) : null;
    return file && { ...file, complex_id: court.complex_id };
  }

  async function storeFile(courtId, complexId, { mime, data, version }) {
    await db.prepare('INSERT INTO court_images(court_id,complex_id,mime,data,version,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(court_id) DO UPDATE SET mime=excluded.mime,data=excluded.data,version=excluded.version,updated_at=excluded.updated_at').run(courtId, complexId, mime, data, version, new Date().toISOString());
  }

  async function applyPhoto(court, photo) {
    if (photo.file) await storeFile(court.id, court.complexId, photo.file);
    else if (photo.remove) await db.prepare('DELETE FROM court_images WHERE court_id=?').run(court.id);
  }

  async function create(court, value) {
    // The new-court form starts from a sibling, so its photo is copied within the complex.
    const source = typeof value === 'string' ? addressedCourt(value) : null;
    let photo;
    if (source) {
      const file = await storedFile(source);
      if (file?.complex_id !== court.complexId) fail(400, INVALID_PHOTO);
      photo = { image: imageAddress(court.id, file.version), file };
    } else photo = chosenPhoto(value, court.id, court.complexId);
    const created = { ...court, image: photo.image };
    await inTransaction(db, async () => {
      await db.prepare('INSERT INTO courts(id,complex_id,data) VALUES(?,?,?)').run(created.id, created.complexId, JSON.stringify(created));
      await applyPhoto(created, photo);
    });
    return created;
  }

  async function update(court, storedData, value) {
    const photo = chosenPhoto(value, court.id, court.complexId, court.image);
    const updated = { ...court, image: photo.image };
    await inTransaction(db, async () => {
      // Comparing the stored row keeps the court and its file in step under concurrent saves.
      const { changes } = await db.prepare('UPDATE courts SET data=? WHERE id=? AND complex_id=? AND data=?').run(JSON.stringify(updated), court.id, court.complexId, storedData);
      if (!changes) fail(409, 'La cancha cambió mientras la editabas. Actualizá la página e intentá de nuevo.');
      await applyPhoto(updated, photo);
    });
    return updated;
  }

  async function serve(res, courtId, requestedVersion) {
    const file = await storedFile(courtId);
    if (!file) fail(404, 'Imagen no encontrada.');
    sendImage(res, file, requestedVersion);
  }

  async function convertRow(row, court, file) {
    return inTransaction(db, async () => {
      // A bulk conversion is not an edit by the club, so PostgreSQL skips its audit trigger.
      if (db.kind === 'postgres') await db.query("SELECT set_config('rtl.importing','on',true)");
      const converted = JSON.stringify({ ...court, image: imageAddress(row.id, file.version) });
      const { changes } = await db.prepare('UPDATE courts SET data=? WHERE id=? AND data=?').run(converted, row.id, row.data);
      if (changes) await storeFile(row.id, row.complex_id, file);
      return Boolean(changes);
    });
  }

  async function convertLegacy({ apply = false } = {}) {
    const rows = await db.prepare('SELECT id,complex_id,data FROM courts ORDER BY rowid').all();
    const report = { total: rows.length, legacy: 0, convertible: 0, converted: 0, conflicts: 0, invalid: [] };
    for (const row of rows) {
      const court = JSON.parse(row.data);
      if (!isLegacy(court.image)) continue;
      report.legacy++;
      const file = legacyFile(court.image);
      if (!file) { report.invalid.push(row.id); continue; }
      report.convertible++;
      if (!apply) continue;
      if (await convertRow(row, court, file)) report.converted++;
      else report.conflicts++;
    }
    return report;
  }

  return { publicCourt, create, update, serve, convertLegacy };
}

module.exports = { courtImages };
