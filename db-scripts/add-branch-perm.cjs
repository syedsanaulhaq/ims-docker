const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function addBranchPermission() {
  await initializePool();
  const pool = getPool();
  try {
    console.log('Adding branch.supervisor permission...');
    
    // 1. Insert into ims_permissions if not exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'branch.supervisor')
      BEGIN
        INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
        VALUES ('branch.supervisor', 'Branch Management', 'Supervisor Access', 'Branch supervisor access to branch dashboard and management');
      END
    `);
    
    // 2. Assign to BRANCH_SUPERVISOR
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'BRANCH_SUPERVISOR'
        AND p.permission_key = 'branch.supervisor'
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
    `);
    
    // 3. Assign to IMS_SUPER_ADMIN
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'IMS_SUPER_ADMIN'
        AND p.permission_key = 'branch.supervisor'
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
    `);
    
    // 4. Assign to IMS_ADMIN
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'IMS_ADMIN'
        AND p.permission_key = 'branch.supervisor'
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
    `);

    console.log('Successfully added branch.supervisor permission and assigned to roles.');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
addBranchPermission();
