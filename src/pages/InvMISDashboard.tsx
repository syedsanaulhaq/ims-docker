import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package2, 
  Users, 
  ClipboardList, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  Building,
  ShoppingCart,
  Truck,
  Calendar,
  Target,
  Award,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import Layout from '@/components/layout/Layout';
import { invmisApi } from '@/services/invmisApi';

// Types
interface DashboardStats {
  totalItems: number;
  totalUsers: number;
  activeTenders: number;
  pendingDeliveries: number;
  lowStockItems: number;
  totalValue: number;
  monthlyProcurement: number;
  completedTenders: number;
}

interface RecentActivity {
  id: string;
  type: 'tender' | 'delivery' | 'stock' | 'user';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981', 
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  secondary: '#6B7280'
};

const InvMISDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [inventoryData, setInventoryData] = useState<ChartDataPoint[]>([]);
  const [tenderData, setTenderData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard summary
      const summaryResponse = await invmisApi.getDashboardSummary();
      
      // Fetch additional data for charts
      const [usersResponse, itemsResponse, tendersResponse, deliveriesResponse] = await Promise.all([
        invmisApi.getUsers(),
        invmisApi.getItems(),
        invmisApi.getTenders(), 
        invmisApi.getDeliveries()
      ]);

      // Calculate dashboard stats
      const dashboardStats: DashboardStats = {
        totalItems: itemsResponse.length,
        totalUsers: usersResponse.length,
        activeTenders: tendersResponse.filter(t => t.status === 'active').length,
        pendingDeliveries: deliveriesResponse.filter(d => d.status === 'pending').length,
        lowStockItems: itemsResponse.filter(i => i.current_stock <= i.reorder_level).length,
        totalValue: itemsResponse.reduce((sum, item) => sum + (item.current_stock * item.unit_price || 0), 0),
        monthlyProcurement: tendersResponse.reduce((sum, tender) => sum + (tender.total_amount || 0), 0),
        completedTenders: tendersResponse.filter(t => t.status === 'completed').length
      };
      setStats(dashboardStats);

      // Generate chart data
      const categoryData = itemsResponse.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + item.current_stock;
        return acc;
      }, {} as Record<string, number>);

      setInventoryData(
        Object.entries(categoryData).map(([name, value]) => ({ name, value }))
      );

      // Tender status data
      const tenderStatusData = tendersResponse.reduce((acc, tender) => {
        acc[tender.status] = (acc[tender.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setTenderData(
        Object.entries(tenderStatusData).map(([name, value]) => ({ name, value }))
      );

      // Generate sample monthly data (last 6 months)
      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setMonthlyData(
        months.map(month => ({
          name: month,
          value: Math.floor(Math.random() * 100000) + 50000
        }))
      );

      // Generate recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'tender',
          title: 'New Tender Created',
          description: 'Office Supplies Tender #2025-001',
          timestamp: new Date().toISOString(),
          status: 'info'
        },
        {
          id: '2', 
          type: 'delivery',
          title: 'Delivery Completed',
          description: '50 laptops delivered to IT Department',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success'
        },
        {
          id: '3',
          type: 'stock',
          title: 'Low Stock Alert',
          description: 'Printer cartridges below minimum level',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'warning'
        }
      ]);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tender': return ClipboardList;
      case 'delivery': return Truck;
      case 'stock': return Package2;
      case 'user': return Users;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100'; 
      case 'error': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading InvMIS Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">InvMIS Dashboard</h1>
            <p className="text-gray-600 mt-1">Inventory Management & Procurement System</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/reports')}>
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalItems || 0)}</p>
                </div>
                <Package2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+5.2%</span>
                <span className="text-gray-500 ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalUsers || 0)}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">All systems operational</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tenders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeTenders || 0}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="text-gray-600">{stats?.pendingDeliveries || 0} pending deliveries</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalValue || 0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                {(stats?.lowStockItems || 0) > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-red-600">{stats?.lowStockItems} low stock alerts</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-600">Stock levels healthy</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="procurement">Procurement</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Procurement Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Monthly Procurement Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inventory by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package2 className="w-5 h-5" />
                    Inventory by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/inventory')}>
                    <Package2 className="w-6 h-6 mb-2" />
                    <span className="text-xs">Manage Items</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/tenders/create')}>
                    <ClipboardList className="w-6 h-6 mb-2" />
                    <span className="text-xs">New Tender</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/users')}>
                    <Users className="w-6 h-6 mb-2" />
                    <span className="text-xs">User Management</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/reports')}>
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="text-xs">Reports</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/settings')}>
                    <Settings className="w-6 h-6 mb-2" />
                    <span className="text-xs">Settings</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/help')}>
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    <span className="text-xs">Help & Support</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Adequate Stock</span>
                      <Badge variant="secondary">{(stats?.totalItems || 0) - (stats?.lowStockItems || 0)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Low Stock</span>
                      <Badge variant="destructive">{stats?.lowStockItems || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top Categories by Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={inventoryData.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="procurement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tender Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tenderData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {tenderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Procurement Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Total Procurement Value</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(stats?.monthlyProcurement || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Completed Tenders</span>
                      <span className="text-lg font-bold">{stats?.completedTenders || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Active Tenders</span>
                      <span className="text-lg font-bold text-blue-600">{stats?.activeTenders || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent System Activity</CardTitle>
                <CardDescription>Latest updates and changes in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default InvMISDashboard;