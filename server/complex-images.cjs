const { createHash } = require('node:crypto');
const { inTransaction } = require('./transaction.cjs');

const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_IMAGE_CHANGES_PER_HOUR = 30;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURES = {
  png: bytes => bytes.subarray(0, 8).equals(PNG_SIGNATURE),
  jpeg: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  webp: bytes => bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP'
};

function parseImage(value, fail) {
  const invalid = () => fail(400, 'Elegí una imagen PNG, JPG o WebP válida de hasta 1 MB.');
  if (typeof value !== 'string' || value.length > MAX_IMAGE_BYTES * 2) invalid();
  const header = value.match(/^data:image\/(png|jpeg|webp);base64,/);
  if (!header) invalid();
  const encoded = value.slice(header[0].length), bytes = Buffer.from(encoded, 'base64');
  // The declared type must match the file itself, and the text must be canonical base64.
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== encoded || !SIGNATURES[header[1]](bytes)) invalid();
  return { mime: `image/${header[1]}`, encoded, bytes };
}

function complexImages({ db, fail, limit }) {
  async function save(complexId, data, actor) {
    if (Object.keys(data).some(key => key !== 'image')) fail(400, 'Solo se permite actualizar la imagen.');
    limit(`complex-image:${complexId}`, MAX_IMAGE_CHANGES_PER_HOUR, 3600000);
    const { mime, encoded, bytes } = parseImage(data.image, fail);
    const version = createHash('sha256').update(bytes).digest('hex').slice(0, 32);
    const image = `api/complexes/${encodeURIComponent(complexId)}/image?v=${version}`;
    await inTransaction(db, async () => {
      // Writing the image first serializes concurrent changes before the complex is read.
      await db.prepare('INSERT INTO complex_images(complex_id,mime,data,version,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(complex_id) DO UPDATE SET mime=excluded.mime,data=excluded.data,version=excluded.version,updated_at=excluded.updated_at').run(complexId, mime, encoded, version, new Date().toISOString());
      const row = await db.prepare('SELECT data FROM complexes WHERE id=?').get(complexId);
      await db.prepare('UPDATE complexes SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(row.data), image }), complexId);
      await db.prepare('INSERT INTO audit_log(complex_id,action,actor) VALUES(?,?,?)').run(complexId, 'Imagen del catálogo actualizada', actor);
    });
    return { image };
  }

  async function serve(res, complexId, requestedVersion) {
    const row = await db.prepare('SELECT mime,data,version FROM complex_images WHERE complex_id=?').get(complexId);
    if (!row) fail(404, 'Imagen no encontrada.');
    const bytes = Buffer.from(row.data, 'base64');
    res.writeHead(200, {
      'Content-Type': row.mime,
      'Content-Length': bytes.length,
      // Each version has its own address, so only the current one may be cached.
      'Cache-Control': requestedVersion === row.version ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'no-store'
    });
    res.end(bytes);
  }

  return { save, serve };
}

module.exports = { complexImages };
