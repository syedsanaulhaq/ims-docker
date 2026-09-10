const path = require('path');
const { sql, initializePool, getPool, closePool } = require('../server/db/connection.cjs');

const MODULE_PERMISSIONS = [
  // 1. Personal Self-Service
  { module: 'Personal', key: 'personal.dashboard.view', action: 'View Personal Dashboard', desc: 'Access personal dashboard and KPIs' },
  { module: 'Personal', key: 'personal.request.create', action: 'Create Personal Request', desc: 'Submit personal stock request' },
  { module: 'Personal', key: 'personal.request.view_own', action: 'View Own Requests', desc: 'View status and timeline of own requests' },
  { module: 'Personal', key: 'personal.inventory.view_own', action: 'View Personal Inventory', desc: 'View items held in personal custody' },
  { module: 'Personal', key: 'personal.return.create', action: 'Create Stock Return', desc: 'Submit stock return request for custody items' },
  
  // 2. Branch Management
  { module: 'Branch', key: 'branch.dashboard.view', action: 'View Branch Dashboard', desc: 'View branch inventory dashboard and stats' },
  { module: 'Branch', key: 'branch.inventory.view', action: 'View Branch Inventory', desc: 'View items allocated to branch store' },
  { module: 'Branch', key: 'branch.inventory.manage', action: 'Manage Branch Inventory', desc: 'Adjust and manage branch inventory' },
  { module: 'Branch', key: 'branch.demand.create', action: 'Create Branch Demand', desc: 'Submit branch demand requisition' },
  { module: 'Branch', key: 'branch.demand.view', action: 'View Branch Demand History', desc: 'View branch request history and status' },
  { module: 'Branch', key: 'branch.storekeeper.review', action: 'Review Branch Requests', desc: 'Storekeeper review of branch requests' },
  { module: 'Branch', key: 'branch.issuance.process', action: 'Process Branch Issuance', desc: 'Dispatch and issue stock from branch store' },
  { module: 'Branch', key: 'branch.members.view', action: 'View Branch Members', desc: 'View branch members and their custody records' },

  // 3. Wing Management
  { module: 'Wing', key: 'wing.dashboard.view', action: 'View Wing Dashboard', desc: 'View wing inventory dashboard and metrics' },
  { module: 'Wing', key: 'wing.inventory.view', action: 'View Wing Inventory', desc: 'View items allocated to wing store' },
  { module: 'Wing', key: 'wing.inventory.manage', action: 'Manage Wing Inventory', desc: 'Adjust and manage wing inventory' },
  { module: 'Wing', key: 'wing.demand.create', action: 'Create Wing Demand', desc: 'Submit wing-level procurement demand' },
  { module: 'Wing', key: 'wing.demand.view', action: 'View Wing Request History', desc: 'View audit log of all wing requests' },
  { module: 'Wing', key: 'wing.issuance.process', action: 'Process Wing Issuance', desc: 'Dispatch and issue stock from wing store' },
  { module: 'Wing', key: 'wing.members.view', action: 'View Wing Members', desc: 'View wing members and their custody records' },

  // 4. Central Inventory
  { module: 'Inventory', key: 'inventory.dashboard.view', action: 'View Inventory Dashboard', desc: 'View central warehouse KPIs and valuations' },
  { module: 'Inventory', key: 'inventory.stock.view', action: 'View Stock Quantities', desc: 'View live central stock levels across all categories' },
  { module: 'Inventory', key: 'inventory.stock.adjust', action: 'Adjust Central Stock', desc: 'Perform central stock adjustments and transfers' },
  { module: 'Inventory', key: 'inventory.opening_balance.entry', action: 'Opening Balance Entry', desc: 'Input and edit opening balances' },
  { module: 'Inventory', key: 'inventory.alerts.view', action: 'View Stock Alerts', desc: 'View low stock and minimum threshold alerts' },

  // 5. Procurement Lifecycle
  { module: 'Procurement', key: 'procurement.tenders.manage', action: 'Manage Tenders & Contracts', desc: 'Create, edit, and evaluate tenders and contracts' },
  { module: 'Procurement', key: 'procurement.annual_tenders.manage', action: 'Manage Annual Tenders', desc: 'Manage annual framework tenders' },
  { module: 'Procurement', key: 'procurement.petty_purchase.manage', action: 'Manage Petty Purchases', desc: 'Execute spot and petty market purchases' },
  { module: 'Procurement', key: 'procurement.required_items.view', action: 'View Required Items', desc: 'View consolidated demand requiring procurement' },
  { module: 'Procurement', key: 'procurement.requests.review', action: 'Review Procurement Requests', desc: 'Administrative review of procurement demands' },
  { module: 'Procurement', key: 'procurement.po.manage', action: 'Manage Purchase Orders', desc: 'Create, edit, and issue Purchase Orders (POs)' },
  { module: 'Procurement', key: 'procurement.delivery.receive', action: 'Receive Vendor Deliveries', desc: 'Inspect deliveries and credit stock into inventory' },

  // 6. Stock Issuance
  { module: 'Issuance', key: 'issuance.dashboard.view', action: 'View Issuance Dashboard', desc: 'View central issuance stats and status' },
  { module: 'Issuance', key: 'issuance.admin.process', action: 'Process Central Issuance', desc: 'Dispatch and fulfill central store requisitions' },
  { module: 'Issuance', key: 'issuance.historical.entry', action: 'Historical Entry', desc: 'Enter backdated legacy issuance records' },
  { module: 'Issuance', key: 'issuance.history.view', action: 'View Historical Issuances', desc: 'Search and view past issuance vouchers' },
  { module: 'Issuance', key: 'issuance.transactions.view', action: 'View Stock Transactions', desc: 'View full ledger of stock movements' },

  // 7. Approvals & Workflows
  { module: 'Approvals', key: 'approval.supervisor.approve', action: 'Supervisor Approval', desc: 'Initial subordinate approval queue' },
  { module: 'Approvals', key: 'approval.admin.approve', action: 'Admin Approval', desc: 'Administrative multi-tier approvals (AD, DD, DG)' },
  { module: 'Approvals', key: 'approval.forward', action: 'Forward Requests', desc: 'Forward request to another official or tier' },
  { module: 'Approvals', key: 'approval.reject', action: 'Reject Requests', desc: 'Reject requests with formal remarks' },
  { module: 'Approvals', key: 'approval.history.view', action: 'View Request History', desc: 'View pending, future, and rejected request history' },
  { module: 'Approvals', key: 'requisition.report.view', action: 'View Requisition Reports', desc: 'View and export formatted requisition slips' },

  // 8. Master Metadata
  { module: 'Metadata', key: 'metadata.items.manage', action: 'Manage Item Master', desc: 'Manage catalog of items, specs, and classifications' },
  { module: 'Metadata', key: 'metadata.categories.manage', action: 'Manage Categories', desc: 'Create and configure item categories' },
  { module: 'Metadata', key: 'metadata.subcategories.manage', action: 'Manage Sub-Categories', desc: 'Create and configure item sub-categories' },
  { module: 'Metadata', key: 'metadata.vendors.manage', action: 'Manage Vendors', desc: 'Maintain supplier database, NTN, and details' },

  // 9. System Administration
  { module: 'Administration', key: 'admin.super', action: 'Super Administrator', desc: 'Full system master override' },
  { module: 'Administration', key: 'roles.manage', action: 'Manage Roles & Permissions', desc: 'Create, edit, and assign roles and permissions' },
  { module: 'Administration', key: 'users.assign_roles', action: 'Assign User Roles', desc: 'Assign roles and office/wing/branch scopes to users' },
  { module: 'Administration', key: 'workflow.config.manage', action: 'Manage Workflow Configuration', desc: 'Configure approval stages and routing rules' },
  { module: 'Administration', key: 'settings.manage', action: 'Manage System Settings', desc: 'Configure system parameters and fiscal years' },
  { module: 'Administration', key: 'reports.view_all', action: 'View Analytics & Reports', desc: 'Generate and view all management and ledger reports' },
  
  // Legacy Aliases for Seamless Backward Compatibility
  { module: 'Personal', key: 'issuance.request', action: 'Legacy: Request Issuance', desc: 'Legacy alias for requesting stock' },
  { module: 'Personal', key: 'issuance.view', action: 'Legacy: View Issuance', desc: 'Legacy alias for viewing issuance' },
  { module: 'Personal', key: 'stock_request.create', action: 'Legacy: Create Stock Request', desc: 'Legacy alias for creating stock request' },
  { module: 'Personal', key: 'stock_request.view_own', action: 'Legacy: View Own Stock Request', desc: 'Legacy alias for viewing own request' },
  { module: 'Personal', key: 'inventory.view_personal', action: 'Legacy: View Personal Inventory', desc: 'Legacy alias for personal inventory' },
  { module: 'Personal', key: 'reports.view_own', action: 'Legacy: View Own Reports', desc: 'Legacy alias for own reports' },
  { module: 'Wing', key: 'wing.supervisor', action: 'Legacy: Wing Supervisor', desc: 'Legacy alias for wing supervisor access' },
  { module: 'Wing', key: 'inventory.manage_store_keeper', action: 'Legacy: Wing Storekeeper', desc: 'Legacy alias for wing storekeeper access' },
  { module: 'Inventory', key: 'inventory.view', action: 'Legacy: View Central Inventory', desc: 'Legacy alias for inventory view' },
  { module: 'Inventory', key: 'inventory.manage', action: 'Legacy: Manage Central Inventory', desc: 'Legacy alias for inventory manage' },
  { module: 'Procurement', key: 'procurement.view', action: 'Legacy: View Procurement', desc: 'Legacy alias for procurement view' },
  { module: 'Procurement', key: 'procurement.manage', action: 'Legacy: Manage Procurement', desc: 'Legacy alias for procurement manage' },
  { module: 'Issuance', key: 'issuance.process', action: 'Legacy: Process Issuance', desc: 'Legacy alias for processing issuance' },
  { module: 'Approvals', key: 'approval.approve', action: 'Legacy: Approve Requests', desc: 'Legacy alias for approvals' },
  { module: 'Approvals', key: 'supervisor.menu.view', action: 'Legacy: Supervisor Menu View', desc: 'Legacy alias for supervisor menu' },
  { module: 'Administration', key: 'reports.view', action: 'Legacy: View Reports', desc: 'Legacy alias for reports view' }
];

