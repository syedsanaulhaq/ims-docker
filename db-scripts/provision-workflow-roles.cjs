const { sql, getPool, initializePool } = require('../server/db/connection.cjs');

const ROLES_TO_CREATE = [
  { name: 'DG_ADMIN', display: 'DG Admin', desc: 'Director General workflow approver' },
  { name: 'DD_ADMIN', display: 'DD Admin', desc: 'Deputy Director workflow approver' },
  { name: 'AD_ADMIN_I', display: 'AD Admin-I', desc: 'Assistant Director I workflow approver' },
  { name: 'AD_ADMIN_II', display: 'AD Admin-II', desc: 'Assistant Director II workflow approver' },
  { name: 'TRANSPORT_SUPERVISOR', display: 'Transport Supervisor', desc: 'Transport workflow approver' },
  { name: 'WORKFLOW_STOREKEEPER', display: 'Storekeeper', desc: 'Storekeeper workflow approver' }
];

const DEFAULT_PERMISSIONS = [
  'stock_request.view_wing',
  'stock_request.view_branch',
  'stock_request.approve_supervisor',
  'stock_request.reject',
  'issuance.view',
  'approval.approve',
  'approval.manage'
];

async function provisionWorkflowRoles() {
  await initializePool();
  const pool = getPool();
  
  try {
    console.log('🔄 Starting Workflow Roles Provisioning...');

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const roleDef of ROLES_TO_CREATE) {
        console.log(`Checking/Creating role: ${roleDef.name}...`);
        
        // 1. Check if role exists
        const checkResult = await transaction.request()
          .input('roleName', sql.NVarChar(100), roleDef.name)
          .query('SELECT id FROM ims_roles WHERE role_name = @roleName');
          
        let roleId;
        if (checkResult.recordset.length === 0) {
          // Insert role
          const insertResult = await transaction.request()
            .input('roleName', sql.NVarChar(100), roleDef.name)
            .input('displayName', sql.NVarChar(255), roleDef.display)
            .input('description', sql.NVarChar(500), roleDef.desc)
            .query(`
              INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active, created_at)
              VALUES (NEWID(), @roleName, @displayName, @description, 1, 1, GETDATE());
              
              SELECT id FROM ims_roles WHERE role_name = @roleName;
            `);
          roleId = insertResult.recordset[0].id;
          console.log(`  -> Created role ID: ${roleId}`);
        } else {
          roleId = checkResult.recordset[0].id;
          console.log(`  -> Already exists. Role ID: ${roleId}`);
        }

        // 2. Assign default permissions
        console.log(`  -> Assigning baseline permissions...`);
        for (const permKey of DEFAULT_PERMISSIONS) {
          await transaction.request()
            .input('roleId', sql.UniqueIdentifier, roleId)
            .input('permKey', sql.NVarChar(100), permKey)
            .query(`
              INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
              SELECT @roleId, id, 'SYSTEM_SETUP'
              FROM ims_permissions p
              WHERE p.permission_key = @permKey
                AND NOT EXISTS (
                  SELECT 1 FROM ims_role_permissions rp 
                  WHERE rp.role_id = @roleId AND rp.permission_id = p.id
                )
            `);
        }
      }

      await transaction.commit();
      console.log('✅ Workflow Roles successfully synced to System Roles!');

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    console.error('❌ Error provisioning roles:', error);
  } finally {
    process.exit();
  }
}

provisionWorkflowRoles();
