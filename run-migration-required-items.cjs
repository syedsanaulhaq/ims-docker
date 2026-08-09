const { getPool, initializePool, closePool, sql } = require('./server/db/connection.cjs');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    await initializePool();
    const pool = getPool();
    const migrationSql = fs.readFileSync(
      path.join(__dirname, 'server/migrations/create_required_items_table.sql'),
      'utf8'
    );

    // Split on GO if present, otherwise run as single batch
    const batches = migrationSql.split(/\bGO\b/i).map(b => b.trim()).filter(Boolean);
    for (const batch of batches) {
      await pool.request().query(batch);
    }
    } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    try { await closePool(); } catch {}
  }
}
runMigration();
