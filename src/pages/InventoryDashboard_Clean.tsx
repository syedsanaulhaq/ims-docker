import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  AlertTriangle, 
  BarChart3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Eye,
  Filter,
  ExternalLink
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { InventoryService, type InventoryItem, type InventoryStats } from '@/services/inventoryService';

interface ExtendedInventoryStats extends InventoryStats {
  totalStockQty: number;
  itemsBelowMinimum: number;
  itemsNeedingReorder: number;
}

const InventoryDashboard: React.FC = () => {
  const [stats, setStats] = useState<ExtendedInventoryStats | null>(null);
  const [topItems, setTopItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [reorderItems, setReorderItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await InventoryService.getInventoryData();
      const inventoryItems = result.data;
      setAllItems(inventoryItems);

      const extendedStats: ExtendedInventoryStats = {
        ...result.stats,
        totalStockQty: inventoryItems.reduce((sum, item) => sum + item.current_stock, 0),
        itemsBelowMinimum: inventoryItems.filter(item => {
          const currentStock = item.current_stock;
          const minLevel = item.minimum_stock_level;
          const reorderLevel = item.reorder_point;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel) ||
            (minLevel > 0 && currentStock < (minLevel * 1.2))
          );
        }).length,
        itemsNeedingReorder: inventoryItems.filter(item => {
          const currentStock = item.current_stock;
          const reorderLevel = item.reorder_point;
          const minLevel = item.minimum_stock_level;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel)
          );
        }).length
      };
      setStats(extendedStats);

      const topItemsData = inventoryItems
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 10);
      setTopItems(topItemsData);

      const lowStockData = inventoryItems
        .filter(item => {
          const currentStock = item.current_stock;
          const minLevel = item.minimum_stock_level;
          const reorderLevel = item.reorder_point;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel) ||
            (minLevel > 0 && currentStock < (minLevel * 1.2))
          );
        })
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 15);
      setLowStockItems(lowStockData);

      const reorderData = inventoryItems
        .filter(item => {
          const currentStock = item.current_stock;
          const reorderLevel = item.reorder_point;
          const minLevel = item.minimum_stock_level;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel)
          );
        })
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 12);
      setReorderItems(reorderData);

    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      
      setStats({
        totalItems: 0,
        totalValue: 0,
        activeItems: 0,
        lowStockItems: 0,
        noStockItems: 0,
        totalStockQty: 0,
        itemsBelowMinimum: 0,
        itemsNeedingReorder: 0
      });
      setTopItems([]);
      setLowStockItems([]);
      setReorderItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-8 h-8 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600 mb-4">No inventory data available</p>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStockStatusData = () => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.activeItems, color: '#10B981' },
      { name: 'Low Stock', value: stats.lowStockItems, color: '#F59E0B' },
      { name: 'Out of Stock', value: stats.noStockItems, color: '#EF4444' }
    ].filter(item => item.value > 0);
  };

  const getTopItemsChartData = () => {
    return topItems.slice(0, 10).map(item => ({
      name: item.item_name.length > 15 ? item.item_name.substring(0, 15) + '...' : item.item_name,
      stock: item.current_stock
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-1">Visual inventory analytics and insights</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Items Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/inventory/all-items')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Total Items
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalItems)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeItems} active items
            </p>
          </CardContent>
        </Card>

        {/* Total Qty Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/inventory/stock-quantities')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Total Qty
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalStockQty)}</div>
            <p className="text-xs text-muted-foreground">
              Units in inventory
            </p>
          </CardContent>
        </Card>

        {/* Alerts Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/inventory/alerts')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Alerts
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.itemsNeedingReorder}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Stock Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getStockStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getStockStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Items Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Items by Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getTopItemsChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="stock" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock-levels" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Stock Levels Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTopItemsChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} units`, 'Stock']}
                    />
                    <Legend />
                    <Bar dataKey="stock" fill="#10B981" name="Stock" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Low Stock Alerts ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {lowStockItems.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">{item.item_name}</div>
                        <div className="text-xs text-gray-600">
                          Current: {item.current_stock} | Min: {item.minimum_stock_level}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No low stock alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Reorder Required ({reorderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {reorderItems.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">{item.item_name}</div>
                        <div className="text-xs text-gray-600">
                          Stock: {item.current_stock} | Reorder at: {item.reorder_point}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        Urgent
                      </Badge>
                    </div>
                  ))}
                  {reorderItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No urgent reorders</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Quick View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button 
              variant={showAllItems ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowAllItems(!showAllItems)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showAllItems ? 'Hide' : 'Show'} All Items ({allItems.length})
            </Button>
          </div>
          
          {showAllItems && (
            <div className="space-y-2">
              {allItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{item.item_name}</div>
                    <div className="text-sm text-gray-600">
                      Stock: {item.current_stock} {item.unit}
                    </div>
                  </div>
                  <Badge 
                    variant={
                      item.status === 'Active' ? 'default' : 
                      item.status === 'Low Stock' ? 'secondary' : 'destructive'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;
