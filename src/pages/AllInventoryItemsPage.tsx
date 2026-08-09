import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  ArrowLeft, 
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  category_id: string;
  category_name: string;
  sub_category_id: string;
  sub_category_name: string;
  unit: string;
  specifications: string;
  description: string;
  status: string;
  current_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  minimum_stock_level: number;
  reorder_point: number;
  maximum_stock_level: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

const AllInventoryItemsPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadItems();
  }, []);

  // Apply filter from URL parameters when items load
  useEffect(() => {
    const categoryId = searchParams.get('category');
    const subCategoryId = searchParams.get('subCategory');
    
    if (categoryId || subCategoryId) {
      // Filter will be applied in filterItems function
    }
  }, [searchParams, items]);

  useEffect(() => {
    filterItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/inventory/current-inventory-stock', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map the response to match our interface
      const mappedData = data.map((item: any) => ({
        id: item.item_master_id,
        item_code: item.item_code,
        item_name: item.nomenclature,
        category_id: item.category_id,
        category_name: item.category_name,
        sub_category_id: item.sub_category_id,
        sub_category_name: item.sub_category_name,
        unit: item.unit || 'N/A',
        specifications: item.specifications || '',
        description: item.description || '',
        status: item.status || 'Active',
        current_quantity: item.current_quantity || 0,
        available_quantity: item.available_quantity || 0,
        reserved_quantity: item.reserved_quantity || 0,
        minimum_stock_level: item.minimum_stock_level || 0,
        reorder_point: item.reorder_point || 0,
        maximum_stock_level: item.maximum_stock_level || 0,
        last_updated: item.last_updated,
        created_at: item.created_at,
        updated_at: item.updated_at || item.last_updated
      }));
      
      setItems(mappedData);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      setError(error instanceof Error ? error.message : 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Check for URL parameters
    const categoryId = searchParams.get('category');
    const subCategoryId = searchParams.get('subCategory');

    // Filter by URL category parameter
    if (categoryId) {
      filtered = filtered.filter(item => item.category_id === categoryId);
    }

    // Filter by URL sub-category parameter
    if (subCategoryId) {
      filtered = filtered.filter(item => item.sub_category_id === subCategoryId);
    }

    // Filter by search term (item code, name, specifications)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_code.toLowerCase().includes(search) ||
        item.item_name.toLowerCase().includes(search) ||
        (item.specifications && item.specifications.toLowerCase().includes(search))
      );
    }

    // Filter by category dropdown (if no URL param)
    if (!categoryId && !subCategoryId && selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_name === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStockStatus = (item: InventoryItem): { label: string; color: string } => {
    const qty = item.current_quantity || 0;
    const reorder = item.reorder_point || 0;
    const max = item.maximum_stock_level || 999999;

    if (qty === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    } else if (qty <= reorder) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    } else if (qty >= max) {
      return { label: 'Overstock', color: 'bg-purple-100 text-purple-800' };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
    }
  };

  // Get unique categories for filter
  const categories = ['all', ...new Set(items.map(item => item.category_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Loading inventory items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Error Loading Inventory</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={loadItems}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
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
            <p className="text-gray-600">
              Complete inventory list ({filteredItems.length} items)
              {searchParams.get('category') && <Badge variant="secondary" className="ml-2">Filtered by Category</Badge>}
              {searchParams.get('subCategory') && <Badge variant="secondary" className="ml-2">Filtered by Sub-Category</Badge>}
            </p>
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
                  placeholder="Search by item code, name, or specifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items found</p>
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search criteria</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Item Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{item.item_name}</h3>
                            <Badge variant="outline" className={stockStatus.color}>
                              {stockStatus.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Code: {item.item_code} | Category: {item.category_name || 'Uncategorized'}
                          </p>
                        </div>
                      </div>

                      {/* Item Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-xs text-gray-500">Current Quantity</p>
                          <p className="font-semibold text-lg">{formatNumber(item.current_quantity)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Available</p>
                          <p className="font-semibold text-green-600">{formatNumber(item.available_quantity)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reserved</p>
                          <p className="font-semibold text-orange-600">{formatNumber(item.reserved_quantity)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unit</p>
                          <p className="font-semibold">{item.unit || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Stock Levels */}
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-gray-500">Minimum Level</p>
                          <p className="text-sm font-medium">{formatNumber(item.minimum_stock_level)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reorder Point</p>
                          <p className="text-sm font-medium">{formatNumber(item.reorder_point)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Maximum Level</p>
                          <p className="text-sm font-medium">{formatNumber(item.maximum_stock_level)}</p>
                        </div>
                      </div>

                      {/* Specifications */}
                      {item.specifications && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500">Specifications</p>
                          <p className="text-sm text-gray-700">{item.specifications}</p>
                        </div>
                      )}

                      {/* Description */}
                      {item.description && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500">Description</p>
                          <p className="text-sm text-gray-700">{item.description}</p>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-3 border-t text-xs text-gray-500">
                        <span>Last Updated: {formatDate(item.last_updated)}</span>
                        <span>Created: {formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllInventoryItemsPage;
