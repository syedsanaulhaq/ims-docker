/**
 * Migration: Add delivery tracking columns to stock_issuance_requests
 * and create a new issuance_deliveries table for per-delivery records.
 */
const { initializePool, getPool, sql } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  await initializePool();
  const pool = getPool();

  // 1. Add delivery columns to stock_issuance_requests
  const alterCols = [
    { name: 'dispatch_method',       ddl: "NVARCHAR(20) NULL" },         // 'Direct','NQ','Driver'
    { name: 'dispatch_notes',        ddl: "NVARCHAR(MAX) NULL" },
    { name: 'dispatched_at',         ddl: "DATETIME2 NULL" },
    { name: 'dispatched_by',         ddl: "NVARCHAR(450) NULL" },
    { name: 'dispatcher_name',       ddl: "NVARCHAR(200) NULL" },        // NQ / Driver name
    { name: 'delivery_confirmed_at', ddl: "DATETIME2 NULL" },
    { name: 'delivery_confirmed_by', ddl: "NVARCHAR(450) NULL" },
    { name: 'delivery_proof_url',    ddl: "NVARCHAR(MAX) NULL" },        // signed doc image URL
    { name: 'delivery_proof_uploaded_at', ddl: "DATETIME2 NULL" },
    { name: 'delivery_proof_uploaded_by', ddl: "NVARCHAR(450) NULL" },
  ];

  for (const col of alterCols) {
    const exists = await pool.request().query(`
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('stock_issuance_requests')
        AND name = '${col.name}'
    `);
    if (exists.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE stock_issuance_requests
        ADD [${col.name}] ${col.ddl}
      `);
      } else {
      }
  }

  // 2. Update CHECK constraint on approval_status to include 'Dispatched'
  // First drop existing constraint, then recreate with new value
  const ck = await pool.request().query(`
    SELECT cc.name
    FROM sys.check_constraints cc
    INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.name = 'stock_issuance_requests' AND c.name = 'approval_status'
  `);

  if (ck.recordset.length > 0) {
    const constraintName = ck.recordset[0].name;
    await pool.request().query(`ALTER TABLE stock_issuance_requests DROP CONSTRAINT [${constraintName}]`);
    }

  await pool.request().query(`
    ALTER TABLE stock_issuance_requests
    ADD CONSTRAINT CK_sir_approval_status CHECK (
      approval_status IN (
        'Pending Supervisor Review',
        'Approved by Supervisor',
        'Forwarded to Admin',
        'Approved by Admin',
        'Partially Approved',
        'Rejected by Supervisor',
        'Rejected by Admin',
        'Issued',
        'Dispatched',
        'Delivered',
        'Completed'
      )
    )
  `);
  // 3. Create uploads directory record table (issuance_delivery_proofs)
  const tableExists = await pool.request().query(`
    SELECT 1 FROM sys.tables WHERE name = 'issuance_delivery_proofs'
  `);
  if (tableExists.recordset.length === 0) {
    await pool.request().query(`
      CREATE TABLE issuance_delivery_proofs (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id      UNIQUEIDENTIFIER NOT NULL,
        file_name       NVARCHAR(500) NOT NULL,
        file_path       NVARCHAR(MAX) NOT NULL,
        file_size       INT NULL,
        mime_type       NVARCHAR(100) NULL,
        uploaded_by     NVARCHAR(450) NULL,
        uploaded_at     DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_idp_request FOREIGN KEY (request_id)
          REFERENCES stock_issuance_requests(id)
      )
    `);
    } else {
    }

  process.exit(0);
}

main().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
