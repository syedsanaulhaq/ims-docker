import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  ArrowRight
} from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AppSidebarProps {
  limitedMenu?: boolean;
}

const AppSidebar = ({ limitedMenu = false }: AppSidebarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { 
      title: "Dashboard", 
      icon: Home, 
      path: "/dashboard",
      variant: "default" as const
    },
    {
      title: "Inventory Management",
      icon: Package,
      submenu: [
        { title: "Current Inventory Status", path: "/dashboard/inventory/current-status" },
        { title: "Stock Inquiry", path: "/dashboard/stock-inquiry" },
        { title: "Add New Items", path: "/dashboard/item-master" },
        { title: "Ledger", path: "/dashboard/ledger" },
        { title: "Analytics", path: "/dashboard/inventory-report" },
        { title: "Transfer Stock", path: "/dashboard/stock-transfer" }
      ]
    },
    {
      title: "Stock Transactions",
      icon: ArrowRightLeft,
      submenu: [
        { title: "Stock Acquisition", path: "/dashboard/stock-acquisition" },
        { title: "Issue / Return", path: "/dashboard/stock-issuance" },
        { title: "Delivery", path: "/dashboard/delivery-management" },
        { title: "Consumption", path: "/dashboard/consumption" },
        { title: "View Transactions", path: "/dashboard/transactions" }
      ]
    },
    {
      title: "Procurement & Tenders",
      icon: Gavel,
      submenu: [
        { title: "Create Tender", path: "/dashboard/tender-creation" },
        { title: "View Tenders", path: "/dashboard/tenders" },
        { title: "Tender Analytics", path: "/dashboard/tender-analytics" }
      ]
    },
    {
      title: "Approvals",
      icon: CheckCircle,
      submenu: [
        { title: "My Pending Approvals", path: "/dashboard/approval-dashboard" },
        { title: "My Requests", path: "/dashboard/my-requests" },
        { title: "Request History", path: "/dashboard/request-history" },
        { title: "Workflow Configuration", path: "/dashboard/workflow-admin" }
      ]
    },
    {
      title: "Reports & Analytics",
      icon: BarChart3,
      submenu: [
        { title: "Dashboard Analytics", path: "/dashboard/analytics" },
        { title: "Inventory Reports", path: "/dashboard/reports/inventory" },
        { title: "Transaction Reports", path: "/dashboard/reports/transactions" },
        { title: "Procurement Reports", path: "/dashboard/reports/procurement" }
      ]
    },
    {
      title: "Organization Management",
      icon: Building2,
      submenu: [
        { title: "Offices", path: "/dashboard/offices" },
        { title: "Wings", path: "/dashboard/wings" },
        { title: "Users", path: "/dashboard/users" }
      ]
    },
    {
      title: "System Administration",
      icon: Settings,
      submenu: [
        { title: "System Settings", path: "/dashboard/settings" },
        { title: "User Management", path: "/dashboard/user-management" },
        { title: "Backup & Restore", path: "/dashboard/backup" }
      ]
    }
  ];

  // Filter menu items if limited menu is enabled
  const filteredMenuItems = limitedMenu 
    ? menuItems.filter(item => 
        item.title === "Dashboard" || 
        item.title === "Inventory Management" || 
        item.title === "Stock Transactions"
      )
    : menuItems;

  return (
    <Sidebar className="border-r bg-gradient-to-b from-teal-800 to-teal-900">
      <SidebarHeader className="bg-teal-900 border-b border-teal-700">
        <div className="flex items-center space-x-2 px-4 py-3">
          <Package className="w-8 h-8 text-teal-100" />
          <div>
            <h1 className="text-lg font-bold text-white">InvMIS</h1>
            <p className="text-xs text-teal-200">Inventory Management</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const hasActiveChild = item.submenu?.some(subItem => isActive(subItem.path)) ?? false;

                if (item.submenu) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible defaultOpen={hasActiveChild}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`w-full justify-between text-teal-100 hover:bg-teal-700 hover:text-white data-[state=open]:bg-teal-700 data-[state=open]:text-white ${
                              hasActiveChild ? 'bg-teal-700 text-white' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-8 mt-2 group-data-[collapsible=icon]:hidden">
                            {item.submenu?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.path}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(subItem.path)}
                                  className={`text-teal-200 hover:bg-teal-700 hover:text-white ${
                                    isActive(subItem.path)
                                      ? 'bg-teal-800 text-white'
                                      : ''
                                  }`}
                                >
                                  <Link to={subItem.path}>
                                    <span className="ml-1">- {subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      className={`text-teal-100 hover:bg-teal-700 hover:text-white ${
                        isActive(item.path)
                          ? 'bg-teal-700 text-white'
                          : ''
                      }`}
                    >
                      <Link to={item.path}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;