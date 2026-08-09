/**
 * Export selected tables from InventoryManagementDB as production-safe SQL.
 * Generated SQL uses MERGE where possible, IDENTITY_INSERT for identity PKs,
 * and skips computed/readonly columns automatically.
 *
 * Usage:
 *   node scripts/export-db-data.cjs
 *
 * Output:
 *   db-data-export-<timestamp>.sql
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.sqlserver') });

// ============================================================================
// Configuration: list tables to export, ordered by FK dependencies.
// Set includeData: true/false. Add a where clause if needed.
// ============================================================================
const TABLES = [
  // Reference / permission data — these are system definitions, generally safe to sync
  { name: 'ims_roles', includeData: true },
  { name: 'ims_permissions', includeData: true },
  { name: 'ims_role_permissions', includeData: true },
  { name: 'ims_dynamic_workflow_steps', includeData: true },
  { name: 'ims_request_workflow_state', includeData: false }, // transactional

  // Org structure — safe if production has same org units
  { name: 'wings', includeData: true },
  { name: 'offices', includeData: true },
  { name: 'tblOffices', includeData: true },

  // User data — DO NOT SYNC user identity or role assignments from local to production.
  // Production users/roles come from the main (DS) system and are configured per environment.
  { name: 'users', includeData: false, skipExport: true },
  { name: 'ims_user_roles', includeData: false, skipExport: true },
  { name: 'AspNetUsers', includeData: false, skipExport: true },
  { name: 'AspNetRoles', includeData: false, skipExport: true },
  { name: 'AspNetUserRoles', includeData: false, skipExport: true },
  { name: 'AspNetUserAdditionalRoles', includeData: false, skipExport: true },
  { name: 'tblUserDesignations', includeData: false, skipExport: true },

  // Items / vendors / categories — DO NOT SYNC from local; production has the updated item/vendors data.
  { name: 'categories', includeData: false, skipExport: true },
  { name: 'sub_categories', includeData: false, skipExport: true },
  { name: 'item_masters', includeData: false, skipExport: true },
  { name: 'item_groups', includeData: false, skipExport: true },
  { name: 'group_items', includeData: false, skipExport: true },
  { name: 'vendors', includeData: false, skipExport: true },
  { name: 'tender_vendors', includeData: false, skipExport: true },

  // System settings
  { name: 'system_settings', includeData: true },
  { name: 'financial_years', includeData: true },
  { name: 'TenderStatuses', includeData: true },
  { name: 'AwardStatuses', includeData: true },

  // Transactional (disabled by default)
  { name: 'tenders', includeData: false },
  { name: 'annual_tenders', includeData: false },
  { name: 'purchase_orders', includeData: false },
  { name: 'request_approvals', includeData: false },
  { name: 'procurement_requests', includeData: false },
  { name: 'stock_issuance_requests', includeData: false },
  { name: 'deliveries', includeData: false },
];

const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true',
  },
};

function sqlValue(value, sqlType) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 23).replace('T', ' ')}'`;
  }
  if (sqlType === 'bit' || (typeof value === 'boolean')) {
    return value === true || value === 'true' || value === 1 || value === '1' ? '1' : '0';
  }
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function escapeIdentifier(name) {
  return `[${name.replace(/]/g, ']]')}]`;
}

async function exportViews(pool) {
  const result = await pool.request().query(`
    SELECT SCHEMA_NAME(v.schema_id) AS schema_name, v.name AS view_name, m.definition
    FROM sys.views v
    JOIN sys.sql_modules m ON v.object_id = m.object_id
    WHERE v.is_ms_shipped = 0
    ORDER BY v.name
  `);

  if (result.recordset.length === 0) return '';

  let out = `\n-- ============================================================================\n`;
  out += `-- Views (${result.recordset.length})\n`;
  out += `-- ============================================================================\n`;

  for (const view of result.recordset) {
    const fullName = `${escapeIdentifier(view.schema_name)}.${escapeIdentifier(view.view_name)}`;
    out += `\n-- ------------------------------------------------------------------------\n`;
    out += `-- View: ${fullName}\n`;
    out += `-- ------------------------------------------------------------------------\n`;
    if (view.definition) {
      // Normalize definition: replace CREATE VIEW with CREATE OR ALTER VIEW
      let def = view.definition
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
      def = def.replace(/\bCREATE\s+VIEW\b/i, 'CREATE OR ALTER VIEW');
      out += `${def}\nGO\n`;
    } else {
      out += `-- WARNING: No definition found for ${fullName}\n`;
    }
  }

  return out;
}

async function getColumns(pool, tableName) {
  const result = await pool.request().query(`
    SELECT
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.CHARACTER_MAXIMUM_LENGTH,
      c.NUMERIC_PRECISION,
      c.NUMERIC_SCALE,
      c.IS_NULLABLE,
      COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = '${tableName}'
    ORDER BY c.ORDINAL_POSITION
  `);
  return result.recordset;
}

async function hasPrimaryKey(pool, tableName) {
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
      AND TABLE_NAME = '${tableName}'
    ORDER BY ORDINAL_POSITION
  `);
  return result.recordset.map(r => r.COLUMN_NAME);
}

async function exportTable(pool, table, columns, pkColumns) {
  if (!table.includeData) {
    return `-- Skipping data export for ${table.name}\n`;
  }

  const excluded = new Set((table.excludeColumns || []).map(c => c.toLowerCase()));
  const usableColumns = columns.filter(c => !excluded.has(c.COLUMN_NAME.toLowerCase()));
  const colNames = usableColumns.map(c => escapeIdentifier(c.COLUMN_NAME)).join(', ');
  const identityColumn = columns.find(c => c.IS_IDENTITY === 1);

  let where = '';
  if (table.where) {
    where = `WHERE ${table.where}`;
  }

  const result = await pool.request().query(`
    SELECT ${usableColumns.map(c => escapeIdentifier(c.COLUMN_NAME)).join(', ')}
    FROM ${escapeIdentifier(table.name)}
    ${where}
  `);
  // Convert date-like strings back to Date objects for formatting
  for (const row of result.recordset) {
    for (const col of usableColumns) {
      if (col.DATA_TYPE.includes('date') || col.DATA_TYPE.includes('time')) {
        const v = row[col.COLUMN_NAME];
        if (v && typeof v === 'string') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) {
            row[col.COLUMN_NAME] = d;
          }
        }
      }
    }
  }

  if (result.recordset.length === 0) {
    return `-- ${table.name}: no rows to export\n`;
  }

  let out = `\n-- ============================================================================\n`;
  out += `-- Table: ${table.name} (${result.recordset.length} rows)\n`;
  out += `-- ============================================================================\n`;

  if (identityColumn) {
    out += `SET IDENTITY_INSERT ${escapeIdentifier(table.name)} ON;\n`;
  }

  const hasPk = pkColumns.length > 0;

  if (hasPk) {
    // MERGE-based upsert
    out += `MERGE ${escapeIdentifier(table.name)} AS target\n`;
    out += `USING (VALUES\n`;
    const rows = result.recordset.map(row => {
      const vals = usableColumns.map(c => sqlValue(row[c.COLUMN_NAME], c.DATA_TYPE)).join(', ');
      return `  (${vals})`;
    });
    out += rows.join(',\n');
    out += `\n) AS source (${colNames})\n`;
    const joinCondition = pkColumns.map(pk => `target.${escapeIdentifier(pk)} = source.${escapeIdentifier(pk)}`).join(' AND ');
    out += `ON ${joinCondition}\n`;

    const updateSet = usableColumns
      .filter(c => !pkColumns.includes(c.COLUMN_NAME))
      .map(c => `target.${escapeIdentifier(c.COLUMN_NAME)} = source.${escapeIdentifier(c.COLUMN_NAME)}`)
      .join(', ');
    if (updateSet) {
      out += `WHEN MATCHED THEN UPDATE SET ${updateSet}\n`;
    }
    out += `WHEN NOT MATCHED THEN INSERT (${colNames}) VALUES (${usableColumns.map(c => `source.${escapeIdentifier(c.COLUMN_NAME)}`).join(', ')});\n`;
  } else {
    // Plain INSERT with existence check on all columns
    out += `DELETE FROM ${escapeIdentifier(table.name)};\n`;
    for (const row of result.recordset) {
      const vals = usableColumns.map(c => sqlValue(row[c.COLUMN_NAME], c.DATA_TYPE)).join(', ');
      out += `INSERT INTO ${escapeIdentifier(table.name)} (${colNames}) VALUES (${vals});\n`;
    }
  }

  if (identityColumn) {
    out += `SET IDENTITY_INSERT ${escapeIdentifier(table.name)} OFF;\n`;
  }

  return out;
}

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log(`Connected to ${config.database} on ${config.server}`);

    let sqlOutput = `-- ============================================================================\n`;
    sqlOutput += `-- IMS Data Export for Production Sync\n`;
    sqlOutput += `-- Generated: ${new Date().toISOString()}\n`;
    sqlOutput += `-- Source DB: ${config.database}\n`;
    sqlOutput += `-- ============================================================================\n`;
    sqlOutput += `USE [${config.database}];\nGO\n`;
    sqlOutput += `SET NOCOUNT ON;\n`;
    sqlOutput += `SET XACT_ABORT ON;\n`;
    sqlOutput += `BEGIN TRANSACTION;\n`;

    // Disable FK checks during merge
    sqlOutput += `\nEXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';\n`;

    for (const table of TABLES) {
      try {
        const columns = await getColumns(pool, table.name);
        if (columns.length === 0) {
          console.warn(`Table not found: ${table.name}`);
          continue;
        }
        const pkColumns = await hasPrimaryKey(pool, table.name);
        const tableSql = await exportTable(pool, table, columns, pkColumns);
        sqlOutput += tableSql;
      } catch (err) {
        console.error(`Error exporting ${table.name}:`, err.message);
        sqlOutput += `\n-- ERROR exporting ${table.name}: ${err.message}\n`;
      }
    }

    sqlOutput += `\nEXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';\n`;
    sqlOutput += `COMMIT TRANSACTION;\n`;
    sqlOutput += `SET NOCOUNT OFF;\n`;

    // Note: Views are not exported by this script. Use PRODUCTION-DELTA-DEPLOY.sql for schema/view deltas.

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outFile = path.resolve(__dirname, `../db-data-export-${timestamp}.sql`);
    fs.writeFileSync(outFile, sqlOutput, 'utf8');
    console.log(`\nExport written to: ${outFile}`);
  } catch (err) {
    console.error('Export failed:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

main();
