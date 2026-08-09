import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  ArrowLeft, 
  Search,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { InventoryService, type InventoryItem } from '@/services/inventoryService';

const StockQuantitiesPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchTerm, sortOrder]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await InventoryService.getInventoryData();
      setItems(result.data);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by current stock
    filtered = filtered.sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.current_stock - a.current_stock
        : a.current_stock - b.current_stock;
    });

    setFilteredItems(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getTotalStockQuantity = (): number => {
    return filteredItems.reduce((total, item) => total + item.current_stock, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/inventory-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Stock Quantities
            </h1>
            <p className="text-gray-600">Total stock breakdown by item</p>
          </div>
        </div>
        <Button onClick={loadItems} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(filteredItems.length)}</div>
            <p className="text-xs text-muted-foreground">items tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(getTotalStockQuantity())}</div>
            <p className="text-xs text-muted-foreground">units in stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Quantities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stock Quantities</span>
            <Badge variant="outline">{filteredItems.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-10 gap-4 py-3 border-b font-medium text-sm text-gray-600">
              <div className="col-span-5">Item Name</div>
              <div className="col-span-2">Current Stock</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-2">Status</div>
            </div>

            {/* Items */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items found matching your criteria</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-10 gap-4 py-4 border-b hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-5">
                    <div className="font-medium">{item.item_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Acquired: {formatNumber(item.total_acquired)} | Issued: {formatNumber(item.total_issued)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xl font-bold">
                      {formatNumber(item.current_stock)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-gray-600">{item.unit}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge 
                      variant={
                        item.status === 'Active' ? 'default' : 
                        item.status === 'Low Stock' ? 'secondary' : 'destructive'
                      }
                    >
                      {item.status === 'Active' ? 'Available in Stock' : item.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockQuantitiesPage;
