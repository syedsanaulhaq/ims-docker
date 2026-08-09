import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Save, CheckCircle, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CurrentStockItem {
  id: string;
  item_master_id: string;
  nomenclature: string;
  item_code: string;
  category_name: string;
  unit: string;
  current_quantity: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  specifications?: string;
}

interface UpdatedStock {
  item_master_id: string;
  new_quantity: number;
  notes: string;
}

const InitialSetupFresh: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [stockItems, setStockItems] = useState<CurrentStockItem[]>([]);
  const [updatedStocks, setUpdatedStocks] = useState<UpdatedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<CurrentStockItem[]>([]);

  // Load data on component mount
  useEffect(() => {
    fetchCurrentStock();
  }, []);

  // Filter items when search changes
  useEffect(() => {
    const filtered = stockItems.filter(item => 
      item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, stockItems]);

  const fetchCurrentStock = async () => {
    try {
      setLoading(true);
      // First try to get current stock, if that fails, get item masters
      let stockResponse;
      try {
        stockResponse = await fetch('http://localhost:3001/api/inventory/current-stock-detailed');
        if (!stockResponse.ok) {
          throw new Error('Current stock detailed endpoint not available');
        }
        const stockData = await stockResponse.json();
        if (stockData.length > 0) {
          setStockItems(stockData);
          setFilteredItems(stockData);
          
          // Initialize updated stocks with current quantities
          const initialUpdates = stockData.map((item: CurrentStockItem) => ({
            item_master_id: item.item_master_id,
            new_quantity: item.current_quantity,
            notes: `Updated quantity for ${item.nomenclature}`
          }));
          setUpdatedStocks(initialUpdates);
          return;
        }
      } catch (error) {
        }
      
      // Fallback: Get item masters and create CurrentStock entries
      const [itemMastersResponse, categoriesResponse] = await Promise.all([
        fetch('http://localhost:3001/api/item-masters'),
        fetch('http://localhost:3001/api/categories')
      ]);
      
      if (!itemMastersResponse.ok) {
        throw new Error('Failed to fetch item masters');
      }
      
      const itemMasters = await itemMastersResponse.json();
      const categories = await categoriesResponse.json();
      
      // Create a mapping of category IDs to names
      const categoryMap = categories.reduce((map: any, cat: any) => {
        map[cat.id] = cat.category_name;
        return map;
      }, {});
      
      // Transform item masters to look like current stock items
      const transformedItems = itemMasters.map((item: any) => ({
        id: item.id,
        item_master_id: item.id,
        nomenclature: item.nomenclature,
        item_code: item.item_code || 'N/A',
        category_name: categoryMap[item.category_id] || 'Unknown',
        unit: item.unit,
        current_quantity: 0, // Start with 0 for initial setup
        minimum_stock_level: item.minimum_stock_level || 0,
        maximum_stock_level: item.maximum_stock_level || 0,
        specifications: item.specifications
      }));
      
      setStockItems(transformedItems);
      setFilteredItems(transformedItems);
      
      // Initialize updated stocks with 0 quantities for initial setup
      const initialUpdates = transformedItems.map((item: CurrentStockItem) => ({
        item_master_id: item.item_master_id,
        new_quantity: 0,
        notes: `Initial setup for ${item.nomenclature}`
      }));
      setUpdatedStocks(initialUpdates);
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (itemMasterId: string, newQuantity: number) => {
    setUpdatedStocks(prev => 
      prev.map(stock => 
        stock.item_master_id === itemMasterId 
          ? { ...stock, new_quantity: Math.max(0, newQuantity) }
          : stock
      )
    );
  };

  const updateNotes = (itemMasterId: string, notes: string) => {
    setUpdatedStocks(prev => 
      prev.map(stock => 
        stock.item_master_id === itemMasterId 
          ? { ...stock, notes }
          : stock
      )
    );
  };

  const saveUpdatedStock = async () => {
    try {
      setSaving(true);
      
      // Only send items that have quantities > 0 for initial setup
      const itemsToSave = updatedStocks.filter(updated => updated.new_quantity > 0);
      
      if (itemsToSave.length === 0) {
        toast({
          title: "No Quantities Set",
          description: "Please set quantities for at least one item",
          variant: "default"
        });
        return;
      }

      // Try the update endpoint first, if it fails, use initial setup endpoint
      let response;
      try {
        response = await fetch('http://localhost:3001/api/inventory/update-stock-quantities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: itemsToSave,
            updated_by: 'System Administrator',
            update_date: new Date().toISOString()
          }),
        });
      } catch (error) {
        // Fallback to initial setup endpoint
        const initialStocks = itemsToSave.map(item => ({
          ItemMasterID: item.item_master_id,
          quantity: item.new_quantity,
          notes: item.notes
        }));
        
        response = await fetch('http://localhost:3001/api/inventory/initial-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initialStocks: initialStocks,
            setupDate: new Date().toISOString(),
            setupBy: 'System Administrator'
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: `Initial setup completed for ${itemsToSave.length} items`,
      });

      // Refresh the data to show updated values
      await fetchCurrentStock();
      
    } catch (error) {
      console.error('❌ Error saving stock quantities:', error);
      toast({
        title: "Error",
        description: "Failed to save initial stock setup",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (item: CurrentStockItem, updatedQuantity: number) => {
    if (updatedQuantity === 0) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Out of Stock
        </Badge>
      );
    }
    
    if (updatedQuantity < item.minimum_stock_level) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Below Min
        </Badge>
      );
    }
    
    if (updatedQuantity > item.maximum_stock_level) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          Above Max
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="text-xs bg-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Normal
      </Badge>
    );
  };

  const changedItemsCount = updatedStocks.filter(updated => updated.new_quantity > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-lg text-gray-600">Loading current stock data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Initial Stock Setup</h1>
          <p className="text-gray-600 mt-2">
            Review and update current stock quantities from the CurrentStock table. Make adjustments as needed for accurate inventory tracking.
          </p>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span>Stock Overview</span>
            </CardTitle>
            <CardDescription>
              Current inventory status and pending changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stockItems.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{filteredItems.filter(item => item.current_quantity > 0).length}</div>
                <div className="text-sm text-gray-600">In Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{filteredItems.filter(item => item.current_quantity === 0).length}</div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{changedItemsCount}</div>
                <div className="text-sm text-gray-600">Pending Changes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by item name, code, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={fetchCurrentStock} 
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stock Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Items ({filteredItems.length})</CardTitle>
            <CardDescription>
              Review and update quantities for each item from the CurrentStock table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Item Details</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Min/Max</TableHead>
                    <TableHead className="w-[120px]">New Quantity</TableHead>
                    <TableHead className="w-[200px]">Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const updatedStock = updatedStocks.find(s => s.item_master_id === item.item_master_id);
                    const hasQuantity = updatedStock && updatedStock.new_quantity > 0;
                    
                    return (
                      <TableRow key={item.id} className={hasQuantity ? 'bg-green-50' : ''}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{item.nomenclature}</div>
                            {item.specifications && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {item.specifications}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.item_code || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.category_name}</TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-sm">
                            {item.current_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                            Min: {item.minimum_stock_level}<br/>
                            Max: {item.maximum_stock_level}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={updatedStock?.new_quantity || 0}
                            onChange={(e) => updateQuantity(item.item_master_id, parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={`w-24 text-center ${hasQuantity ? 'border-green-400 bg-green-50' : ''}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={updatedStock?.notes || ''}
                            onChange={(e) => updateNotes(item.item_master_id, e.target.value)}
                            placeholder="Setup notes"
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item, updatedStock?.new_quantity || 0)}
                          {hasQuantity && (
                            <Badge variant="outline" className="ml-1 text-xs border-green-500 text-green-600">
                              Set
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'No items match your search criteria' : 'No stock items found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {changedItemsCount > 0 ? (
                  <span className="text-green-600 font-medium">
                    {changedItemsCount} item{changedItemsCount !== 1 ? 's' : ''} ready for initial setup
                  </span>
                ) : (
                  <span>Set quantities for items to create initial stock</span>
                )}
              </div>
              <Button
                onClick={saveUpdatedStock}
                disabled={saving || changedItemsCount === 0}
                className="min-w-[150px]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Setup Initial Stock ({changedItemsCount})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InitialSetupFresh;