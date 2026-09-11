import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  Boxes,
  ArrowRightLeft,
  Building2,
  BarChart3,
  ChevronRight,
  Database,
  FileText,
  PieChart,
  TrendingUp,
  ClipboardList,
  FolderOpen,
  Gavel,
  Eye,
  Plus,
  PackageOpen,
  Warehouse,
  Send,
  Undo2,
  CheckCircle,
  Users,
  Settings,
  ArrowRight,
  Shield,
  LogOut,
  User,
  AlertTriangle,
  ShoppingCart,
  History,
  XCircle,
  Clock,
  Barcode,
  QrCode
} from "lucide-react";
import { usePermission } from '@/hooks/usePermission';
import { useSession } from '@/contexts/SessionContext';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTheme } from 'next-themes';

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  permission?: string;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
}

interface AppSidebarProps {
  limitedMenu?: boolean;
}

const AppSidebar = ({ limitedMenu = false }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, open } = useSidebar();
  const { user } = useSession();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const isCollapsed = state === 'collapsed';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Permission hooks
  const { hasPermission: canManageRoles } = usePermission('roles.manage');
  const { hasPermission: canAssignRoles } = usePermission('users.assign_roles');
  const { hasPermission: canViewInventory } = usePermission('inventory.view');
  const { hasPermission: canManageInventory } = usePermission('inventory.manage');
  const { hasPermission: canViewProcurement } = usePermission('procurement.view');
  const { hasPermission: canManageProcurement } = usePermission('procurement.manage');
  const { hasPermission: canRequestProcurement } = usePermission('procurement.request');
  const { hasPermission: canRequestIssuance } = usePermission('issuance.request');
  const { hasPermission: canProcessIssuance } = usePermission('issuance.process');
  const { hasPermission: canApprove } = usePermission('approval.approve');
  const { hasPermission: canViewReports } = usePermission('reports.view');
  const { hasPermission: isWingSupervisor } = usePermission('wing.supervisor');
  const { hasPermission: isWingStoreKeeper } = usePermission('inventory.manage_store_keeper');
  const { hasPermission: canViewSupervisorMenu } = usePermission('supervisor.menu.view');
  const { hasPermission: isSuperAdmin } = usePermission('admin.super');
  const permissionKeys = new Set((user?.ims_permissions || []).map(p => String(p.permission_key || '').toLowerCase()));
  const hasCentralInventoryViewPermission = permissionKeys.has('inventory.view');
  const hasCentralInventoryManagePermission = permissionKeys.has('inventory.manage');
  const canAccessCentralInventoryMenu = isSuperAdmin || hasCentralInventoryViewPermission || hasCentralInventoryManagePermission;

  const roleNames = (user?.ims_roles || []).map(r => String(r.role_name || '').toUpperCase());
  const hasBranchSupervisorRole = roleNames.some(role =>
    role === 'BRANCH_SUPERVISOR' ||
    role === 'BRANCH SUPERVISOR' ||
    role === 'CUSTOM_BRANCH_SUPERVISOR'
  );
  const hasBranchStorekeeperRole = roleNames.some(role =>
    role === 'BRANCH_STORE_KEEPER' ||
    role === 'BRANCH STOREKEEPER' ||
    role === 'BRANCH STORE KEEPER' ||
    role === 'CUSTOM_BRANCH_STORE_KEEPER'
  );
  const hasWingSupervisorRole = roleNames.some(role =>
    role === 'WING_SUPERVISOR' ||
    role === 'WING SUPERVISOR'
  );
  const hasWingStorekeeperRole = roleNames.some(role =>
    role === 'WING_STORE_KEEPER' ||
    role === 'WING STOREKEEPER' ||
    role === 'WING STORE KEEPER' ||
    role === 'CUSTOM_WING_STORE_KEEPER'
  );
  const hasAdminStorekeeperRole = roleNames.some(role =>
    role === 'STOREKEEPER' ||
    role === 'STORE KEEPER' ||
    role === 'WORKFLOW_STOREKEEPER' ||
    role === 'ADMIN_STOREKEEPER' ||
    role === 'ADMIN STOREKEEPER' ||
    role === 'ADMIN_STORE_KEEPER'
  );
  const hasScopedOperationalRole =
    hasBranchSupervisorRole ||
    hasBranchStorekeeperRole ||
    hasWingSupervisorRole ||
    hasWingStorekeeperRole ||
    hasAdminStorekeeperRole;
  const canAccessBranchMenu = isSuperAdmin || hasBranchSupervisorRole || hasBranchStorekeeperRole;
  const hasBranchAssignment = !!((user as any)?.branch_id || (user as any)?.intBranchID || 0);
  const hasApproverRole = roleNames.some(role =>
    role === 'AD ADMIN-I' ||
    role === 'AD ADMIN-II' ||
    role === 'DD ADMIN' ||
    role === 'BRANCH SUPERVISOR' ||
    role === 'BRANCH_SUPERVISOR' ||
    role === 'WING SUPERVISOR' ||
    role === 'WING_SUPERVISOR' ||
    role === 'STOREKEEPER' ||
    role === 'WING_STORE_KEEPER' ||
    role === 'BRANCH_STORE_KEEPER' ||
    role === 'CUSTOM_WING_STORE_KEEPER' ||
    role === 'CUSTOM_BRANCH_STORE_KEEPER' ||
    role === 'ADMINISTRATOR' ||
    role === 'IMS_ADMIN'
  );

  const hasAdminApprovalRole = roleNames.some(role =>
    role === 'DG ADMIN' ||
    role === 'AD ADMIN-I' ||
    role === 'AD ADMIN-II' ||
    role === 'DD ADMIN' ||
    role === 'STOREKEEPER' ||
    role === 'WING_STORE_KEEPER' ||
    role === 'BRANCH_STORE_KEEPER' ||
    role === 'CUSTOM_WING_STORE_KEEPER' ||
    role === 'CUSTOM_BRANCH_STORE_KEEPER' ||
    role === 'IMS_ADMIN' ||
    role === 'ADMINISTRATOR'
  );

  const hasSupervisorRole = roleNames.some(role =>
    role === 'BRANCH SUPERVISOR' ||
    role === 'BRANCH_SUPERVISOR' ||
    role === 'WING SUPERVISOR' ||
    role === 'WING_SUPERVISOR' ||
    role === 'STOREKEEPER' ||
    role === 'WING_STORE_KEEPER' ||
    role === 'BRANCH_STORE_KEEPER' ||
    role === 'CUSTOM_WING_STORE_KEEPER' ||
    role === 'CUSTOM_BRANCH_STORE_KEEPER'
  );

  const hasAdminRole = roleNames.some(role =>
    role === 'DG ADMIN' ||
    role === 'DG_ADMIN' ||
    role === 'AD ADMIN-I' ||
    role === 'AD_ADMIN_I' ||
    role === 'AD ADMIN-II' ||
    role === 'AD_ADMIN_II' ||
    role === 'DD ADMIN' ||
    role === 'DD_ADMIN' ||
    role === 'STOREKEEPER' ||
    role === 'IMS_ADMIN' ||
    role === 'ADMINISTRATOR'
  );
  
  // Check if user has any store keeper role (including custom roles)
  const hasStoreKeeperRole = user?.ims_roles?.some(role => {
    const rName = String(role.role_name || '').toUpperCase();
    return rName.includes('STOREKEEPER') || rName.includes('STORE_KEEPER') || rName.includes('STORE KEEPER');
  }) || false;
  
  // Store keeper can view the menu if they have the permission OR the role
  const canAccessStoreKeeperMenu = isWingStoreKeeper || hasStoreKeeperRole;
  
  // Debug: Log user permissions
  useEffect(() => {
    console.log('👤 AppSidebar - User data received:', {
      user_id: user?.user_id,
      user_name: user?.user_name,
      ims_permissions: user?.ims_permissions?.length || 0,
      ims_roles: user?.ims_roles?.length || 0,
      is_super_admin: user?.is_super_admin,
      permissionKeys: user?.ims_permissions?.map(p => p.permission_key) || [],
      roleNames: user?.ims_roles?.map(r => r.role_name) || [],
      wing_id: user?.wing_id,
    });
    
    console.log('🔐 Permission Checks in AppSidebar:', {
      canRequestIssuance: !!user?.ims_permissions?.some(p => p.permission_key === 'issuance.request'),
      canApprove: !!user?.ims_permissions?.some(p => p.permission_key === 'approval.approve'),
      isWingSupervisor: !!user?.ims_permissions?.some(p => p.permission_key === 'wing.supervisor'),
      hasBranchSupervisorRole,
      hasBranchStorekeeperRole,
      hasWingStorekeeperRole,
      hasAdminStorekeeperRole,
      hasStoreKeeperRole: hasStoreKeeperRole,
      isSuperAdmin: user?.is_super_admin
    });
  }, [user, hasStoreKeeperRole, hasBranchSupervisorRole, hasBranchStorekeeperRole, hasWingStorekeeperRole, hasAdminStorekeeperRole]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  // PERSONAL MENU - For all individual users
  const personalMenuGroup: MenuGroup = {
    label: "Personal",
    icon: User,
    items: [
      { title: "Dashboard", icon: Home, path: "/personal-dashboard", permission: 'personal.dashboard.view' },
      { title: "Request Form", icon: ShoppingCart, path: "/dashboard/stock-issuance-personal", permission: 'personal.request.create' },
      ...(hasBranchAssignment ? [
        { title: "Branch Demand", icon: Building2, path: "/dashboard/stock-issuance-branch?mode=demand", permission: 'branch.demand.create' },
        { title: "My Branch Demand", icon: ClipboardList, path: "/dashboard/my-branch-demand", permission: 'branch.demand.view' },
      ] : []),
      { title: "My Request", icon: ClipboardList, path: "/dashboard/my-requests", permission: 'personal.request.view_own' },
      { title: "Stock Return", icon: Undo2, path: "/dashboard/stock-return", permission: 'personal.return.create' },
      { title: "My Inventory", icon: Package, path: "/dashboard/personal-inventory", permission: 'personal.inventory.view_own' },
    ]
  };

  const subordinateMenuGroup: MenuGroup = {
    label: "Supervisor",
    icon: Users,
    items: [
      { title: "Supervisor Dashboard", icon: CheckCircle, path: "/dashboard/supervisor-approval-dashboard", permission: 'approval.supervisor.approve' },
      { title: "Requisition Report", icon: FileText, path: "/dashboard/requisition-report", permission: 'requisition.report.view' },
    ]
  };

  // WING MENU - For wing supervisors and members
  const wingMenuGroup: MenuGroup = {
    label: "Wing Menu",
    icon: Building2,
    items: [
      { title: "Wing Dashboard", icon: BarChart3, path: "/dashboard/wing-dashboard", permission: 'wing.dashboard.view' },
      { title: "Wing Request History", icon: History, path: "/dashboard/wing-request-history", permission: 'wing.demand.view' },
      { title: "Request Items", icon: ShoppingCart, path: "/procurement/new-request", permission: 'wing.demand.create' },
      { title: "Wing Inventory", icon: Warehouse, path: "/dashboard/wing-inventory", permission: 'wing.inventory.view' },
      { title: "Wing Members", icon: Users, path: "/dashboard/wing-members", permission: 'wing.members.view' },
    ]
  };

  // BRANCH MENU - For branch supervisors and branch staff
  const branchMenuGroup: MenuGroup = {
    label: "Branch Menu",
    icon: Building2,
    items: [
      { title: "Branch Dashboard", icon: BarChart3, path: "/dashboard/branch-dashboard", permission: 'branch.dashboard.view' },
      { title: "Branch Request History", icon: History, path: "/dashboard/branch-request-history", permission: 'branch.demand.view' },
      { title: "Request Items", icon: ShoppingCart, path: "/dashboard/stock-issuance-branch", permission: 'branch.demand.create' },
      { title: "Branch Inventory", icon: Warehouse, path: "/dashboard/branch-inventory", permission: 'branch.inventory.view' },
      { title: "Branch Members", icon: Users, path: "/dashboard/branch-members", permission: 'branch.members.view' },
    ]
  };

  // ADMIN STOREKEEPER MENU - For central admin store keepers
  const adminStorekeeperMenuGroup: MenuGroup = {
    label: "Admin Storekeeper",
    icon: Warehouse,
    items: [
      { title: "Direct Issuance (Express)", icon: FileText, path: "/dashboard/direct-issuance-register", permission: undefined },
      { title: "Stock Issuance", icon: Send, path: "/dashboard/stock-issuance-processing?storeType=admin", permission: 'issuance.admin.process' },
    ]
  };

  // BRANCH STOREKEEPER MENU - For branch store keepers
  const branchStorekeeperMenuGroup: MenuGroup = {
    label: "Branch Storekeeper",
    icon: Warehouse,
    items: [
      { title: "Branch Request Review", icon: ClipboardList, path: "/dashboard/branch-storekeeper-review", permission: 'branch.storekeeper.review' },
      { title: "Stock Issuance", icon: Send, path: "/dashboard/stock-issuance-processing?storeType=branch", permission: 'branch.issuance.process' },
    ]
  };

  // WING STOREKEEPER MENU - For wing store keepers
  const wingStorekeeperMenuGroup: MenuGroup = {
    label: "Wing Storekeeper",
    icon: Warehouse,
    items: [
      { title: "Stock Issuance", icon: Send, path: "/dashboard/stock-issuance-processing?storeType=wing", permission: 'wing.issuance.process' },
    ]
  };

  // METADATA MENU - For managing master data
  const metadataMenuGroup: MenuGroup = {
    label: "Meta Data Menu",
    icon: Database,
    items: [
      { title: "Item Master", icon: Package, path: "/dashboard/item-master", permission: 'metadata.items.manage' },
      { title: "Categories", icon: Boxes, path: "/dashboard/categories", permission: 'metadata.categories.manage' },
      { title: "Sub-Categories", icon: Boxes, path: "/dashboard/sub-categories", permission: 'metadata.subcategories.manage' },
      { title: "Vendor Management", icon: Building2, path: "/dashboard/vendors", permission: 'metadata.vendors.manage' },
    ]
  };

  // INVENTORY MENU - For inventory managers
  const inventoryMenuGroup: MenuGroup = {
    label: "Inventory Menu",
    icon: Package,
    items: [
      { title: "Inventory Dashboard", icon: BarChart3, path: "/dashboard/inventory-dashboard", permission: 'inventory.dashboard.view' },
      { title: "Barcode Asset Tracker", icon: Barcode, path: "/dashboard/barcode-tracker", permission: 'inventory.stock.view' },
      { title: "Opening Balance Entry", icon: Package, path: "/dashboard/opening-balance-entry", permission: 'inventory.opening_balance.entry' },
      { title: "Stock Quantities", icon: BarChart3, path: "/dashboard/inventory-stock-quantities", permission: 'inventory.stock.view' },
      { title: "Stock Alerts", icon: AlertTriangle, path: "/dashboard/inventory-alerts", permission: 'inventory.alerts.view' },
    ]
  };

  // PROCUREMENT MENU - For procurement managers
  const procurementMenuGroup: MenuGroup = {
    label: "Procurement Menu",
    icon: Building2,
    items: [
      { title: "Contract/Tender", icon: FileText, path: "/dashboard/contract-tender", permission: 'procurement.tenders.manage' },
      { title: "Annual Tenders", icon: FileText, path: "/dashboard/contract-tender?type=annual-tender", permission: 'procurement.annual_tenders.manage' },
      { title: "Petty Purchase", icon: ShoppingCart, path: "/dashboard/spot-purchases", permission: 'procurement.petty_purchase.manage' },
      { title: "Required Items", icon: ClipboardList, path: "/dashboard/required-items", permission: 'procurement.required_items.view' },
      { title: "Review Requests", icon: CheckCircle, path: "/procurement/admin-review", permission: 'procurement.requests.review' },
    ]
  };

  // ISSUANCE MENU - For issuance processors
  const issuanceMenuGroup: MenuGroup = {
    label: "Stock Issuance Menu",
    icon: Warehouse,
    items: [
      { title: "Direct Issuance (Express)", icon: FileText, path: "/dashboard/direct-issuance-register", permission: 'issuance.dashboard.view' },
      { title: "Issuance Dashboard", icon: BarChart3, path: "/dashboard/stock-issuance-dashboard", permission: 'issuance.dashboard.view' },
      { title: "Process Issuance", icon: ArrowRightLeft, path: "/dashboard/stock-issuance-processing", permission: 'issuance.admin.process' },
      { title: "Historical Entry", icon: FileText, path: "/dashboard/historical-issuance", permission: 'issuance.historical.entry' },
      { title: "Historical Issuances", icon: FileText, path: "/dashboard/issuances", permission: 'issuance.history.view' },
      { title: "Stock Transactions", icon: ArrowRightLeft, path: "/dashboard/stock-transactions", permission: 'issuance.transactions.view' },
    ]
  };

  // REQUEST HISTORY MENU - For approvers and managers
  const requestHistoryMenuGroup: MenuGroup = {
    label: "Request History",
    icon: FileText,
    items: [
      { title: "Future Request", icon: CheckCircle, path: "/dashboard/requests-history/future", permission: 'approval.history.view' },
      { title: "Rejected Request", icon: XCircle, path: "/dashboard/requests-history/rejected", permission: 'approval.history.view' },
      { title: "Pending Request", icon: Clock, path: "/dashboard/requests-history/pending", permission: 'approval.history.view' },
    ]
  };

  // ADMIN APPROVAL MENU - For admin chain approvers
  const adminWingMenuGroup: MenuGroup = {
    label: "Admin Approvals",
    icon: Shield,
    items: [
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard/approval-dashboard-request-based-admin", permission: 'approval.admin.approve' },
      { title: "Direct Issuance Register", icon: FileText, path: "/dashboard/direct-issuance-register", permission: 'approval.admin.approve' },
      { title: "Personal Requests", icon: User, path: "/dashboard/approval-dashboard-request-based-admin?scope=personal", permission: 'approval.admin.approve' },
      { title: "Branch Requests", icon: Building2, path: "/dashboard/approval-dashboard-request-based-admin?scope=branch", permission: 'approval.admin.approve' },
      { title: "Wing Requests", icon: Users, path: "/dashboard/approval-dashboard-request-based-admin?scope=wing", permission: 'approval.admin.approve' },
      { title: "Workflow Config", icon: Settings, path: "/dashboard/workflow-admin", permission: 'workflow.config.manage' },
    ]
  };

  // SUPER ADMIN MENU - For super admins
  const adminMenuGroup: MenuGroup = {
    label: "Super Admin Menu",
    icon: Shield,
    items: [
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard", permission: 'admin.super' },
      { title: "Direct Issuance Register", icon: FileText, path: "/dashboard/direct-issuance-register", permission: 'admin.super' },
      { title: "Workflow Config", icon: Settings, path: "/dashboard/workflow-admin", permission: 'workflow.config.manage' },
      { title: "Roles & Permissions", icon: Shield, path: "/settings/roles", permission: 'roles.manage' },
      { title: "User Management", icon: Users, path: "/settings/users", permission: 'users.assign_roles' },
      { title: "System Settings", icon: Settings, path: "/dashboard/inventory-settings", permission: 'settings.manage' },
      { title: "Reports & Analytics", icon: BarChart3, path: "/dashboard/reports", permission: 'reports.view_all' },
    ]
  };

  const effectiveIsSuperAdmin = Boolean(
    isSuperAdmin ||
    user?.is_super_admin ||
    permissionKeys.has('admin.super') ||
    roleNames.includes('IMS_SUPER_ADMIN') ||
    roleNames.includes('SUPER_ADMIN') ||
    roleNames.includes('SUPER ADMIN')
  );

  const isImsAdmin = Boolean(
    roleNames.includes('IMS_ADMIN') ||
    roleNames.includes('ADMINISTRATOR') ||
    roleNames.includes('IMS ADMINISTRATOR') ||
    roleNames.includes('DG ADMIN') ||
    roleNames.includes('DD ADMIN')
  );

  // Helper to check permission
  const checkPermission = (permissionKey?: string) => {
    if (!permissionKey) return true;
    if (effectiveIsSuperAdmin) return true;
    if (isImsAdmin && (
      permissionKey.startsWith('issuance.') ||
      permissionKey.startsWith('branch.') ||
      permissionKey.startsWith('wing.') ||
      permissionKey.startsWith('inventory.') ||
      permissionKey.startsWith('procurement.') ||
      permissionKey.startsWith('approval.') ||
      permissionKey.startsWith('metadata.') ||
      permissionKey.startsWith('personal.')
    )) return true;

    const lowerKey = permissionKey.toLowerCase();
    if (permissionKeys.has(lowerKey)) return true;

    const altMap: Record<string, string[]> = {
      // Personal
      'personal.dashboard.view': ['issuance.view_own', 'stock_request.view_own'],
      'personal.request.create': ['issuance.request', 'stock_request.create'],
      'personal.request.view_own': ['issuance.view', 'stock_request.view_own'],
      'personal.inventory.view_own': ['inventory.view_personal'],
      'personal.return.create': ['issuance.request'],
      // Branch
      'branch.dashboard.view': ['branch.supervisor', 'branch.storekeeper'],
      'branch.inventory.view': ['branch.supervisor', 'branch.storekeeper', 'inventory.view_wing'],
      'branch.inventory.manage': ['branch.supervisor', 'branch.storekeeper'],
      'branch.demand.create': ['branch.supervisor', 'stock_request.create'],
      'branch.demand.view': ['branch.supervisor', 'stock_request.view_wing'],
      'branch.storekeeper.review': ['branch.storekeeper'],
      'branch.issuance.process': ['branch.storekeeper', 'issuance.process'],
      'branch.members.view': ['branch.supervisor'],
      // Wing
      'wing.dashboard.view': ['wing.supervisor'],
      'wing.inventory.view': ['wing.supervisor', 'inventory.manage_store_keeper', 'inventory.view_wing'],
      'wing.inventory.manage': ['wing.supervisor', 'inventory.manage_store_keeper', 'inventory.edit_wing'],
      'wing.demand.create': ['wing.supervisor', 'procurement.request'],
      'wing.demand.view': ['wing.supervisor', 'stock_request.view_wing'],
      'wing.issuance.process': ['inventory.manage_store_keeper', 'issuance.process'],
      'wing.members.view': ['wing.supervisor'],
      // Inventory
      'inventory.dashboard.view': ['inventory.view', 'inventory.view_all'],
      'inventory.stock.view': ['inventory.view', 'inventory.view_all'],
      'inventory.stock.adjust': ['inventory.manage', 'inventory.edit_all'],
      'inventory.opening_balance.entry': ['inventory.manage', 'inventory.edit_all'],
      'inventory.alerts.view': ['inventory.view', 'inventory.view_all'],
      // Procurement
      'procurement.tenders.manage': ['procurement.manage', 'tender.create', 'tender.manage', 'procurement.view'],
      'procurement.annual_tenders.manage': ['procurement.manage', 'tender.create'],
      'procurement.petty_purchase.manage': ['procurement.manage'],
      'procurement.required_items.view': ['procurement.manage', 'procurement.view'],
      'procurement.requests.review': ['procurement.manage', 'procurement.approve'],
      // Issuance
      'issuance.dashboard.view': ['issuance.view', 'issuance.process'],
      'issuance.admin.process': ['issuance.process'],
      'issuance.historical.entry': ['issuance.process'],
      'issuance.history.view': ['issuance.view'],
      'issuance.transactions.view': ['issuance.view'],
      // Approvals
      'approval.supervisor.approve': ['approval.approve', 'supervisor.menu.view', 'stock_request.approve_supervisor'],
      'approval.admin.approve': ['approval.approve', 'stock_request.approve_admin'],
      'approval.history.view': ['approval.approve'],
      'requisition.report.view': ['approval.approve', 'reports.view', 'reports.view_own'],
      // Metadata
      'metadata.items.manage': ['items.manage', 'inventory.manage'],
      'metadata.categories.manage': ['categories.manage', 'inventory.manage'],
      'metadata.subcategories.manage': ['categories.manage', 'inventory.manage'],
      'metadata.vendors.manage': ['vendor.manage', 'procurement.manage'],
      // Admin
      'roles.manage': ['roles.manage'],
      'users.assign_roles': ['users.assign_roles'],
      'workflow.config.manage': ['roles.manage', 'admin.super'],
      'settings.manage': ['admin.super'],
      'reports.view_all': ['reports.view', 'reports.view_all']
    };

    const alts = altMap[lowerKey] || [];
    for (const alt of alts) {
      if (permissionKeys.has(alt.toLowerCase())) return true;
    }

    // Role-based fallbacks for existing roles
    if (lowerKey.startsWith('personal.')) return true;
    if (lowerKey === 'branch.storekeeper.review' || lowerKey === 'branch.issuance.process') {
      if (effectiveIsSuperAdmin || isImsAdmin || hasBranchStorekeeperRole) return true;
    } else if (lowerKey.startsWith('branch.')) {
      if (effectiveIsSuperAdmin || isImsAdmin || hasBranchSupervisorRole) return true;
    }
    if (lowerKey === 'wing.issuance.process') {
      if (effectiveIsSuperAdmin || isImsAdmin || hasWingStorekeeperRole || isWingStoreKeeper) return true;
    } else if (lowerKey.startsWith('wing.')) {
      if (effectiveIsSuperAdmin || isImsAdmin || hasWingSupervisorRole || isWingSupervisor) return true;
    }
    if (lowerKey.startsWith('approval.')) {
      if (hasApproverRole || hasAdminRole || hasSupervisorRole) return true;
    }
    if (lowerKey.startsWith('inventory.')) {
      if (hasCentralInventoryViewPermission || hasCentralInventoryManagePermission || hasAdminRole) return true;
    }
    if (lowerKey.startsWith('procurement.')) {
      if (canViewProcurement || canManageProcurement) return true;
    }
    if (lowerKey === 'issuance.admin.process') {
      if (effectiveIsSuperAdmin || isImsAdmin || hasAdminStorekeeperRole || canProcessIssuance) return true;
    } else if (lowerKey.startsWith('issuance.')) {
      if (canProcessIssuance || hasAdminStorekeeperRole || hasBranchStorekeeperRole || hasWingStorekeeperRole) return true;
    }
    if (lowerKey.startsWith('metadata.')) {
      if (canManageInventory || canManageProcurement || hasAdminRole) return true;
    }
    if (lowerKey.startsWith('admin.') || lowerKey === 'roles.manage' || lowerKey === 'users.assign_roles') {
      if (effectiveIsSuperAdmin || canManageRoles) return true;
    }

    return false;
  };

  // Filter menu groups and items based on permissions
  const getVisibleMenuGroups = () => {
    const groups: MenuGroup[] = [];

    // 1. Personal Menu (Always visible for all users)
    const visiblePersonalItems = personalMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visiblePersonalItems.length > 0) {
      groups.push({ ...personalMenuGroup, items: visiblePersonalItems });
    }

    // 2. Supervisor Menu (For Branch/Wing Supervisors & Admins)
    const visibleSubordinateItems = subordinateMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleSubordinateItems.length > 0) {
      groups.push({ ...subordinateMenuGroup, items: visibleSubordinateItems });
    }

    // 3. Wing Menu (For Wing Supervisors & Admins)
    const visibleWingItems = wingMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleWingItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasWingSupervisorRole || isWingSupervisor || permissionKeys.has('wing.dashboard.view'))) {
      groups.push({ ...wingMenuGroup, items: visibleWingItems });
    }

    // 4. Branch Menu (For Branch Supervisors & Admins)
    const visibleBranchItems = branchMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleBranchItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasBranchSupervisorRole || permissionKeys.has('branch.dashboard.view'))) {
      groups.push({ ...branchMenuGroup, items: visibleBranchItems });
    }

    // 5. Admin Storekeeper Menu (Only for Admin Storekeepers & Super Admins)
    const visibleAdminStoreItems = adminStorekeeperMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleAdminStoreItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasAdminStorekeeperRole || permissionKeys.has('issuance.admin.process'))) {
      groups.push({ ...adminStorekeeperMenuGroup, items: visibleAdminStoreItems });
    }

    // 6. Branch Storekeeper Menu (Only for Branch Storekeepers & Super Admins)
    const visibleBranchStoreItems = branchStorekeeperMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleBranchStoreItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasBranchStorekeeperRole || permissionKeys.has('branch.issuance.process') || permissionKeys.has('branch.storekeeper.review'))) {
      groups.push({ ...branchStorekeeperMenuGroup, items: visibleBranchStoreItems });
    }

    // 7. Wing Storekeeper Menu (Only for Wing Storekeepers & Super Admins)
    const visibleWingStoreItems = wingStorekeeperMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleWingStoreItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasWingStorekeeperRole || isWingStoreKeeper || permissionKeys.has('wing.issuance.process'))) {
      groups.push({ ...wingStorekeeperMenuGroup, items: visibleWingStoreItems });
    }

    // 8. Central Inventory Menu
    const visibleInventoryItems = inventoryMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleInventoryItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || hasCentralInventoryViewPermission || hasCentralInventoryManagePermission || hasAdminApprovalRole || permissionKeys.has('inventory.dashboard.view'))) {
      groups.push({ ...inventoryMenuGroup, items: visibleInventoryItems });
    }

    // 9. Procurement Menu
    const visibleProcurementItems = procurementMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleProcurementItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || canViewProcurement || canManageProcurement || permissionKeys.has('procurement.tenders.manage'))) {
      groups.push({ ...procurementMenuGroup, items: visibleProcurementItems });
    }

    // 10. Central Stock Issuance Menu
    const visibleIssuanceItems = issuanceMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleIssuanceItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || canProcessIssuance || permissionKeys.has('issuance.dashboard.view'))) {
      groups.push({ ...issuanceMenuGroup, items: visibleIssuanceItems });
    }

    // 11. Request History Menu
    const visibleRequestHistoryItems = requestHistoryMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleRequestHistoryItems.length > 0 && (hasAdminRole || effectiveIsSuperAdmin || isImsAdmin || permissionKeys.has('approval.history.view'))) {
      groups.push({ ...requestHistoryMenuGroup, items: visibleRequestHistoryItems });
    }

    // 12. Admin Approvals Menu
    const visibleAdminWingItems = adminWingMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleAdminWingItems.length > 0 && (hasAdminRole || effectiveIsSuperAdmin || isImsAdmin || canManageRoles || permissionKeys.has('approval.admin.approve'))) {
      groups.push({ ...adminWingMenuGroup, items: visibleAdminWingItems });
    }

    // 13. Master Metadata Menu
    const visibleMetadataItems = metadataMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleMetadataItems.length > 0 && (effectiveIsSuperAdmin || isImsAdmin || canManageInventory || canManageProcurement || permissionKeys.has('metadata.items.manage'))) {
      groups.push({ ...metadataMenuGroup, items: visibleMetadataItems });
    }

    // 14. Super Admin Menu
    const visibleAdminItems = adminMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visibleAdminItems.length > 0 && (effectiveIsSuperAdmin || canManageRoles || permissionKeys.has('admin.super'))) {
      groups.push({ ...adminMenuGroup, items: visibleAdminItems });
    }

    return groups;
  };

  const menuGroups = getVisibleMenuGroups();

  const isActive = (path: string) => {
    // Handle paths with query parameters
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      return location.pathname === pathname && location.search === '?' + query;
    }
    // Only check pathname if no query params
    return location.pathname === path && !location.search;
  };

  const isGroupActive = (items: MenuItem[]) => {
    return items.some(item => {
      if (item.path.includes('?')) {
        const [pathname, query] = item.path.split('?');
        return location.pathname === pathname && location.search === '?' + query;
      }
      return location.pathname === item.path;
    });
  };

  // Handle accordion menu - close others when one opens
  const handleMenuGroupChange = (groupLabel: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenGroup(groupLabel);
    } else {
      setOpenGroup(null);
    }
  };

  // Open the active group on mount or route/query change
  useEffect(() => {
    const menuGroups = getVisibleMenuGroups();
    const activeGroup = menuGroups.find(group => isGroupActive(group.items));
    if (activeGroup) {
      setOpenGroup(activeGroup.label);
    }
  }, [location.pathname, location.search]);

  const sidebarRootClass = isDark
    ? "!bg-slate-900 border-r border-slate-700"
    : "!bg-teal-700 border-r border-teal-600";

  const sidebarHeaderClass = isDark
    ? "p-4 border-b border-slate-700 bg-slate-900"
    : "p-4 border-b border-teal-600 bg-teal-700";

  const sidebarContentClass = isDark ? "p-0 bg-slate-900" : "p-0 bg-teal-700";

  const groupButtonClass = isDark
    ? "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 transition-colors duration-150 text-slate-100 justify-between"
    : "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-teal-600 transition-colors duration-150 text-white justify-between";

  const collapsedGroupButtonClass = isDark
    ? "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 transition-colors duration-150 text-slate-100 justify-center"
    : "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-teal-600 transition-colors duration-150 text-white justify-center";

  const groupIconBadgeClass = isDark ? "p-1.5 rounded-lg bg-slate-800 flex-shrink-0" : "p-1.5 rounded-lg bg-teal-600/50 flex-shrink-0";

  const hoverCardClass = isDark ? "bg-slate-900 border-slate-700 p-0 w-56" : "bg-teal-700 border-teal-600 p-0 w-56";

  const hoverCardHeaderClass = isDark
    ? "px-3 py-2 text-[13px] font-semibold text-slate-100 border-b border-slate-700 whitespace-nowrap"
    : "px-3 py-2 text-[13px] font-semibold text-white border-b border-teal-600 whitespace-nowrap";

  const collapsedItemClass = isDark
    ? "flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-100 hover:bg-slate-800 transition-colors whitespace-nowrap"
    : "flex items-center gap-2.5 px-3 py-2 text-[13px] text-white hover:bg-teal-600 transition-colors whitespace-nowrap";

  const expandedItemClass = isDark
    ? "px-3 py-1.5 text-slate-100 transition-colors duration-150 mx-1.5"
    : "px-3 py-1.5 text-white transition-colors duration-150 mx-1.5";

  const expandedItemActiveClass = isDark ? "!bg-slate-700 !rounded-lg !text-slate-100" : "!bg-teal-500/60 !rounded-lg !text-white";
  const expandedItemInactiveClass = isDark ? "!rounded-none !bg-transparent hover:!bg-slate-800" : "!rounded-none !bg-transparent hover:!bg-teal-600";

  const logoutGroupClass = isDark ? "mt-auto border-t border-slate-700" : "mt-auto border-t border-teal-600";

  const logoutButtonClass = isDark
    ? "w-full px-4 py-3 text-slate-100 hover:bg-red-800 cursor-pointer transition-colors duration-150 rounded-none text-[13px]"
    : "w-full px-4 py-3 text-white hover:bg-red-700 cursor-pointer transition-colors duration-150 rounded-none text-[13px]";

  return (
    <Sidebar
      className={sidebarRootClass}
      collapsible="icon"
    >
      <SidebarHeader className={sidebarHeaderClass}>
        <div className="flex items-center justify-center">
          {isCollapsed ? (
            <img
              src="/ecp-logo-small.png"
              alt="ECP Logo"
              className="w-10 h-10 object-contain"
            />
          ) : (
            <img
              src="/ecp-logo.png"
              alt="ECP Logo"
              className="w-auto object-contain"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={sidebarContentClass}>
        <SidebarMenu className="space-y-0">
          {menuGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = isGroupActive(group.items);
            const isGroupOpen = openGroup === group.label;

            return (
              <Collapsible 
                key={group.label} 
                open={isGroupOpen && !isCollapsed}
                onOpenChange={(isOpen) => handleMenuGroupChange(group.label, isOpen)}
                className="space-y-0"
              >
                {isCollapsed ? (
                  <HoverCard openDelay={200} closeDelay={200}>
                    <HoverCardTrigger asChild>
                      <button 
                        className={collapsedGroupButtonClass}
                      >
                        <div className={groupIconBadgeClass}>
                          <GroupIcon className="w-4 h-4 flex-shrink-0" />
                        </div>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" align="start" className={hoverCardClass} sideOffset={0}>
                      <div className="py-1">
                        <div className={hoverCardHeaderClass}>
                          {group.label.replace(' Menu', '')}
                        </div>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`${collapsedItemClass} ${
                                isActive(item.path) ? (isDark ? 'bg-slate-700' : 'bg-teal-500/60') : ''
                              }`}
                            >
                              <ItemIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{item.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  <>
                    <CollapsibleTrigger asChild>
                      <button 
                        className={groupButtonClass}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={groupIconBadgeClass}>
                            <GroupIcon className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <span className={isDark ? "text-[13px] font-semibold text-slate-100 whitespace-nowrap" : "text-[13px] font-semibold text-white whitespace-nowrap"}>
                            {group.label.replace(' Menu', '')}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-100' : 'text-white'} transition-transform duration-300 ${
                          isGroupOpen ? 'rotate-90' : ''
                        }`} />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="transition-all duration-200">
                      <SidebarGroup className="p-0">
                        <SidebarGroupContent>
                          <SidebarMenu className="space-y-0">
                            {group.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <SidebarMenuItem key={item.path}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item.path)}
                                    className={`${expandedItemClass} ${
                                      isActive(item.path)
                                        ? expandedItemActiveClass
                                        : expandedItemInactiveClass
                                    }`}
                                    tooltip={isCollapsed ? item.title : undefined}
                                  >
                                    <Link
                                      to={item.path}
                                      className="flex items-center gap-2 ml-4 min-w-0"
                                    >
                                      <span className={isDark ? "text-slate-100 text-sm flex-shrink-0" : "text-white text-sm flex-shrink-0"}>–</span>
                                      <span className={isDark ? "text-[13px] font-normal text-slate-100 whitespace-nowrap" : "text-[13px] font-normal text-white whitespace-nowrap"}>
                                        {item.title}
                                      </span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    </CollapsibleContent>
                  </>
                )}
              </Collapsible>
            );
          })}
        </SidebarMenu>

        {/* Logout Section */}
        <SidebarGroup className={logoutGroupClass}>
          <SidebarGroupContent className="p-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className={`${logoutButtonClass} ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-normal">Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
