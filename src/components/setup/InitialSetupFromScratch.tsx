import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, Package, RefreshCw, AlertCircle, CheckCircle, BarChart3, PieChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

interface CurrentInventoryStock {
  id: string;
  item_id: string;
  current_quantity: number;
  minimum_level: number;
  maximum_level: number;
  location: string;
  last_updated: string;
  // For editing
  editedQuantity?: number;
  hasChanges?: boolean;
}

const InitialSetupFromScratch: React.FC = () => {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/current-inventory-stock`);
      
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
    item.item_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle quantity change
  const handleQuantityChange = (id: string, newQuantity: number) => {
    setStockData(prevData =>
      prevData.map(item => {
        if (item.id === id) {
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
        id: item.id,
        current_quantity: item.editedQuantity
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/current-inventory-stock/bulk-update`, {
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
  const getStockStatus = (quantity: number, minLevel: number, maxLevel: number) => {
    if (quantity === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, color: 'text-red-600' };
    } else if (quantity < minLevel) {
      return { label: 'Below Minimum', variant: 'destructive' as const, color: 'text-red-600' };
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
    changes: getChangedItems().length
  };

  // Prepare chart data
  const getChartData = () => {
    // Stock status distribution for pie chart
    const statusCounts = {
      normal: 0,
      belowMin: 0,
      aboveMax: 0,
      outOfStock: 0
    };

    // Quantity distribution for bar chart (grouped by ranges)
    const quantityRanges = {
      '0': 0,
      '1-10': 0,
      '11-50': 0,
      '51-100': 0,
      '100+': 0
    };

    // Location-based distribution
    const locationCounts: { [key: string]: number } = {};

    stockData.forEach(item => {
      const quantity = item.editedQuantity || 0;
      const status = getStockStatus(quantity, item.minimum_level, item.maximum_level);

      // Count status types
      if (status.label === 'Out of Stock') statusCounts.outOfStock++;
      else if (status.label === 'Below Minimum') statusCounts.belowMin++;
      else if (status.label === 'Above Maximum') statusCounts.aboveMax++;
      else statusCounts.normal++;

      // Count quantity ranges
      if (quantity === 0) quantityRanges['0']++;
      else if (quantity <= 10) quantityRanges['1-10']++;
      else if (quantity <= 50) quantityRanges['11-50']++;
      else if (quantity <= 100) quantityRanges['51-100']++;
      else quantityRanges['100+']++;

      // Count by location
      const location = item.location || 'Unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    const pieData = [
      { name: 'Normal Stock', value: statusCounts.normal, color: '#10b981' },
      { name: 'Out of Stock', value: statusCounts.outOfStock, color: '#ef4444' },
      { name: 'Below Minimum', value: statusCounts.belowMin, color: '#f59e0b' },
      { name: 'Above Maximum', value: statusCounts.aboveMax, color: '#8b5cf6' }
    ].filter(item => item.value > 0);

    const barData = Object.entries(quantityRanges).map(([range, count]) => ({
      range,
      count,
      percentage: stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0'
    }));

    const locationData = Object.entries(locationCounts)
      .map(([location, count]) => ({
        location: location.length > 15 ? location.substring(0, 15) + '...' : location,
        count,
        percentage: stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 locations

    return { pieData, barData, locationData };
  };

  const { pieData, barData, locationData } = getChartData();

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
          <h1 className="text-3xl font-bold text-gray-900">Initial Setup - Current Inventory Stock</h1>
          <p className="text-gray-600 mt-1">Edit quantities directly from current_inventory_stock table</p>
        </div>
        
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              in current_inventory_stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withStock}</div>
            <p className="text-xs text-muted-foreground">
              items have quantity &gt; 0
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
              items need restocking
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
              unsaved modifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Status Distribution (Pie Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Status Distribution</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quantity Distribution (Bar Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity Distribution</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value, name) => [value, 'Items']}
                  labelFormatter={(label) => `Range: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="#0891b2" 
                  name="Items"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Distribution (Bar Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Locations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={locationData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  type="category"
                  dataKey="location" 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip 
                  formatter={(value, name) => [value, 'Items']}
                  labelFormatter={(label) => `Location: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="#7c3aed" 
                  name="Items"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Stock</CardTitle>
          <CardDescription>
            Edit the current_quantity values directly. Changes are highlighted in blue.
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search by item ID or location..."
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
                  <TableHead>Item ID</TableHead>
                  <TableHead>Current Quantity</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Max Level</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = getStockStatus(
                    item.editedQuantity || 0,
                    item.minimum_level,
                    item.maximum_level
                  );
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={item.hasChanges ? 'bg-blue-50 border-blue-200' : ''}
                    >
                      <TableCell className="font-medium">{item.item_id}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.editedQuantity || 0}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className={`w-24 text-center ${item.hasChanges ? 'border-blue-400 bg-blue-50' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">{item.minimum_level}</TableCell>
                      <TableCell className="text-center">{item.maximum_level}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {item.hasChanges && (
                          <Badge variant="outline" className="ml-1 border-blue-500 text-blue-600">
                            Modified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(item.last_updated).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No records match your search criteria' : 'No records found in current_inventory_stock table'}
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

export default InitialSetupFromScratch;