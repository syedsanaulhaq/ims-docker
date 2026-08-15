const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function addMissingBranchPermissions() {
  await initializePool();
  const pool = getPool();
  try {
    console.log('Adding missing branch-level permissions...');
    
    const permissionsToAdd = [
      { key: 'inventory.view_branch', module: 'Inventory', action: 'View Branch', desc: 'View branch inventory' },
      { key: 'inventory.edit_branch', module: 'Inventory', action: 'Edit Branch', desc: 'Edit branch inventory' },
      { key: 'procurement.view_branch', module: 'Procurement', action: 'View Branch', desc: 'View branch procurement' },
      { key: 'reports.view_branch', module: 'Reports', action: 'View Branch', desc: 'View branch reports' },
      { key: 'stock_request.view_branch', module: 'Stock Request', action: 'View Branch', desc: 'View branch stock requests' },
    ];

    for (const p of permissionsToAdd) {
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = '${p.key}')
        BEGIN
          INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
          VALUES ('${p.key}', '${p.module}', '${p.action}', '${p.desc}');
        END
      `);
      console.log(`Added: ${p.key}`);

      // Assign to Super Admin and Admin
      await pool.request().query(`
        INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
        SELECT r.id, p.id, 'SYSTEM_SETUP'
        FROM ims_roles r
        CROSS JOIN ims_permissions p
        WHERE r.role_name IN ('IMS_SUPER_ADMIN', 'IMS_ADMIN')
          AND p.permission_key = '${p.key}'
          AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
      `);
      
      // Assign specific ones to Branch Supervisor and Store Keeper
      if (['inventory.view_branch', 'reports.view_branch', 'stock_request.view_branch'].includes(p.key)) {
         await pool.request().query(`
          INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
          SELECT r.id, p.id, 'SYSTEM_SETUP'
          FROM ims_roles r
          CROSS JOIN ims_permissions p
          WHERE r.role_name IN ('BRANCH_SUPERVISOR', 'BRANCH_STORE_KEEPER')
            AND p.permission_key = '${p.key}'
            AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
        `);
      }
      if (['inventory.edit_branch', 'procurement.view_branch'].includes(p.key)) {
         await pool.request().query(`
          INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
          SELECT r.id, p.id, 'SYSTEM_SETUP'
          FROM ims_roles r
          CROSS JOIN ims_permissions p
          WHERE r.role_name = 'BRANCH_SUPERVISOR'
            AND p.permission_key = '${p.key}'
            AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
        `);
      }
    }

    console.log('Successfully added branch permissions.');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
addMissingBranchPermissions();
