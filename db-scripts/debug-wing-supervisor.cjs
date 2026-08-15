const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function debugWingSupervisor() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    const userId = (await pool.request().query(`SELECT Id FROM AspNetUsers WHERE UserName = '3730207514595'`)).recordset[0].Id;
    // 1. Check roles
    const rolesResult = await pool.request()
      .query(`
        SELECT 
          r.role_name,
          ur.scope_type,
          ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = '${userId}'
        ORDER BY r.role_name
      `);
    
    rolesResult.recordset.forEach(row => {
      });

    // 2. Check permissions
    const permResult = await pool.request()
      .query(`
        SELECT DISTINCT p.permission_key
        FROM ims_user_roles ur
        JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
        JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = '${userId}'
        ORDER BY p.permission_key
      `);
    
    const permissions = permResult.recordset.map(p => p.permission_key);
    permissions.forEach(p => );
    
    const hasInventoryManage = permissions.includes('inventory.manage');
    // 3. Check wing assignments
    const wingResult = await pool.request()
      .query(`
        SELECT DISTINCT ur.scope_wing_id, w.Name
        FROM ims_user_roles ur
        LEFT JOIN WingsInformation w ON ur.scope_wing_id = w.Id
        WHERE ur.user_id = '${userId}' AND ur.scope_wing_id IS NOT NULL
      `);
    
    const wingIds = wingResult.recordset.map(w => w.scope_wing_id);
    wingResult.recordset.forEach(w => {
      });

    // 4. Check pending verifications in those wings
    const verResult = await pool.request()
      .query(`
        SELECT id, item_nomenclature, wing_id, wing_name, verification_status
        FROM inventory_verification_requests
        WHERE verification_status = 'pending'
        ORDER BY created_at DESC
      `);
    
    verResult.recordset.forEach(v => {
      const isVisible = wingIds.includes(v.wing_id);
      });

    // 5. Simulate API query
    if (wingIds.length > 0) {
      const placeholders = wingIds.map((_, i) => `@wingId${i}`).join(',');
      let query = `SELECT id, item_nomenclature, wing_id FROM View_Pending_Inventory_Verifications WHERE wing_id IN (${placeholders})`;
      let request = pool.request();
      wingIds.forEach((wingId, i) => {
        request.input(`wingId${i}`, sql.Int, wingId);
      });
      
      const apiResult = await request.query(query);
      apiResult.recordset.forEach(v => {
        });
    }

    // 6. Summary
    if (!hasInventoryManage) {
      } else if (wingIds.length === 0) {
      } else if (verResult.recordset.length === 0) {
      } else {
      const visibleCount = verResult.recordset.filter(v => wingIds.includes(v.wing_id)).length;
      if (visibleCount > 0) {
        } else {
        }
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugWingSupervisor();
