const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function fixDuplicateRole() {
  await initializePool();
  const pool = getPool();
  
  try {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Get the newly created AD_ADMIN_I ID
      const newRoleRes = await transaction.request()
        .query("SELECT id FROM ims_roles WHERE role_name = 'AD_ADMIN_I'");
        
      if (newRoleRes.recordset.length > 0) {
        const newRoleId = newRoleRes.recordset[0].id;
        
        // 2. Get the old AD Admin-I ID
        const oldRoleRes = await transaction.request()
          .query("SELECT id FROM ims_roles WHERE role_name = 'AD Admin-I'");
          
        if (oldRoleRes.recordset.length > 0) {
          const oldRoleId = oldRoleRes.recordset[0].id;
          
          console.log(`Merging permissions to old role (${oldRoleId}) and deleting new role (${newRoleId})`);
          
          // 3. Delete permissions for the new role
          await transaction.request()
            .input('newRoleId', sql.UniqueIdentifier, newRoleId)
            .query("DELETE FROM ims_role_permissions WHERE role_id = @newRoleId");
            
          // 4. Assign the baseline permissions to the OLD role
          const DEFAULT_PERMISSIONS = [
            'stock_request.view_wing',
            'stock_request.view_branch',
            'stock_request.approve_supervisor',
            'stock_request.reject',
            'issuance.view',
            'approval.approve',
            'approval.manage'
          ];
          
          for (const permKey of DEFAULT_PERMISSIONS) {
            await transaction.request()
              .input('oldRoleId', sql.UniqueIdentifier, oldRoleId)
              .input('permKey', sql.NVarChar(100), permKey)
              .query(`
                INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
                SELECT @oldRoleId, id, 'SYSTEM_SETUP'
                FROM ims_permissions p
                WHERE p.permission_key = @permKey
                  AND NOT EXISTS (
                    SELECT 1 FROM ims_role_permissions rp 
                    WHERE rp.role_id = @oldRoleId AND rp.permission_id = p.id
                  )
              `);
          }
          
          // 5. Reassign any users who were assigned the new role to the old role
          await transaction.request()
            .input('newRoleId', sql.UniqueIdentifier, newRoleId)
            .input('oldRoleId', sql.UniqueIdentifier, oldRoleId)
            .query(`
              UPDATE ims_user_roles 
              SET role_id = @oldRoleId 
              WHERE role_id = @newRoleId
                AND NOT EXISTS (
                  SELECT 1 FROM ims_user_roles ur2 WHERE ur2.user_id = ims_user_roles.user_id AND ur2.role_id = @oldRoleId
                )
            `);
            
          await transaction.request()
            .input('newRoleId', sql.UniqueIdentifier, newRoleId)
            .query("DELETE FROM ims_user_roles WHERE role_id = @newRoleId");
            
          // 6. Delete the new role
          await transaction.request()
            .input('newRoleId', sql.UniqueIdentifier, newRoleId)
            .query("DELETE FROM ims_roles WHERE id = @newRoleId");
            
          console.log('Successfully removed duplicate AD_ADMIN_I and updated AD Admin-I!');
        }
      }
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error fixing duplicate:', error);
  } finally {
    process.exit();
  }
}

fixDuplicateRole();
