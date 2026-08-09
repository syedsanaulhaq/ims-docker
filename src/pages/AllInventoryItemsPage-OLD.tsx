import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  ArrowLeft, 
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { InventoryService, type InventoryItem } from '@/services/inventoryService';

const AllInventoryItemsPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedStatus]);

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

  const filterItems = () => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    setFilteredItems(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Active', label: 'Available in Stock' },
  ];

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
              <Package className="h-6 w-6" />
              All Inventory Items
            </h1>
            <p className="text-gray-600">Complete inventory list ({filteredItems.length} items)</p>
          </div>
        </div>
        <Button onClick={loadItems} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Inventory Items</span>
            <Badge variant="outline">{filteredItems.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-10 gap-4 py-3 border-b font-medium text-sm text-gray-600">
              <div className="col-span-4">Item Name</div>
              <div className="col-span-2">Current Stock</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Last Updated</div>
            </div>

            {/* Items */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items found matching your criteria</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-10 gap-4 py-3 border-b hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-4">
                    <div className="font-medium">{item.item_name}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {item.item_id}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="font-medium text-lg">
                      {formatNumber(item.current_stock)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-gray-600">{item.unit}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge 
                      variant={
                        item.status === 'Active' ? 'default' : 'secondary'
                      }
                    >
                      {item.status === 'Active' ? 'Available in Stock' : item.status}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500">
                      {new Date(item.last_movement_date).toLocaleDateString()}
                    </span>
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

export default AllInventoryItemsPage;
