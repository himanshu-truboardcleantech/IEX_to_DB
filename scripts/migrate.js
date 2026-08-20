const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');
const { loadExcel } = require('./load_iex_dsm');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema applied.');

  await loadExcel();
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
