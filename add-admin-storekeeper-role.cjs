const { initializePool, sql } = require('./server/db/connection.cjs');
const { v4: uuidv4 } = require('uuid');

async function main() {
  try {
    const pool = await initializePool();
    console.log('Connected to database.');

    // 1. Check/Insert ADMIN_STOREKEEPER in ims_roles
    let adminStorekeeperRoleId;
    const checkRoleRes = await pool.request()
      .query(`SELECT id FROM ims_roles WHERE role_name IN ('ADMIN_STOREKEEPER', 'ADMIN_STORE_KEEPER', 'Admin Storekeeper', 'STOREKEEPER')`);

    if (checkRoleRes.recordset.length > 0) {
      adminStorekeeperRoleId = checkRoleRes.recordset[0].id;
      console.log('Found existing Admin Storekeeper role in ims_roles:', adminStorekeeperRoleId);
    } else {
      adminStorekeeperRoleId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, adminStorekeeperRoleId)
        .input('roleName', 'ADMIN_STOREKEEPER')
        .input('displayName', 'Admin Storekeeper')
        .input('description', 'Admin Storekeeper with full admin store management and issuance privileges.')
        .query(`
          INSERT INTO ims_roles (id, role_name, display_name, description, is_active, created_at)
          VALUES (@id, @roleName, @displayName, @description, 1, GETDATE())
        `);
      console.log('Created ADMIN_STOREKEEPER role in ims_roles:', adminStorekeeperRoleId);
    }

    // Also ensure STOREKEEPER role exists
    let storekeeperRoleId;
    const checkSkRoleRes = await pool.request()
      .query(`SELECT id FROM ims_roles WHERE role_name = 'STOREKEEPER'`);

    if (checkSkRoleRes.recordset.length > 0) {
      storekeeperRoleId = checkSkRoleRes.recordset[0].id;
    } else {
      storekeeperRoleId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, storekeeperRoleId)
        .input('roleName', 'STOREKEEPER')
        .input('displayName', 'Storekeeper')
        .input('description', 'Central Storekeeper role.')
        .query(`
          INSERT INTO ims_roles (id, role_name, display_name, description, is_active, created_at)
          VALUES (@id, @roleName, @displayName, @description, 1, GETDATE())
        `);
      console.log('Created STOREKEEPER role in ims_roles:', storekeeperRoleId);
    }

    // 2. Check/Insert in AspNetRoles
    const checkAspNetRole = await pool.request()
      .query(`SELECT Id FROM AspNetRoles WHERE Name IN ('Admin Storekeeper', 'ADMIN_STOREKEEPER', 'Storekeeper')`);
    
    let aspNetRoleId;
    if (checkAspNetRole.recordset.length > 0) {
      aspNetRoleId = checkAspNetRole.recordset[0].Id;
    } else {
      aspNetRoleId = uuidv4();
      await pool.request()
        .input('id', aspNetRoleId)
        .input('name', 'Admin Storekeeper')
        .query(`INSERT INTO AspNetRoles (Id, Name) VALUES (@id, @name)`);
      console.log('Created Admin Storekeeper in AspNetRoles:', aspNetRoleId);
    }

    // 3. User info
    const userRes = await pool.request()
      .input('username', '1730115698727')
      .query('SELECT Id, UserName, FullName FROM AspNetUsers WHERE UserName = @username OR Id = @username');

    if (userRes.recordset.length === 0) {
      console.error('User 1730115698727 not found');
      process.exit(1);
    }

    const userId = userRes.recordset[0].Id;
    console.log(`Target User: ${userRes.recordset[0].FullName} (${userId})`);

    // 4. Assign ADMIN_STOREKEEPER to user in ims_user_roles
    const checkUserRole = await pool.request()
      .input('userId', userId)
      .input('roleId', adminStorekeeperRoleId)
      .query('SELECT id FROM ims_user_roles WHERE user_id = @userId AND role_id = @roleId');

    if (checkUserRole.recordset.length === 0) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('userId', userId)
        .input('roleId', adminStorekeeperRoleId)
        .query(`
          INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
          VALUES (@id, @userId, @roleId, 'Global', 1, GETDATE())
        `);
      console.log('✅ Granted ADMIN_STOREKEEPER role to user in ims_user_roles.');
    } else {
      console.log('User already has ADMIN_STOREKEEPER role in ims_user_roles.');
    }

    // Assign STOREKEEPER to user in ims_user_roles as well
    const checkUserSkRole = await pool.request()
      .input('userId', userId)
      .input('roleId', storekeeperRoleId)
      .query('SELECT id FROM ims_user_roles WHERE user_id = @userId AND role_id = @roleId');

    if (checkUserSkRole.recordset.length === 0) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('userId', userId)
        .input('roleId', storekeeperRoleId)
        .query(`
          INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
          VALUES (@id, @userId, @roleId, 'Global', 1, GETDATE())
        `);
      console.log('✅ Granted STOREKEEPER role to user in ims_user_roles.');
    }

    // 5. Assign to user in AspNetUserRoles
    if (aspNetRoleId) {
      const checkUserAspNet = await pool.request()
        .input('userId', userId)
        .input('roleId', aspNetRoleId)
        .query('SELECT UserId FROM AspNetUserRoles WHERE UserId = @userId AND RoleId = @roleId');

      if (checkUserAspNet.recordset.length === 0) {
        await pool.request()
          .input('userId', userId)
          .input('roleId', aspNetRoleId)
          .query('INSERT INTO AspNetUserRoles (UserId, RoleId) VALUES (@userId, @roleId)');
        console.log('✅ Granted Admin Storekeeper role to user in AspNetUserRoles.');
      }
    }

    console.log('\n🎉 ALL ADMIN STOREKEEPER ROLES SUCCESSFULLY CREATED & ASSIGNED!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
