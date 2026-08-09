
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  limitedMenu?: boolean;
}

const AppSidebar = ({ limitedMenu = false }: AppSidebarProps) => {
  const location = useLocation();
  const { state } = useSidebar();

  const allMenuItems = [
    {
      title: "My Dashboard",
      icon: Home,
      path: "/",
      hasSubmenu: false
    },
    {
      title: "Inv. Dashboard",
      icon: BarChart3,
      path: "/dashboard",
      hasSubmenu: false
    },
    {
      title: "Inventory Manager",
      icon: Package,
      path: "/inventory",
      hasSubmenu: true,
      submenu: [
        { title: "Initial Setup", path: "/dashboard/initial-setup" },
        { title: "Inventory Dashboard", path: "/dashboard/inventory-dashboard" },
        { title: "Item Master", path: "/dashboard/item-master" },
        { title: "Categories", path: "/dashboard/categories" },
        { title: "Inventory Settings", path: "/dashboard/inventory-settings" }
      ]
    },
    {
      title: "Procurement Manager",
      icon: Building2,
      path: "/procurement",
      hasSubmenu: true,
      submenu: [
        { title: "Contract/Tender", path: "/dashboard/contract-tender" },
        { title: "Petty Purchase", path: "/dashboard/spot-purchases" },
        { title: "Vendor Management", path: "/dashboard/vendors" }
      ]
    },
    {
      title: "Issuance Manager",
      icon: Warehouse,
      path: "/issuance",
      hasSubmenu: true,
      submenu: [
        { title: "Stock Issuance", path: "/dashboard/stock-issuance" },
        { title: "Issuance Dashboard", path: "/dashboard/stock-issuance-dashboard" },
        { title: "Stock Returns", path: "/dashboard/stock-return" },
        { title: "Issue Processing", path: "/dashboard/stock-issuance-processing" },
        { title: "Historical Issuances", path: "/dashboard/issuances" }
      ]
    },
    {
      title: "Approval System",
      icon: CheckCircle,
      path: "/approval",
      hasSubmenu: true,
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
      path: "/reports",
      hasSubmenu: true,
      submenu: [
        { title: "Overview", path: "/reports?tab=overview" },
        { title: "Inventory Report", path: "/reports?tab=inventory" },
        { title: "Transaction Report", path: "/reports?tab=transactions" },
        { title: "Analytics", path: "/reports?tab=analytics" }
      ]
    }
  ];

  // Filter menu items based on limitedMenu prop
  const menuItems = limitedMenu 
    ? allMenuItems.filter(item => 
        item.title === "My Dashboard" || item.title === "Inv. Dashboard"
      )
    : allMenuItems;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isParentActive = (submenu: any[]) => {
    return submenu?.some(item => location.pathname === item.path);
  };

  return (
    <TooltipProvider>
      <Sidebar 
        className="!bg-teal-600 border-r border-teal-500" 
        collapsible="icon"
        style={{ backgroundColor: '#0d9488' }}
      >
      <SidebarHeader className="p-4 border-b border-teal-500 bg-teal-600">
        <div className="flex items-center justify-center h-16">
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img 
              src="/ecp-logo.png"
              alt="ECP Logo" 
              className={state === "collapsed" 
                ? "h-8 w-8 object-contain" 
                : "h-12 w-auto object-contain max-w-full"
              }
            />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4 bg-teal-600">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                if (item.hasSubmenu) {
                  const hasActiveChild = isParentActive(item.submenu);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible defaultOpen={hasActiveChild}>
                        <Tooltip>
                          <TooltipTrigger asChild>
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
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="text-xs z-50"
                            sideOffset={15}
                            avoidCollisions={true}
                          >
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ml-1">- {subItem.title}</span>
                                      </TooltipTrigger>
                                      <TooltipContent 
                                        side="right" 
                                        className="text-xs z-50 ml-2"
                                        sideOffset={10}
                                        avoidCollisions={true}
                                      >
                                        <p>{subItem.title}</p>
                                      </TooltipContent>
                                    </Tooltip>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="text-xs z-50"
                        sideOffset={15}
                        avoidCollisions={true}
                      >
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
};

export default AppSidebar;
