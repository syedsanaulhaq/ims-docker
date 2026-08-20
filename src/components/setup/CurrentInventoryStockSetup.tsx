import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, Package, RefreshCw, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CurrentInventoryStock {
  item_master_id: string;
  item_code: string;
  nomenclature: string;
  category_name: string;
  sub_category_name: string;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  minimum_stock_level: number;
  reorder_point: number;
  maximum_stock_level: number;
  last_updated: string;
  created_at: string;
  updated_by: string;
  category_id: string;
  sub_category_id: string;
  // For editing
  editedQuantity?: number;
  hasChanges?: boolean;
}

const CurrentInventoryStockSetup: React.FC = () => {
  const [stockData, setStockData] = useState<CurrentInventoryStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load data from current_inventory_stock table
  useEffect(() => {
    loadCurrentInventoryStock();
  }, []);

  const loadCurrentInventoryStock = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/inventory/current-inventory-stock');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CurrentInventoryStock[] = await response.json();
      // Initialize with current quantities as editable values
      const initializedData = data.map(item => ({
        ...item,
        editedQuantity: item.current_quantity,
        hasChanges: false
      }));

      setStockData(initializedData);
    } catch (error) {
      console.error('❌ Error loading current_inventory_stock:', error);
      toast({
        title: "Load Error",
        description: `Failed to load inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data based on search term
  const filteredData = stockData.filter(item =>
    item.nomenclature?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sub_category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle quantity change
  const handleQuantityChange = (itemMasterId: string, newQuantity: number) => {
    setStockData(prevData =>
      prevData.map(item => {
        if (item.item_master_id === itemMasterId) {
          const hasChanges = newQuantity !== item.current_quantity;
          return {
            ...item,
            editedQuantity: Math.max(0, newQuantity),
            hasChanges
          };
        }
        return item;
      })
    );
  };

  // Get items with changes
  const getChangedItems = () => {
    return stockData.filter(item => item.hasChanges);
  };

  // Save changes
  const saveChanges = async () => {
    const changedItems = getChangedItems();
    
    if (changedItems.length === 0) {
      toast({
        title: "No Changes",
        description: "No quantity changes to save.",
        variant: "default",
      });
      return;
    }

    try {
      setIsSaving(true);
      const updates = changedItems.map(item => ({
        item_master_id: item.item_master_id,
        current_quantity: item.editedQuantity
      }));

      const response = await fetch('/api/inventory/current-inventory-stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: "Save Successful",
        description: `Updated ${changedItems.length} inventory records.`,
        variant: "default",
      });

      // Reload data to reflect changes
      await loadCurrentInventoryStock();

    } catch (error) {
      console.error('❌ Error saving changes:', error);
      toast({
        title: "Save Failed",
        description: `Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get stock status based on quantity and levels
  const getStockStatus = (quantity: number, minLevel: number, maxLevel: number, reorderPoint: number) => {
    if (quantity === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, color: 'text-red-600' };
    } else if (quantity <= reorderPoint) {
      return { label: 'Reorder Now', variant: 'destructive' as const, color: 'text-red-600' };
    } else if (quantity < minLevel) {
      return { label: 'Below Minimum', variant: 'destructive' as const, color: 'text-orange-600' };
    } else if (quantity > maxLevel) {
      return { label: 'Above Maximum', variant: 'secondary' as const, color: 'text-yellow-600' };
    } else {
      return { label: 'Normal', variant: 'default' as const, color: 'text-green-600' };
    }
  };

  // Calculate statistics
  const stats = {
    total: stockData.length,
    withStock: stockData.filter(item => (item.editedQuantity || 0) > 0).length,
    outOfStock: stockData.filter(item => (item.editedQuantity || 0) === 0).length,
    needReorder: stockData.filter(item => 
      (item.editedQuantity || 0) > 0 && 
      (item.editedQuantity || 0) <= (item.reorder_point || 0)
    ).length,
    changes: getChangedItems().length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-lg text-gray-600">Loading current inventory stock...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Current Inventory Stock Management</h1>
          <p className="text-gray-600 mt-1">Edit current_quantity values directly from current_inventory_stock table</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadCurrentInventoryStock}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={saveChanges}
            disabled={stats.changes === 0 || isSaving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes {stats.changes > 0 && `(${stats.changes})`}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              inventory records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withStock}</div>
            <p className="text-xs text-muted-foreground">
              items available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">
              need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Reorder</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needReorder}</div>
            <p className="text-xs text-muted-foreground">
              below reorder point
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.changes}</div>
            <p className="text-xs text-muted-foreground">
              unsaved edits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Stock</CardTitle>
          <CardDescription>
            Edit current_quantity values. Available quantity is calculated automatically (current - reserved).
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search by item name, code, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Details</TableHead>
                  <TableHead className="text-center">Current Qty</TableHead>
                  <TableHead className="text-center">Reserved</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Min Level</TableHead>
                  <TableHead className="text-center">Reorder Point</TableHead>
                  <TableHead className="text-center">Max Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = getStockStatus(
                    item.editedQuantity || 0,
                    item.minimum_stock_level || 0,
                    item.maximum_stock_level || 0,
                    item.reorder_point || 0
                  );
                  
                  return (
                    <TableRow 
                      key={item.item_master_id}
                      className={item.hasChanges ? 'bg-blue-50 border-blue-200' : ''}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.nomenclature}</div>
                          <div className="text-sm text-gray-500">
                            {item.item_code} • {item.category_name}
                            {item.sub_category_name && ` • ${item.sub_category_name}`}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={item.editedQuantity || 0}
                          onChange={(e) => handleQuantityChange(item.item_master_id, parseInt(e.target.value) || 0)}
                          className={`w-20 text-center ${
                            item.hasChanges ? 'border-blue-400 bg-blue-50' : ''
                          }`}
                        />
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.reserved_quantity || 0}</Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {(item.editedQuantity || 0) - (item.reserved_quantity || 0)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className="text-sm">{item.minimum_stock_level || 0}</span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-orange-600">
                          {item.reorder_point || 0}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className="text-sm">{item.maximum_stock_level || 0}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                          {item.hasChanges && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                              Modified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}
                          {item.updated_by && (
                            <div className="text-xs">by {item.updated_by}</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No items match your search criteria' : 'No inventory data found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrentInventoryStockSetup;
