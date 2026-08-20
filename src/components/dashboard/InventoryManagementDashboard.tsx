import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Truck,
  Database,
  Activity,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = '';

interface InventoryStats {
  inventory: {
    total_items: number;
    total_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    low_stock_items: number;
    out_of_stock_items: number;
    overstock_items: number;
  };
  movements: {
    issues_last_month: number;
    returns_last_month: number;
    total_issued_last_month: number;
    total_returned_last_month: number;
  };
  categories: {
    total_categories: number;
    total_subcategories: number;
  };
}

interface TopMovingItem {
  nomenclature: string;
  total_issued: number;
  total_returned: number;
  current_quantity: number;
}

interface LowStockAlert {
  nomenclature: string;
  current_quantity: number;
  reorder_level: number;
  minimum_stock_level: number;
  category_name: string;
  unit: string;
}

interface StockItem {
  nomenclature: string;
  category_name: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  current_quantity: number;
  unit: string;
  stock_status: string;
}

interface MovementRecord {
  nomenclature: string;
  transaction_type: string;
  movement_type: string;
  quantity: number;
  transaction_date: string;
  movement_date: string;
  office_name?: string;
  reference_number?: string;
  unit: string;
}

interface DashboardData {
  stats: InventoryStats;
  top_moving_items: TopMovingItem[];
  low_stock_alerts: LowStockAlert[];
}

const InventoryManagementDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [currentStock, setCurrentStock] = useState<StockItem[]>([]);
  const [movementHistory, setMovementHistory] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [dashboardRes, stockRes, movementRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/inventory/dashboard-stats`),
        fetch(`${API_BASE_URL}/api/inventory/current-stock`),
        fetch(`${API_BASE_URL}/api/inventory/movements?limit=20`)
      ]);

      if (!dashboardRes.ok || !stockRes.ok || !movementRes.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const [dashboardJson, stockJson, movementJson] = await Promise.all([
        dashboardRes.json(),
        stockRes.json(),
        movementRes.json()
      ]);

      setDashboardData(dashboardJson);
      setCurrentStock(stockJson.data || []);
      setMovementHistory(movementJson.data || []);

    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const stockStatusData = [
    {
      name: 'Normal Stock',
      value: currentStock.filter(item => item.stock_status === 'Normal').length,
      color: '#00C49F'
    },
    {
      name: 'Low Stock',
      value: dashboardData?.stats?.inventory?.low_stock_items || 0,
      color: '#FFBB28'
    },
    {
      name: 'Out of Stock',
      value: dashboardData?.stats?.inventory?.out_of_stock_items || 0,
      color: '#FF8042'
    },
    {
      name: 'Overstock',
      value: dashboardData?.stats?.inventory?.overstock_items || 0,
      color: '#8884D8'
    }
  ];

  const movementData = dashboardData?.top_moving_items?.slice(0, 6).map(item => ({
    name: item.nomenclature.substring(0, 20) + '...',
    issued: item.total_issued,
    returned: item.total_returned,
    current: item.current_quantity
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time inventory overview and analytics</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {dashboardData?.stats?.inventory?.total_items || 0}
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Total Quantity: {dashboardData?.stats?.inventory?.total_quantity?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Available Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {dashboardData?.stats?.inventory?.available_quantity?.toLocaleString() || 0}
            </div>
            <p className="text-sm text-green-600 mt-1">
              Reserved: {dashboardData?.stats?.inventory?.reserved_quantity?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {dashboardData?.stats?.inventory?.low_stock_items || 0}
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Out of Stock: {dashboardData?.stats?.inventory?.out_of_stock_items || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Activity className="h-5 w-5" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {dashboardData?.stats?.movements?.issues_last_month || 0}
            </div>
            <p className="text-sm text-purple-600 mt-1">
              Issues This Month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Stock Status Distribution
            </CardTitle>
            <CardDescription>Current inventory status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Moving Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Moving Items
            </CardTitle>
            <CardDescription>Most active items in the last 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="issued" fill="#8884d8" name="Issued" />
                  <Bar dataKey="returned" fill="#82ca9d" name="Returned" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="low-stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="recent-movements">Recent Movements</TabsTrigger>
          <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.low_stock_alerts?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.nomenclature}</h4>
                      <p className="text-sm text-gray-600">{item.category_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {item.current_quantity} {item.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        Min: {item.minimum_stock_level}
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No low stock alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent-movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Activity className="h-5 w-5" />
                Recent Stock Movements
              </CardTitle>
              <CardDescription>Latest inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movementHistory?.map((movement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-semibold text-gray-900">{movement.nomenclature}</h4>
                      <p className="text-sm text-gray-600">
                        {movement.movement_type} - {new Date(movement.movement_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {movement.quantity} {movement.unit}
                      </div>
                      <Badge 
                        variant={movement.movement_type === 'Issue' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {movement.movement_type}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No recent movements</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Package className="h-5 w-5" />
                Current Stock Overview
              </CardTitle>
              <CardDescription>All items in inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentStock?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.nomenclature}</h4>
                      <p className="text-sm text-gray-600">{item.category_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {item.current_quantity} {item.unit}
                      </div>
                      <Badge 
                        variant={
                          item.stock_status === 'Normal' ? 'default' :
                          item.stock_status === 'Low Stock' ? 'destructive' :
                          item.stock_status === 'Out of Stock' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {item.stock_status}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No stock data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManagementDashboard;