// Role mapping templates
const ROLE_PERMISSIONS_MAP = {
  'IMS_SUPER_ADMIN': MODULE_PERMISSIONS.map(p => p.key),
  
  'IMS_ADMIN': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Central Inventory
    'inventory.dashboard.view', 'inventory.stock.view', 'inventory.stock.adjust', 'inventory.opening_balance.entry', 'inventory.alerts.view',
    'inventory.view', 'inventory.manage',
    // Procurement
    'procurement.tenders.manage', 'procurement.annual_tenders.manage', 'procurement.petty_purchase.manage', 'procurement.required_items.view', 'procurement.requests.review', 'procurement.po.manage', 'procurement.delivery.receive',
    'procurement.view', 'procurement.manage',
    // Issuance
    'issuance.dashboard.view', 'issuance.admin.process', 'issuance.historical.entry', 'issuance.history.view', 'issuance.transactions.view',
    'issuance.process', 'wing.issuance.process', 'branch.issuance.process', 'branch.storekeeper.review', 'wing.inventory.view', 'branch.inventory.view',
    // Approvals
    'approval.supervisor.approve', 'approval.admin.approve', 'approval.forward', 'approval.reject', 'approval.history.view', 'requisition.report.view',
    'approval.approve', 'supervisor.menu.view',
    // Metadata
    'metadata.items.manage', 'metadata.categories.manage', 'metadata.subcategories.manage', 'metadata.vendors.manage',
    // Reports
    'reports.view_all', 'reports.view'
  ],

  'WING_SUPERVISOR': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Wing
    'wing.dashboard.view', 'wing.inventory.view', 'wing.inventory.manage', 'wing.demand.create', 'wing.demand.view', 'wing.members.view',
    'wing.supervisor',
    // Approvals
    'approval.supervisor.approve', 'approval.forward', 'approval.reject', 'approval.history.view', 'requisition.report.view',
    'approval.approve', 'supervisor.menu.view'
  ],

  'BRANCH_SUPERVISOR': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Branch
    'branch.dashboard.view', 'branch.inventory.view', 'branch.inventory.manage', 'branch.demand.create', 'branch.demand.view', 'branch.members.view',
    // Approvals
    'approval.supervisor.approve', 'approval.forward', 'approval.reject', 'approval.history.view', 'requisition.report.view',
    'approval.approve', 'supervisor.menu.view'
  ],

  'WING_STORE_KEEPER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Wing Store
    'wing.inventory.view', 'wing.inventory.manage', 'wing.issuance.process', 'wing.demand.view',
    'inventory.manage_store_keeper'
  ],

  'BRANCH_STORE_KEEPER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Branch Store
    'branch.inventory.view', 'branch.inventory.manage', 'branch.storekeeper.review', 'branch.issuance.process', 'branch.demand.view'
  ],

  'ADMIN_STOREKEEPER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Central Store Issuance & Inventory View
    'inventory.stock.view', 'inventory.alerts.view', 'issuance.dashboard.view', 'issuance.admin.process', 'issuance.historical.entry', 'issuance.history.view', 'issuance.transactions.view',
    'issuance.process', 'inventory.view'
  ],

  'STOREKEEPER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Central Store Issuance & Inventory View
    'inventory.stock.view', 'inventory.alerts.view', 'issuance.dashboard.view', 'issuance.admin.process', 'issuance.historical.entry', 'issuance.history.view', 'issuance.transactions.view',
    'issuance.process', 'inventory.view'
  ],

  'PROCUREMENT_OFFICER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own',
    // Procurement
    'procurement.tenders.manage', 'procurement.annual_tenders.manage', 'procurement.petty_purchase.manage', 'procurement.required_items.view', 'procurement.requests.review', 'procurement.po.manage', 'procurement.delivery.receive',
    'procurement.view', 'procurement.manage',
    // Metadata
    'metadata.items.manage', 'metadata.vendors.manage'
  ],

  'GENERAL_USER': [
    // Personal
    'personal.dashboard.view', 'personal.request.create', 'personal.request.view_own', 'personal.inventory.view_own', 'personal.return.create',
    'issuance.request', 'issuance.view', 'stock_request.create', 'stock_request.view_own', 'inventory.view_personal', 'reports.view_own'
  ]
};

