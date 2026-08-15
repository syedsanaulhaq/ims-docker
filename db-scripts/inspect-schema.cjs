const { initializePool, getPool, sql } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');
dotenv.config();
async function main() {
  await initializePool();
  const pool = getPool();

  // 1. Check columns in stock_issuance_requests
  const sirCols = await pool.request().query(`
    SELECT name, system_type_name, max_length
    FROM sys.dm_exec_describe_first_result_set(N'SELECT TOP 1 * FROM stock_issuance_requests', NULL, 0)
    WHERE name LIKE '%issue%' OR name LIKE '%deliver%' OR name LIKE '%receive%' OR name LIKE '%dispatch%' OR name LIKE '%nq%' OR name LIKE '%driver%' OR name LIKE '%confirm%'
    ORDER BY name
  `);
  console.table(sirCols.recordset);

  // 2. What is the full check constraint
  const ck = await pool.request().query(`
    SELECT cc.name, cc.definition
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.name = 'stock_issuance_requests'
  `);
  console.table(ck.recordset);

  // 3. All columns in stock_issuance_requests
  const allCols = await pool.request().query(`
    SELECT c.name, tp.name as type, c.max_length
    FROM sys.columns c
    INNER JOIN sys.types tp ON tp.user_type_id = c.user_type_id
    INNER JOIN sys.tables t ON t.object_id = c.object_id
    WHERE t.name = 'stock_issuance_requests'
    ORDER BY c.column_id
  `);
  console.table(allCols.recordset);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
