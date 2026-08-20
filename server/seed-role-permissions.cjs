const { initializePool, getPool } = require('./db/connection.cjs');

async function main() {
  try {
    await initializePool();
    const pool = getPool();
    
    console.log('🌱 Seeding role-permissions mapping...');

    // 1. Super Admin
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'IMS_SUPER_ADMIN'
        AND NOT EXISTS (
          SELECT 1 FROM ims_role_permissions rp 
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
    console.log('✅ Super Admin permissions seeded');

    // 2. IMS Admin
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'IMS_ADMIN'
        AND p.permission_key IN (
          'inventory.view_all', 'inventory.edit_all',
          'stock_request.view_all', 'stock_request.approve_admin', 'stock_request.reject',
          'stock_transfer.admin_to_wing', 'stock_transfer.wing_to_personal',
          'tender.approve', 'vendor.manage', 'acquisition.create',
          'reports.view_all', 'users.view_all', 'users.assign_roles',
          'categories.manage', 'items.manage', 'settings.view', 'settings.edit'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ IMS Admin permissions seeded');

    // 3. Wing Supervisor
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'WING_SUPERVISOR'
        AND p.permission_key IN (
          'inventory.view_wing', 'inventory.edit_wing',
          'stock_request.view_wing', 'stock_request.approve_supervisor',
          'stock_request.forward', 'stock_request.reject',
          'stock_transfer.wing_to_personal',
          'reports.view_wing'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ Wing Supervisor permissions seeded');

    // 4. Branch Supervisor
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'BRANCH_SUPERVISOR'
        AND p.permission_key IN (
          'inventory.view_wing', 'inventory.edit_wing',
          'stock_request.view_wing', 'stock_request.approve_supervisor',
          'stock_request.forward', 'stock_request.reject',
          'reports.view_wing'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ Branch Supervisor permissions seeded');

    // 5. Branch Store Keeper
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'BRANCH_STORE_KEEPER'
        AND p.permission_key IN (
          'inventory.view_wing',
          'stock_request.view_wing',
          'stock_transfer.wing_to_personal',
          'reports.view_wing'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ Branch Store Keeper permissions seeded');

    // 6. General User
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'GENERAL_USER'
        AND p.permission_key IN (
          'inventory.view_personal',
          'stock_request.create', 'stock_request.view_own',
          'reports.view_own'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ General User permissions seeded');

    // 7. Procurement Officer
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'PROCUREMENT_OFFICER'
        AND p.permission_key IN (
          'tender.create', 'tender.approve',
          'vendor.manage', 'acquisition.create',
          'inventory.view_all', 'reports.view_all'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ Procurement Officer permissions seeded');

    // 8. Auditor
    await pool.request().query(`
      INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
      SELECT r.id, p.id, 'SYSTEM_SETUP'
      FROM ims_roles r
      CROSS JOIN ims_permissions p
      WHERE r.role_name = 'AUDITOR'
        AND p.permission_key IN (
          'inventory.view_all',
          'stock_request.view_all',
          'reports.view_all',
          'users.view_all',
          'settings.view'
        )
        AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);
    console.log('✅ Auditor permissions seeded');

    console.log('🎉 Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    process.exit(0);
  }
}

main();
