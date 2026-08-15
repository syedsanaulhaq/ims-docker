const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

const ROLE_PERMISSIONS = {
  'IMS_SUPER_ADMIN': 'ALL',
  
  'IMS_ADMIN': 'ALL_EXCEPT_ROLES',
  
  'WING_SUPERVISOR': [
    'inventory.view_wing',
    'stock_request.view_wing',
    'stock_request.approve_supervisor',
    'stock_request.reject',
    'wing.supervisor',
    'reports.view_wing',
    'issuance.view'
  ],
  
  'WING_STORE_KEEPER': [
    'inventory.view_wing',
    'inventory.edit_wing',
    'inventory.manage_store_keeper',
    'stock_request.view_wing',
    'stock_transfer.admin_to_wing',
    'stock_transfer.wing_to_personal',
    'issuance.process',
    'reports.view_wing'
  ],
  
  'BRANCH_SUPERVISOR': [
    'inventory.view_branch',
    'stock_request.view_branch',
    'stock_request.approve_supervisor',
    'stock_request.reject',
    'branch.supervisor',
    'reports.view_branch',
    'issuance.view'
  ],
  
  'BRANCH_STORE_KEEPER': [
    'inventory.view_branch',
    'inventory.edit_branch',
    'inventory.manage_store_keeper',
    'stock_request.view_branch',
    'stock_transfer.wing_to_personal',
    'issuance.process',
    'reports.view_branch'
  ],
  
  'PROCUREMENT_OFFICER': [
    'procurement.manage',
    'procurement.view_all',
    'procurement.request',
    'procurement.manage_delivery',
    'procurement.receive_delivery',
    'tender.create',
    'tender.edit',
    'tender.finalize',
    'tender.delete',
    'tender.approve',
    'vendor.manage',
    'inventory.view_all'
  ],
  
  'AUDITOR': [
    'inventory.view_all',
    'procurement.view_all',
    'reports.view_all',
    'stock_request.view_all',
    'issuance.view'
  ],
  
  'GENERAL_USER': [
    'stock_request.create',
    'stock_request.view_own',
    'inventory.view_personal',
    'reports.view_own'
  ]
};

async function updateAllRoles() {
  await initializePool();
  const pool = getPool();
  
  try {
    console.log('🔄 Starting Role Permissions Sync...');

    // 1. Fetch all permissions map
    const allPermsResult = await pool.request().query('SELECT id, permission_key FROM ims_permissions');
    const allPerms = allPermsResult.recordset;
    const permsMap = {};
    allPerms.forEach(p => { permsMap[p.permission_key] = p.id; });

    // 2. Fetch all system roles
    const rolesResult = await pool.request().query('SELECT id, role_name FROM ims_roles');
    const rolesMap = {};
    rolesResult.recordset.forEach(r => { rolesMap[r.role_name] = r.id; });

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log('🗑️ Clearing existing role permissions (Resetting baseline)...');
      await transaction.request().query('DELETE FROM ims_role_permissions');

      console.log('✨ Rebuilding role permissions...');

      for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
        const roleId = rolesMap[roleName];
        if (!roleId) {
          console.warn(`⚠️ Role ${roleName} not found in database. Skipping.`);
          continue;
        }

        let permsToAssign = [];
        if (permissionKeys === 'ALL') {
          permsToAssign = allPerms.map(p => p.id);
        } else if (permissionKeys === 'ALL_EXCEPT_ROLES') {
          permsToAssign = allPerms.filter(p => p.permission_key !== 'roles.manage').map(p => p.id);
        } else {
          permsToAssign = permissionKeys.map(k => permsMap[k]).filter(id => id); // Filter out missing keys just in case
          
          // Print warning if a requested permission key doesn't exist
          const missingKeys = permissionKeys.filter(k => !permsMap[k]);
          if (missingKeys.length > 0) {
             console.warn(`⚠️ Missing permissions for ${roleName}: ${missingKeys.join(', ')}`);
          }
        }

        console.log(`Assigning ${permsToAssign.length} permissions to ${roleName}...`);

        for (const permId of permsToAssign) {
          await transaction.request()
            .input('roleId', sql.UniqueIdentifier, roleId)
            .input('permId', sql.UniqueIdentifier, permId)
            .query(`
              INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
              VALUES (@roleId, @permId, 'SYSTEM_SETUP')
            `);
        }
      }

      await transaction.commit();
      console.log('✅ Role permissions successfully updated to match the strict hierarchy!');

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    console.error('❌ Error updating roles:', error);
  } finally {
    process.exit();
  }
}

updateAllRoles();
