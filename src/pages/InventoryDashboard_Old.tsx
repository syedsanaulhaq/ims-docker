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
      // Use the InventoryService - now filters items with proper min/max at database level
      const result = await InventoryService.getInventoryData();
      const inventoryItems = result.data;
      setAllItems(inventoryItems);

      // Calculate extended stats with enhanced low stock detection
      const extendedStats: ExtendedInventoryStats = {
        ...result.stats,
        totalStockQty: inventoryItems.reduce((sum, item) => sum + item.current_stock, 0),
        itemsBelowMinimum: inventoryItems.filter(item => {
          const currentStock = item.current_stock;
          const minLevel = item.minimum_stock_level;
          const reorderLevel = item.reorder_point;
          
          // Enhanced low stock criteria for stats
          return (
            currentStock <= 0 ||                                    // Out of stock
            (reorderLevel > 0 && currentStock <= reorderLevel) ||   // Below reorder point
            (minLevel > 0 && currentStock <= minLevel) ||           // At or below minimum
            (minLevel > 0 && currentStock < (minLevel * 1.2))       // Within 20% of minimum
          );
        }).length,
        itemsNeedingReorder: inventoryItems.filter(item => {
          const currentStock = item.current_stock;
          const reorderLevel = item.reorder_point;
          const minLevel = item.minimum_stock_level;
          
          return (
            currentStock <= 0 ||                                    // Out of stock (urgent)
            (reorderLevel > 0 && currentStock <= reorderLevel) ||   // Below reorder point
            (minLevel > 0 && currentStock <= minLevel)              // At or below minimum
          );
        }).length
      };
      setStats(extendedStats);

      // Set top items by stock quantity (show all items, sorted by stock)
      const topItemsData = inventoryItems
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 10);
      setTopItems(topItemsData);

      // Set low stock items with enhanced criteria (multiple conditions)
      const lowStockData = inventoryItems
        .filter(item => {
          const currentStock = item.current_stock;
          const minLevel = item.minimum_stock_level;
          const reorderLevel = item.reorder_point;
          
          // Multiple low stock criteria
          return (
            currentStock <= 0 ||                                    // Out of stock
            (reorderLevel > 0 && currentStock <= reorderLevel) ||   // Below reorder point
            (minLevel > 0 && currentStock <= minLevel) ||           // At or below minimum
            (minLevel > 0 && currentStock < (minLevel * 1.2))       // Within 20% of minimum (early warning)
          );
        })
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 15); // Show more items for better visibility
      setLowStockItems(lowStockData);

      // Set items needing immediate reorder (more urgent)
      const reorderData = inventoryItems
        .filter(item => {
          const currentStock = item.current_stock;
          const reorderLevel = item.reorder_point;
          const minLevel = item.minimum_stock_level;
          
          return (
            currentStock <= 0 ||                                    // Out of stock (urgent)
            (reorderLevel > 0 && currentStock <= reorderLevel) ||   // Below reorder point
            (minLevel > 0 && currentStock <= minLevel)              // At or below minimum
          );
        })
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 12);
      setReorderItems(reorderData);

    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      
      // Set empty stats on error
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

  // Prepare chart data
  const getStockStatusData = () => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.activeItems, color: '#10B981' },
      { name: 'Low Stock', value: stats.lowStockItems, color: '#F59E0B' },
      { name: 'Out of Stock', value: stats.noStockItems, color: '#EF4444' }
    ].filter(item => item.value > 0); // Only show items with value greater than 0
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
            {/* Stock Levels Chart */}
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
            {/* Low Stock Alert List */}
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

            {/* Reorder Items */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {allItems.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="font-medium text-sm truncate">{item.item_name}</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Stock: {item.current_stock} {item.unit}</div>
                  </div>
                  <Badge 
                    variant={
                      item.status === 'Active' ? 'default' : 
                      item.status === 'Low Stock' ? 'secondary' : 'destructive'
                    }
                    className="text-xs mt-2"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialogs */}
      
      {/* All Items Dialog */}
      <Dialog open={showAllItemsDialog} onOpenChange={setShowAllItemsDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Inventory Items ({allItems.length})
            </DialogTitle>
            <DialogDescription>
              Complete list of all items in your inventory with their current status and stock levels.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {allItems.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="font-medium text-sm mb-2 truncate">{item.item_name}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Current Stock:</span>
                    <span className="font-medium">{item.current_stock} {item.unit}</span>
                  </div>
                  {item.minimum_stock_level > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Minimum Level:</span>
                      <span>{item.minimum_stock_level} {item.unit}</span>
                    </div>
                  )}
                  {item.reorder_point > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Reorder Point:</span>
                      <span>{item.reorder_point} {item.unit}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <Badge 
                      variant={
                        item.status === 'Active' ? 'default' : 
                        item.status === 'Low Stock' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Stock Dialog */}
      <Dialog open={showTotalStockDialog} onOpenChange={setShowTotalStockDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Total Stock Quantities ({formatNumber(stats.totalStockQty)} units)
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of stock quantities by item, sorted from highest to lowest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {allItems
              .sort((a, b) => b.current_stock - a.current_stock)
              .map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.item_name}</div>
                    <div className="text-xs text-gray-600">
                      Unit: {item.unit}
                      {item.minimum_stock_level > 0 && (
                        <span className="ml-4">Min: {item.minimum_stock_level}</span>
                      )}
                      {item.reorder_point > 0 && (
                        <span className="ml-4">Reorder: {item.reorder_point}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(item.current_stock)}</div>
                    <Badge 
                      variant={
                        item.status === 'Active' ? 'default' : 
                        item.status === 'Low Stock' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Inventory Alerts ({stats.itemsNeedingReorder + stats.lowStockItems} total)
            </DialogTitle>
            <DialogDescription>
              Items requiring immediate attention: low stock, out of stock, and reorder alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            
            {/* Critical - Out of Stock */}
            {allItems.filter(item => item.current_stock <= 0).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Critical - Out of Stock ({allItems.filter(item => item.current_stock <= 0).length})
                </h3>
                <div className="space-y-2">
                  {allItems
                    .filter(item => item.current_stock <= 0)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.item_name}</div>
                          <div className="text-xs text-red-600">
                            Stock: {item.current_stock} | Min: {item.minimum_stock_level}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          OUT OF STOCK
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Urgent - Below Reorder Point */}
            {reorderItems.filter(item => item.current_stock > 0).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Urgent - Below Reorder Point ({reorderItems.filter(item => item.current_stock > 0).length})
                </h3>
                <div className="space-y-2">
                  {reorderItems
                    .filter(item => item.current_stock > 0)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.item_name}</div>
                          <div className="text-xs text-orange-600">
                            Current: {item.current_stock} | Reorder at: {item.reorder_point}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                          REORDER NOW
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Warning - Low Stock */}
            {lowStockItems.filter(item => 
              item.current_stock > 0 && 
              !reorderItems.some(r => r.item_id === item.item_id)
            ).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Warning - Low Stock ({lowStockItems.filter(item => 
                    item.current_stock > 0 && 
                    !reorderItems.some(r => r.item_id === item.item_id)
                  ).length})
                </h3>
                <div className="space-y-2">
                  {lowStockItems
                    .filter(item => 
                      item.current_stock > 0 && 
                      !reorderItems.some(r => r.item_id === item.item_id)
                    )
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.item_name}</div>
                          <div className="text-xs text-yellow-600">
                            Current: {item.current_stock} | Min: {item.minimum_stock_level}
                          </div>
                        </div>
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700 text-xs">
                          LOW STOCK
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {stats.itemsNeedingReorder === 0 && stats.lowStockItems === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Alerts!</h3>
                <p>All items are at healthy stock levels.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryDashboard;
