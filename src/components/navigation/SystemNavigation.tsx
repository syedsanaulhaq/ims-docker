import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Truck,
  BarChart3,
  Settings,
  Database,
  Activity,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Plus
} from 'lucide-react';

interface NavigationItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  color: string;
  actions?: Array<{
    label: string;
    path: string;
    icon: React.ReactNode;
  }>;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    description: 'Overview of your inventory management system',
    icon: <LayoutDashboard className="h-6 w-6" />,
    path: '/dashboard',
    color: 'blue',
    actions: [
      { label: 'View Analytics', path: '/dashboard', icon: <BarChart3 className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Vendor Management',
    description: 'Manage vendors and supplier information',
    icon: <Users className="h-6 w-6" />,
    path: '/vendors',
    color: 'green',
    actions: [
      { label: 'Add Vendor', path: '/vendors/new', icon: <Plus className="h-4 w-4" /> },
      { label: 'View All', path: '/vendors', icon: <Users className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Tender Management',
    description: 'Create and manage procurement tenders',
    icon: <FileText className="h-6 w-6" />,
    path: '/tenders',
    color: 'purple',
    actions: [
      { label: 'New Tender', path: '/tenders/new', icon: <Plus className="h-4 w-4" /> },
      { label: 'View Tenders', path: '/tenders', icon: <FileText className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Stock Transactions',
    description: 'Manage stock acquisitions and transactions',
    icon: <Database className="h-6 w-6" />,
    path: '/stock-transactions',
    color: 'orange',
    badge: 'Core',
    actions: [
      { label: 'Transaction Manager', path: '/dashboard/transaction-manager', icon: <Activity className="h-4 w-4" /> },
      { label: 'Dashboard', path: '/stock-transactions', icon: <BarChart3 className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Item Masters',
    description: 'Manage master item catalog and categories',
    icon: <Package className="h-6 w-6" />,
    path: '/item-masters',
    color: 'indigo',
    actions: [
      { label: 'Add Item', path: '/item-masters/new', icon: <Plus className="h-4 w-4" /> },
      { label: 'Categories', path: '/categories', icon: <Package className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Delivery Management',
    description: 'Track and manage deliveries and acquisitions',
    icon: <Truck className="h-6 w-6" />,
    path: '/deliveries',
    color: 'cyan',
    actions: [
      { label: 'New Delivery', path: '/deliveries/new', icon: <Plus className="h-4 w-4" /> },
      { label: 'Track Deliveries', path: '/deliveries', icon: <Truck className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Inventory Dashboard',
    description: 'Real-time inventory status and stock levels',
    icon: <TrendingUp className="h-6 w-6" />,
    path: '/inventory',
    color: 'emerald',
    actions: [
      { label: 'Current Stock', path: '/inventory/current-stock', icon: <Package className="h-4 w-4" /> },
      { label: 'Analytics', path: '/inventory', icon: <BarChart3 className="h-4 w-4" /> }
    ]
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate reports and view system analytics',
    icon: <BarChart3 className="h-6 w-6" />,
    path: '/reports',
    color: 'rose',
    actions: [
      { label: 'View Reports', path: '/reports', icon: <BarChart3 className="h-4 w-4" /> }
    ]
  }
];

const workflowItems = [
  {
    title: 'Tender → Stock Transaction',
    description: 'Create stock transactions from tender items',
    path: '/dashboard/transaction-manager',
    icon: <ArrowRight className="h-4 w-4" />,
    color: 'blue'
  },
  {
    title: 'Stock → Delivery',
    description: 'Create deliveries from stock transactions',
    path: '/workflows/stock-to-delivery',
    icon: <ArrowRight className="h-4 w-4" />,
    color: 'green'
  },
  {
    title: 'Real-time Inventory',
    description: 'Track inventory levels in real-time',
    path: '/workflows/inventory-tracking',
    icon: <Activity className="h-4 w-4" />,
    color: 'purple'
  }
];

export const SystemNavigation: React.FC = () => {
  const location = useLocation();

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Inventory Management System</h1>
        <p className="text-xl text-muted-foreground">
          Complete solution for procurement, stock management, and inventory tracking
        </p>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Database className="h-3 w-3 mr-1" />
            SQL Server Connected
          </Badge>
        </div>
      </div>

      {/* Main Navigation Cards */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Main Modules</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {navigationItems.map((item, index) => (
            <Card 
              key={index} 
              className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${
                isActivePath(item.path) 
                  ? `border-l-${item.color}-500 bg-${item.color}-50` 
                  : `border-l-${item.color}-200`
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`text-${item.color}-500`}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="text-sm">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {item.actions?.map((action, actionIndex) => (
                    <Link key={actionIndex} to={action.path}>
                      <Button 
                        variant={actionIndex === 0 ? "default" : "outline"} 
                        size="sm" 
                        className="w-full justify-start"
                      >
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Workflow Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Key Workflows</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {workflowItems.map((workflow, index) => (
            <Link key={index} to={workflow.path}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`text-${workflow.color}-500`}>
                      {workflow.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{workflow.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/tenders/new">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Tender
            </Button>
          </Link>
          <Link to="/dashboard/transaction-manager">
            <Button className="w-full justify-start" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Stock Acquisition
            </Button>
          </Link>
          <Link to="/deliveries/new">
            <Button className="w-full justify-start" variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              New Delivery
            </Button>
          </Link>
          <Link to="/reports">
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">System Information</h3>
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <div>
            <span className="text-muted-foreground">Database Schema:</span>
            <span className="ml-2 font-medium">Complete</span>
          </div>
          <div>
            <span className="text-muted-foreground">API Services:</span>
            <span className="ml-2 font-medium">9 Active</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="ml-2 font-medium">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemNavigation;
