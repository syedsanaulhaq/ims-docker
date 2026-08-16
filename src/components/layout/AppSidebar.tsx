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
  Clock
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
  const hasScopedOperationalRole =
    hasBranchSupervisorRole ||
    hasBranchStorekeeperRole ||
    hasWingSupervisorRole ||
    hasWingStorekeeperRole;
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
  
  // Check if user has any store keeper role (including custom roles)
  const hasStoreKeeperRole = user?.ims_roles?.some(role => 
    role.role_name === 'WING_STORE_KEEPER' || 
    role.role_name === 'BRANCH_STORE_KEEPER' ||
    role.role_name === 'CUSTOM_WING_STORE_KEEPER' ||
    role.role_name === 'CUSTOM_BRANCH_STORE_KEEPER' ||
    role.role_name.includes('STORE_KEEPER')
  ) || false;
  
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
      hasStoreKeeperRole: hasStoreKeeperRole,
      isSuperAdmin: user?.is_super_admin
    });
  }, [user, hasStoreKeeperRole, hasBranchSupervisorRole, hasBranchStorekeeperRole]);

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
      { title: "Dashboard", icon: Home, path: "/personal-dashboard", permission: undefined },
      { title: "Request Form", icon: ShoppingCart, path: "/dashboard/stock-issuance-personal", permission: undefined },
      ...(!canAccessBranchMenu && hasBranchAssignment ? [
        { title: "Branch Demand", icon: Building2, path: "/dashboard/stock-issuance-branch", permission: undefined },
        { title: "My Branch Demand", icon: ClipboardList, path: "/dashboard/my-branch-demand", permission: undefined },
      ] : []),
      { title: "My Request", icon: ClipboardList, path: "/dashboard/my-requests", permission: undefined },
      { title: "Stock Return", icon: Undo2, path: "/dashboard/stock-return", permission: undefined },
      { title: "My Inventory", icon: Package, path: "/dashboard/personal-inventory", permission: undefined },
    ]
  };

  const subordinateMenuGroup: MenuGroup = {
    label: "Supervisor",
    icon: Users,
    items: [
      { title: "Supervisor Dashboard", icon: CheckCircle, path: "/dashboard/supervisor-approval-dashboard", permission: 'supervisor.menu.view' },
      { title: "Requisition Report", icon: FileText, path: "/dashboard/requisition-report", permission: undefined },
    ]
  };

  // WING MENU - For wing supervisors
  const wingMenuGroup: MenuGroup = {
    label: "Wing Menu",
    icon: Building2,
    items: [
      { title: "Wing Dashboard", icon: BarChart3, path: "/dashboard/wing-dashboard", permission: 'wing.supervisor' },
      { title: "Wing Request History", icon: History, path: "/dashboard/wing-request-history", permission: 'wing.supervisor' },
      { title: "Request Items", icon: ShoppingCart, path: "/procurement/new-request", permission: undefined },
      { title: "Wing Inventory", icon: Warehouse, path: "/dashboard/wing-inventory", permission: 'wing.supervisor' },
      { title: "Wing Members", icon: Users, path: "/dashboard/wing-members", permission: 'wing.supervisor' },
    ]
  };

  // BRANCH MENU - For branch supervisors and branch storekeepers
  const branchMenuGroup: MenuGroup = {
    label: "Branch Menu",
    icon: Building2,
    items: [
      { title: "Branch Dashboard", icon: BarChart3, path: "/dashboard/branch-dashboard", permission: undefined },
      { title: "Branch Request History", icon: History, path: "/dashboard/branch-request-history", permission: undefined },
      { title: "Request Items", icon: ShoppingCart, path: "/dashboard/stock-issuance-branch", permission: undefined },
      { title: "Branch Inventory", icon: Warehouse, path: "/dashboard/branch-inventory", permission: undefined },
      { title: "Branch Members", icon: Users, path: "/dashboard/branch-members", permission: undefined },
    ]
  };

  // STORE KEEPER MENU - For wing store keepers
  const storeKeeperMenuGroup: MenuGroup = {
    label: "Store Keeper Menu",
    icon: Warehouse,
    items: [
      ...(hasBranchStorekeeperRole ? [
        { title: "Branch Request Review", icon: ClipboardList, path: "/dashboard/branch-storekeeper-review", permission: undefined },
      ] : []),
      { title: "Forwarded Verifications", icon: Eye, path: "/dashboard/store-keeper-verifications", permission: undefined },
      { title: "Wing Inventory", icon: Package, path: "/dashboard/wing-inventory", permission: undefined },
      { title: "Stock Issuance", icon: Send, path: "/dashboard/stock-issuance-processing", permission: undefined },
    ]
  };

  // METADATA MENU - For managing master data
  const metadataMenuGroup: MenuGroup = {
    label: "Meta Data Menu",
    icon: Database,
    items: [
      { title: "Item Master", icon: Package, path: "/dashboard/item-master", permission: 'inventory.manage' },
      { title: "Categories", icon: Boxes, path: "/dashboard/categories", permission: 'inventory.manage' },
      { title: "Sub-Categories", icon: Boxes, path: "/dashboard/sub-categories", permission: 'inventory.manage' },
      { title: "Vendor Management", icon: Building2, path: "/dashboard/vendors", permission: 'procurement.manage' },
    ]
  };

  // INVENTORY MENU - For inventory managers
  const inventoryMenuGroup: MenuGroup = {
    label: "Inventory Menu",
    icon: Package,
    items: [
      { title: "Inventory Dashboard", icon: BarChart3, path: "/dashboard/inventory-dashboard", permission: 'inventory.view' },
      { title: "Opening Balance Entry", icon: Package, path: "/dashboard/opening-balance-entry", permission: 'inventory.manage' },
      { title: "Stock Quantities", icon: BarChart3, path: "/dashboard/inventory-stock-quantities", permission: 'inventory.view' },
      { title: "Stock Alerts", icon: AlertTriangle, path: "/dashboard/inventory-alerts", permission: 'inventory.view' },
    ]
  };

  // PROCUREMENT MENU - For procurement managers
  const procurementMenuGroup: MenuGroup = {
    label: "Procurement Menu",
    icon: Building2,
    items: [
      { title: "Contract/Tender", icon: FileText, path: "/dashboard/contract-tender", permission: 'procurement.manage' },
      { title: "Annual Tenders", icon: FileText, path: "/dashboard/contract-tender?type=annual-tender", permission: 'procurement.manage' },
      { title: "Petty Purchase", icon: ShoppingCart, path: "/dashboard/spot-purchases", permission: 'procurement.manage' },
      { title: "Required Items", icon: ClipboardList, path: "/dashboard/required-items", permission: 'procurement.manage' },
      { title: "Review Requests", icon: CheckCircle, path: "/procurement/admin-review", permission: 'procurement.approve' },
    ]
  };

  // ISSUANCE MENU - For issuance processors
  const issuanceMenuGroup: MenuGroup = {
    label: "Stock Issuance Menu",
    icon: Warehouse,
    items: [
      { title: "Issuance Dashboard", icon: BarChart3, path: "/dashboard/stock-issuance-dashboard", permission: 'issuance.view' },
      { title: "Process Issuance", icon: ArrowRightLeft, path: "/dashboard/stock-issuance-processing", permission: 'issuance.process' },
      { title: "Historical Entry", icon: FileText, path: "/dashboard/historical-issuance", permission: 'issuance.process' },
      { title: "Historical Issuances", icon: FileText, path: "/dashboard/issuances", permission: 'issuance.view' },
      { title: "Stock Transactions", icon: ArrowRightLeft, path: "/dashboard/stock-transactions", permission: 'issuance.view' },
    ]
  };

  // REQUEST HISTORY MENU - For approvers
  const requestHistoryMenuGroup: MenuGroup = {
    label: "Request History",
    icon: FileText,
    items: [
      { title: "Future Request", icon: CheckCircle, path: "/dashboard/requests-history/future", permission: 'approval.approve' },
      { title: "Rejected Request", icon: XCircle, path: "/dashboard/requests-history/rejected", permission: 'approval.approve' },
      { title: "Pending Request", icon: Clock, path: "/dashboard/requests-history/pending", permission: 'approval.approve' },
    ]
  };

  // ADMIN APPROVAL MENU - For admin chain approvers
  const adminWingMenuGroup: MenuGroup = {
    label: "Admin",
    icon: Shield,
    items: [
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard/approval-dashboard-request-based-admin", permission: 'approval.approve' },
      { title: "Personal Requests", icon: User, path: "/dashboard/approval-dashboard-request-based-admin?scope=personal", permission: 'approval.approve' },
      { title: "Branch Requests", icon: Building2, path: "/dashboard/approval-dashboard-request-based-admin?scope=branch", permission: 'approval.approve' },
      { title: "Wing Requests", icon: Users, path: "/dashboard/approval-dashboard-request-based-admin?scope=wing", permission: 'approval.approve' },
      { title: "Workflow Config", icon: Settings, path: "/dashboard/workflow-admin", permission: 'roles.manage' },
    ]
  };

  // ADMIN MENU - For super admins
  const adminMenuGroup: MenuGroup = {
    label: "Super Admin Menu",
    icon: Shield,
    items: [
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard", permission: 'admin.super' },
      { title: "Workflow Config", icon: Settings, path: "/dashboard/workflow-admin", permission: 'admin.super' },
      { title: "Roles & Permissions", icon: Shield, path: "/settings/roles", permission: 'roles.manage' },
      { title: "User Management", icon: Users, path: "/settings/users", permission: 'users.assign_roles' },
      { title: "System Settings", icon: Settings, path: "/dashboard/inventory-settings", permission: 'admin.super' },
      { title: "Reports & Analytics", icon: BarChart3, path: "/dashboard/reports", permission: 'reports.view' },
    ]
  };

  // Helper to check permission
  const checkPermission = (permissionKey?: string) => {
    if (!permissionKey) return true;
    if (permissionKey === 'approval.approve') {
      return canApprove || hasApproverRole;
    }
    if (permissionKey === 'supervisor.menu.view') {
      return canViewSupervisorMenu || canApprove || hasApproverRole || isSuperAdmin;
    }
    
    switch (permissionKey) {
      case 'inventory.view': return hasCentralInventoryViewPermission || isSuperAdmin;
      case 'inventory.manage': return hasCentralInventoryManagePermission || isSuperAdmin;
      case 'inventory.manage_store_keeper': return isWingStoreKeeper;
      case 'procurement.view': return canViewProcurement;
      case 'procurement.manage': return canManageProcurement;
      case 'procurement.request': return canRequestProcurement;
      case 'issuance.request': return canRequestIssuance;
      case 'issuance.process': return canProcessIssuance;
      case 'issuance.view': return canRequestIssuance || canProcessIssuance;
      case 'approval.approve': return canApprove;
      case 'roles.manage': return canManageRoles;
      case 'users.assign_roles': return canAssignRoles;
      case 'reports.view': return canViewReports;
      case 'wing.supervisor': return isWingSupervisor;
      case 'admin.super': return isSuperAdmin;
      default: return false;
    }
  };

  // Filter menu groups and items based on permissions
  const getVisibleMenuGroups = () => {
    const groups: MenuGroup[] = [];

    // Always show personal menu
    const visiblePersonalItems = personalMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visiblePersonalItems.length > 0) {
      groups.push({ ...personalMenuGroup, items: visiblePersonalItems });
    }

    // Show Supervisor menu only for users with supervisor.menu.view permission, approval.approve, or approver roles
    if (canViewSupervisorMenu || canApprove || hasApproverRole) {
      const visibleSubordinateItems = subordinateMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleSubordinateItems.length > 0) {
        groups.push({ ...subordinateMenuGroup, items: visibleSubordinateItems });
      }
    }

    // Show wing menu if user is wing supervisor
    if (isWingSupervisor) {
      const visibleWingItems = wingMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleWingItems.length > 0) {
        groups.push({ ...wingMenuGroup, items: visibleWingItems });
      }
    }

    // Show branch menu only to branch supervisors, branch storekeepers, and super admins.
    if (canAccessBranchMenu) {
      const visibleBranchItems = branchMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleBranchItems.length > 0) {
        groups.push({ ...branchMenuGroup, items: visibleBranchItems });
      }
    }

    // Show store keeper menu if user is wing store keeper (by permission or role)
    if (canAccessStoreKeeperMenu) {
      const visibleStoreKeeperItems = storeKeeperMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleStoreKeeperItems.length > 0) {
        groups.push({ ...storeKeeperMenuGroup, items: visibleStoreKeeperItems });
      }
    }

    // Show inventory menu for super admins, inventory managers, and admin chain roles.
    // Store-keeper / scoped operational exclusion should not hide inventory menu from super admins or admin chain roles.
    if (canAccessCentralInventoryMenu && (!canAccessStoreKeeperMenu || isSuperAdmin || hasAdminApprovalRole) && (!hasScopedOperationalRole || isSuperAdmin || hasAdminApprovalRole)) {
      const visibleInventoryItems = inventoryMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleInventoryItems.length > 0) {
        groups.push({ ...inventoryMenuGroup, items: visibleInventoryItems });
      }
    }

    // Show procurement menu if user has procurement permissions
    if (canViewProcurement || canManageProcurement) {
      const visibleProcurementItems = procurementMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleProcurementItems.length > 0) {
        groups.push({ ...procurementMenuGroup, items: visibleProcurementItems });
      }
    }

    // Show issuance menu if user has issuance PROCESSING permissions
    if (canProcessIssuance) {
      const visibleIssuanceItems = issuanceMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleIssuanceItems.length > 0) {
        groups.push({ ...issuanceMenuGroup, items: visibleIssuanceItems });
      }
    }

    // Show request history menu if user has APPROVAL permissions (approvers only)
    if (canApprove || hasApproverRole) {
      const visibleRequestHistoryItems = requestHistoryMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleRequestHistoryItems.length > 0) {
        groups.push({ ...requestHistoryMenuGroup, items: visibleRequestHistoryItems });
      }
    }

    // Show admin wing menu for admin-capable approvers.
    if (canApprove || hasApproverRole || hasAdminApprovalRole || canManageRoles) {
      const visibleAdminWingItems = adminWingMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleAdminWingItems.length > 0) {
        groups.push({ ...adminWingMenuGroup, items: visibleAdminWingItems });
      }
    }

    // Show metadata menu if user has inventory or procurement permissions (before Admin)
    if (canManageInventory || canManageProcurement) {
      const visibleMetadataItems = metadataMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleMetadataItems.length > 0) {
        groups.push({ ...metadataMenuGroup, items: visibleMetadataItems });
      }
    }

    // Show admin menu if user is super admin
    if (isSuperAdmin || canManageRoles) {
      const visibleAdminItems = adminMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleAdminItems.length > 0) {
        groups.push({ ...adminMenuGroup, items: visibleAdminItems });
      }
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

  // Open the active group on mount
  useEffect(() => {
    const menuGroups = getVisibleMenuGroups();
    const activeGroup = menuGroups.find(group => isGroupActive(group.items));
    if (activeGroup) {
      setOpenGroup(activeGroup.label);
    }
  }, [location.pathname]);

  const sidebarRootClass = isDark
    ? "!bg-slate-900 border-r border-slate-700"
    : "!bg-teal-700 border-r border-teal-600";

  const sidebarHeaderClass = isDark
    ? "p-4 border-b border-slate-700 bg-slate-900"
    : "p-4 border-b border-teal-600 bg-teal-700";

  const sidebarContentClass = isDark ? "p-0 bg-slate-900" : "p-0 bg-teal-700";

  const groupButtonClass = isDark
    ? "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors duration-150 text-slate-100 justify-between"
    : "w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-600 transition-colors duration-150 text-white justify-between";

  const collapsedGroupButtonClass = isDark
    ? "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors duration-150 text-slate-100 justify-center"
    : "w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-600 transition-colors duration-150 text-white justify-center";

  const groupIconBadgeClass = isDark ? "p-2 rounded-lg bg-slate-800" : "p-2 rounded-lg bg-teal-600/50";

  const hoverCardClass = isDark ? "bg-slate-900 border-slate-700 p-0 w-56" : "bg-teal-700 border-teal-600 p-0 w-56";

  const hoverCardHeaderClass = isDark
    ? "px-3 py-2 text-sm font-bold text-slate-100 border-b border-slate-700"
    : "px-3 py-2 text-sm font-bold text-white border-b border-teal-600";

  const collapsedItemClass = isDark
    ? "flex items-center gap-3 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 transition-colors"
    : "flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-teal-600 transition-colors";

  const expandedItemClass = isDark
    ? "px-4 py-2.5 text-slate-100 transition-colors duration-150 mx-2"
    : "px-4 py-2.5 text-white transition-colors duration-150 mx-2";

  const expandedItemActiveClass = isDark ? "!bg-slate-700 !rounded-lg !text-slate-100" : "!bg-teal-500/60 !rounded-lg !text-white";
  const expandedItemInactiveClass = isDark ? "!rounded-none !bg-transparent hover:!bg-slate-800" : "!rounded-none !bg-transparent hover:!bg-teal-600";

  const logoutGroupClass = isDark ? "mt-auto border-t border-slate-700" : "mt-auto border-t border-teal-600";

  const logoutButtonClass = isDark
    ? "w-full px-4 py-3 text-slate-100 hover:bg-red-800 cursor-pointer transition-colors duration-150 rounded-none"
    : "w-full px-4 py-3 text-white hover:bg-red-700 cursor-pointer transition-colors duration-150 rounded-none";

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
                          <GroupIcon className="w-5 h-5 flex-shrink-0" />
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
                        <div className="flex items-center gap-3">
                          <div className={groupIconBadgeClass}>
                            <GroupIcon className="w-5 h-5 flex-shrink-0" />
                          </div>
                          <span className={isDark ? "text-sm font-bold text-slate-100" : "text-sm font-bold text-white"}>
                            {group.label.replace(' Menu', '')}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-100' : 'text-white'} transition-transform duration-300 ${
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
                                      className="flex items-center gap-3 ml-6"
                                    >
                                      <span className={isDark ? "text-slate-100 text-lg" : "text-white text-lg"}>–</span>
                                      <span className={isDark ? "text-sm font-normal text-slate-100" : "text-sm font-normal text-white"}>
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