async function seedModulePermissions() {
  console.log('🚀 Starting Module-Based Permissions & Roles Seeding...');
  await initializePool();
  const pool = getPool();

  try {
    // 1. Ensure all permissions in MODULE_PERMISSIONS exist in `ims_permissions`
    console.log(`📌 Upserting ${MODULE_PERMISSIONS.length} permissions across 9 modules...`);
    for (const perm of MODULE_PERMISSIONS) {
      await pool.request()
        .input('key', sql.NVarChar(100), perm.key)
        .input('module', sql.NVarChar(50), perm.module)
        .input('action', sql.NVarChar(100), perm.action)
        .input('desc', sql.NVarChar(500), perm.desc)
        .query(`
          IF EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = @key)
          BEGIN
            UPDATE ims_permissions
            SET module_name = @module,
                action_name = @action,
                description = @desc,
                is_active = 1
            WHERE permission_key = @key;
          END
          ELSE
          BEGIN
            INSERT INTO ims_permissions (id, permission_key, module_name, action_name, description, is_active, created_at)
            VALUES (NEWID(), @key, @module, @action, @desc, 1, GETDATE());
          END
        `);
    }
    console.log('✅ Permissions table updated successfully.');

    // 2. Ensure standard roles exist in `ims_roles`
    const ROLES_TO_ENSURE = [
      { name: 'IMS_SUPER_ADMIN', display: 'IMS Super Administrator', desc: 'Full system access and role governance' },
      { name: 'IMS_ADMIN', display: 'IMS Administrator', desc: 'Administrative management of inventory, procurement, and approvals' },
      { name: 'WING_SUPERVISOR', display: 'Wing Supervisor', desc: 'Manage wing inventory and approve wing requests' },
      { name: 'BRANCH_SUPERVISOR', display: 'Branch Supervisor', desc: 'Manage branch inventory and approve branch requests' },
      { name: 'WING_STORE_KEEPER', display: 'Wing Store Keeper', desc: 'Manage wing store and issue items to wing members' },
      { name: 'BRANCH_STORE_KEEPER', display: 'Branch Store Keeper', desc: 'Manage branch store and issue items to branch members' },
      { name: 'ADMIN_STOREKEEPER', display: 'Admin Storekeeper', desc: 'Fulfill central store requests and manage central issuance' },
      { name: 'PROCUREMENT_OFFICER', display: 'Procurement Officer', desc: 'Manage tenders, purchase orders, deliveries and vendor relations' },
      { name: 'GENERAL_USER', display: 'General User', desc: 'Submit personal requests and view personal custody items' },
    ];

    console.log('📌 Ensuring standard system roles...');
    for (const r of ROLES_TO_ENSURE) {
      await pool.request()
        .input('name', sql.NVarChar(100), r.name)
        .input('display', sql.NVarChar(200), r.display)
        .input('desc', sql.NVarChar(sql.MAX), r.desc)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = @name)
          BEGIN
            INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active, created_at)
            VALUES (NEWID(), @name, @display, @desc, 1, 1, GETDATE());
          END
        `);
    }

    // 3. Map permissions to each role
    console.log('📌 Mapping module permissions to roles...');
    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      const roleRes = await pool.request()
        .input('roleName', sql.NVarChar(100), roleName)
        .query('SELECT id FROM ims_roles WHERE role_name = @roleName');
      
      if (roleRes.recordset.length > 0) {
        const roleId = roleRes.recordset[0].id;
        
        for (const key of permKeys) {
          await pool.request()
            .input('roleId', sql.UniqueIdentifier, roleId)
            .input('key', sql.NVarChar(100), key)
            .query(`
              INSERT INTO ims_role_permissions (id, role_id, permission_id, granted_by, granted_at)
              SELECT NEWID(), @roleId, p.id, 'SYSTEM_SETUP', GETDATE()
              FROM ims_permissions p
              WHERE p.permission_key = @key
                AND NOT EXISTS (
                  SELECT 1 FROM ims_role_permissions rp 
                  WHERE rp.role_id = @roleId AND rp.permission_id = p.id
                );
            `);
        }
        console.log(`  ✓ Mapped ${permKeys.length} permissions to role: ${roleName}`);
      }
    }

    // 4. Check vw_ims_user_permissions view
    console.log('📌 Refreshing / verifying vw_ims_user_permissions view...');
    await pool.request().query(`
      IF OBJECT_ID('dbo.vw_ims_user_permissions', 'V') IS NOT NULL
        DROP VIEW dbo.vw_ims_user_permissions;
    `);

    await pool.request().query(`
      CREATE VIEW dbo.vw_ims_user_permissions AS
      SELECT DISTINCT
        ur.user_id,
        p.id as permission_id,
        p.permission_key,
        p.module_name,
        p.action_name,
        p.description,
        r.id as role_id,
        r.role_name,
        r.display_name as role_display_name,
        ur.scope_type,
        ur.scope_office_id,
        ur.scope_wing_id,
        ur.scope_branch_id
      FROM ims_user_roles ur
      INNER JOIN ims_roles r ON ur.role_id = r.id
      INNER JOIN ims_role_permissions rp ON r.id = rp.role_id
      INNER JOIN ims_permissions p ON rp.permission_id = p.id
      WHERE ur.is_active = 1 
        AND r.is_active = 1 
        AND p.is_active = 1;
    `);
    console.log('✅ vw_ims_user_permissions view updated.');

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    await closePool();
  }
}

seedModulePermissions().catch(err => {
  console.error(err);
  process.exit(1);
});
