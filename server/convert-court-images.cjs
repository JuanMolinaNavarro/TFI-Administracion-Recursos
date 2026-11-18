const { loadEnvironment } = require('./config.cjs');
const { openPostgres } = require('./postgres.cjs');
const { openDatabase } = require('./database.cjs');
const { courtImages } = require('./court-images.cjs');

// Without --apply this only reports what would change.
async function main() {
  const apply = process.argv.includes('--apply');
  loadEnvironment();
  const postgres = Boolean(process.env.DATABASE_URL);
  const db = postgres ? await openPostgres({ initialize: apply }) : openDatabase();
  try {
    const report = await courtImages({ db }).convertLegacy({ apply });
    console.log(`Base: ${postgres ? 'PostgreSQL (DATABASE_URL)' : 'SQLite local'}`);
    console.log(`Canchas: ${report.total}. Con foto dentro de la cancha: ${report.legacy}. Convertibles: ${report.convertible}.`);
    console.log(apply ? `Convertidas: ${report.converted}. Editadas durante la conversión: ${report.conflicts}.` : 'Vista previa: no se modificó nada. Usá --apply para convertir.');
    if (report.invalid.length) console.log(`Fotos ilegibles, sin cambios: ${report.invalid.join(', ')}`);
    if (report.conflicts) console.log('Volvé a ejecutar el comando para revisar las canchas editadas.');
  } finally {
    await db.close();
  }
}

main().catch(error => {
  console.error('Conversión cancelada:', error.code || error.message);
  process.exitCode = 1;
});
