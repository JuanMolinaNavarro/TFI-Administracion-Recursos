// PostgreSQL provides db.transaction; SQLite uses an explicit write transaction.
async function inTransaction(db, fn) {
  if (db.transaction) return db.transaction(fn);
  await db.exec('BEGIN IMMEDIATE');
  try {
    const result = await fn();
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
module.exports = { inTransaction };
