import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw,
  Calendar,
  Activity,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface InventoryItem {
  id: string;
  item_master_id: string;
  current_quantity: number;
  last_transaction_date: string;
  last_transaction_type: string;
  last_updated: string;
  nomenclature: string;
  item_code: string;
  unit: string;
  specifications: string | null;
  category_name: string;
  category_description: string | null;
}

interface InventorySummary {
  total_items: number;
  total_quantity: number;
  total_categories: number;
  low_stock_items: number;
  total_acquisitions: number;
  last_updated: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const InventoryDashboard: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiGet = (url: string) => fetch(url, { credentials: 'include' });

      // Fetch summary stats
      const summaryResponse = await apiGet(`${import.meta.env.VITE_API_URL}/api/inventory/current-stock/summary`);
      if (summaryResponse.status === 403) {
        throw new Error('You are not authorized to view central inventory dashboard. Please use your assigned inventory view.');
      }
      if (!summaryResponse.ok) throw new Error('Failed to fetch summary');
      const summaryData = await summaryResponse.json();
      setSummary(summaryData.summary);

      // Fetch inventory items
      const inventoryResponse = await apiGet(`${import.meta.env.VITE_API_URL}/api/inventory/current-stock`);
      if (!inventoryResponse.ok) throw new Error('Failed to fetch inventory');
      const inventoryData = await inventoryResponse.json();
      setInventory(inventoryData.inventory || []);

    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      toast({
        title: "Error",
        description: error.message || 'Failed to load dashboard data',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
    toast({
      title: "Refreshed",
      description: "Inventory data has been updated",
    });
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Category-wise distribution for pie chart
  const categoryDistribution = inventory.reduce((acc, item) => {
    const category = item.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { name: category, value: 0 };
    }
    acc[category].value += item.current_quantity;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);

  const pieChartData = Object.values(categoryDistribution);

  // Top 10 items by quantity for bar chart
  const topItemsData = [...inventory]
    .sort((a, b) => b.current_quantity - a.current_quantity)
    .slice(0, 10)
    .map(item => ({
      name: item.item_code,
      quantity: item.current_quantity,
      fullName: item.nomenclature
    }));

  // Stock status distribution
  const stockStatusData = [
    { name: 'In Stock', value: inventory.filter(i => i.current_quantity >= 10).length, color: '#10b981' },
    { name: 'Low Stock', value: inventory.filter(i => i.current_quantity > 0 && i.current_quantity < 10).length, color: '#f59e0b' },
    { name: 'Out of Stock', value: inventory.filter(i => i.current_quantity === 0).length, color: '#ef4444' },
  ];

  // Low stock items
  const lowStockItems = inventory.filter(item => item.current_quantity < 10 && item.current_quantity > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600 text-lg">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 mb-4 text-lg">{error}</p>
          <Button onClick={handleRefresh} size="lg">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time inventory analytics from purchase/supply order deliveries</p>
          {summary && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Last updated: {formatDate(summary.last_updated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/dashboard/inventory-stock-quantities')} size="sm">
            View Details <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{summary.total_items}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique items in inventory</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{summary.total_quantity}</div>
              <p className="text-xs text-muted-foreground mt-1">Total units in stock</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{summary.low_stock_items}</div>
              <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Acquisitions</CardTitle>
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{summary.total_acquisitions}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed deliveries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Items by Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItemsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{payload[0].payload.fullName}</p>
                          <p className="text-sm text-gray-600">Code: {payload[0].payload.name}</p>
                          <p className="text-blue-600 font-bold">Quantity: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="quantity" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stockStatusData.map((status, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-medium">{status.name}</span>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: status.color }}>
                    {status.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No low stock items ✓</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded border border-yellow-200">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nomenclature}</p>
                      <p className="text-xs text-gray-500">{item.item_code}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-semibold">
                      {item.current_quantity}
                    </span>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <Button 
                    variant="link" 
                    className="w-full"
                    onClick={() => navigate('/dashboard/inventory-stock-quantities')}
                  >
                    View all {lowStockItems.length} low stock items →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/dashboard/purchase-orders')}
            >
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold">Purchase/Supply Orders</div>
                <div className="text-xs text-gray-500">Manage POs & Deliveries</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/dashboard/inventory-stock-quantities')}
            >
              <Activity className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <div className="font-semibold">View Stock Details</div>
                <div className="text-xs text-gray-500">Complete inventory list</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/dashboard/item-master')}
            >
              <Package className="h-8 w-8 text-purple-600" />
              <div className="text-center">
                <div className="font-semibold">Item Master</div>
                <div className="text-xs text-gray-500">Manage item catalog</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;
