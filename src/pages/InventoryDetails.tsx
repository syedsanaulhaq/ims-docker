import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  Package, 
  AlertTriangle, 
  ArrowLeft,
  Database,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
  Search,
  Filter,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { invmisApi } from '@/services/invmisApi';

const InventoryDetails = () => {
  const navigate = useNavigate();
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low-stock, out-of-stock

  // Fetch inventory data from the correct API endpoint
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setDataLoading(true);
        // Use the same endpoint as the main dashboard
        const response = await fetch('http://localhost:3001/api/inventory-stock');
        
        if (response.ok) {
          const data = await response.json();
          setInventoryStock(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to fetch inventory data:', response.statusText);
          setInventoryStock([]);
        }
      } catch (error) {
        console.error('Error fetching inventory data:', error);
        setInventoryStock([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  // Filter and search inventory items
  const filteredItems = inventoryStock.filter(item => {
    const matchesSearch = item.item_name?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'low-stock') {
      return matchesSearch && item.current_quantity <= item.minimum_stock_level && item.minimum_stock_level > 0;
    } else if (filterType === 'out-of-stock') {
      return matchesSearch && item.current_quantity === 0;
    }
    
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: inventoryStock.length,
    lowStock: inventoryStock.filter(item => 
      item.current_quantity <= item.minimum_stock_level && item.minimum_stock_level > 0
    ).length,
    outOfStock: inventoryStock.filter(item => item.current_quantity === 0).length,
    inStock: inventoryStock.filter(item => 
      item.current_quantity > 0 && 
      (item.minimum_stock_level === 0 || item.current_quantity > item.minimum_stock_level)
    ).length
  };

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-4">
            Inventory Details
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Comprehensive view of all inventory items and stock levels
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Live Data Connected
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {filteredItems.length} of {stats.total} Items
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-700">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-700">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.inStock}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-yellow-700">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-700">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by item name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All Items
              </Button>
              <Button
                variant={filterType === 'low-stock' ? 'default' : 'outline'}
                onClick={() => setFilterType('low-stock')}
                size="sm"
              >
                Low Stock
              </Button>
              <Button
                variant={filterType === 'out-of-stock' ? 'default' : 'outline'}
                onClick={() => setFilterType('out-of-stock')}
                size="sm"
              >
                Out of Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items ({filteredItems.length})
          </CardTitle>
          <CardDescription>
            Detailed view of all inventory items with current stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No items found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Item Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Item Name</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Current Stock</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Last Updated</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="p-3 font-medium text-gray-900">{item.item_code || 'N/A'}</td>
                      <td className="p-3 text-gray-900">{item.item_name || 'Unknown Item'}</td>
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${
                          item.current_quantity === 0 ? 'text-red-600' :
                          (item.minimum_stock_level > 0 && item.current_quantity <= item.minimum_stock_level) ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.current_quantity || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant={
                            item.current_quantity === 0 ? 'destructive' :
                            (item.minimum_stock_level > 0 && item.current_quantity <= item.minimum_stock_level) ? 'secondary' : 
                            'default'
                          }
                          className="inline-flex items-center gap-1"
                        >
                          {item.current_quantity === 0 ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              Out of Stock
                            </>
                          ) : (item.minimum_stock_level > 0 && item.current_quantity <= item.minimum_stock_level) ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              In Stock
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600 text-sm">
                        {item.last_updated ? formatDateDMY(item.last_updated) : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => navigate(`/dashboard/item-details/${item.id}`)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDetails;
