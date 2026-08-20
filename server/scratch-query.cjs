const { initializePool, getPool } = require('./db/connection.cjs');

async function main() {
  try {
    await initializePool();
    const pool = getPool();

    const userEmail = 'dpmpmu@ecp.gov.pk';
    console.log(`=== DIAGNOSING USER: ${userEmail} ===`);
    
    const userResult = await pool.request()
      .input('email', userEmail)
      .query('SELECT Id, UserName, FullName, Email, Role FROM AspNetUsers WHERE Email = @email');
    const user = userResult.recordset[0];
    console.log('User record:', JSON.stringify(user, null, 2));

    if (user) {
      const userId = user.Id;
      
      // Roles in IMS
      console.log('\n--- IMS User Roles (ims_user_roles) ---');
      const rolesResult = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT ur.role_id, r.role_name, ur.is_active
          FROM ims_user_roles ur
          INNER JOIN ims_roles r ON ur.role_id = r.id
          WHERE ur.user_id = @userId
        `);
      console.log(JSON.stringify(rolesResult.recordset, null, 2));
      
      // Permissions for user
      console.log('\n--- Permissions for User\'s Roles ---');
      const permissionsResult = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT DISTINCT rp.permission_key
          FROM ims_user_roles ur
          INNER JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
          WHERE ur.user_id = @userId AND ur.is_active = 1
        `);
      console.log('Permissions list:', permissionsResult.recordset.map(p => p.permission_key));
      
      // Verify if 'stock_request.create' exists in ims_permissions
      console.log('\n--- Checking if stock_request.create exists ---');
      const permCheck = await pool.request().query(
        "SELECT * FROM ims_permissions WHERE permission_key = 'stock_request.create'"
      );
      console.log(JSON.stringify(permCheck.recordset, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
