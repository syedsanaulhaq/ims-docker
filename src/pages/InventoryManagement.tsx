import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Upload,
  Scan,
  Package2,
  Boxes,
  Archive,
  RefreshCw,
  Eye,
  History,
  MapPin,
  Tag
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { invmisApi } from '@/services/invmisApi';

// Types
interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  nomenclature: string;
  description?: string;
  category: string;
  subcategory?: string;
  unit_of_measure: string;
  current_stock: number;
  minimum_stock_level: number;
  maximum_stock_level?: number;
  reorder_level: number;
  unit_price: number;
  total_value: number;
  location: string;
  supplier?: string;
  last_updated: string;
  status: 'active' | 'discontinued' | 'pending';
}

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  item_count: number;
}

interface StockMovement {
  id: string;
  item_id: string;
  item_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reference_type: 'purchase' | 'issue' | 'return' | 'adjustment' | 'transfer';
  reference_id?: string;
  from_location?: string;
  to_location?: string;
  remarks?: string;
  created_by: string;
  created_date: string;
}

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  
  // Dialog states
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  
  // Form data
  const [itemFormData, setItemFormData] = useState({
    item_code: '',
    item_name: '',
    nomenclature: '',
    description: '',
    category: '',
    subcategory: '',
    unit_of_measure: 'pieces',
    minimum_stock_level: 0,
    maximum_stock_level: 0,
    reorder_level: 0,
    unit_price: 0,
    location: '',
    supplier: '',
    status: 'active'
  });

  const [stockAdjustmentData, setStockAdjustmentData] = useState({
    adjustment_type: 'add',
    quantity: 0,
    reason: '',
    remarks: ''
  });

  const fetchInventoryData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch items
      const itemsResponse = await invmisApi.getItems();
      setItems(itemsResponse);

      // Fetch categories
      const categoriesResponse = await invmisApi.getCategories();
      setCategories(categoriesResponse);

      // Sample stock movements (in real app, fetch from API)
      setStockMovements([
        {
          id: '1',
          item_id: '1',
          item_name: 'Laptop Computer',
          movement_type: 'in',
          quantity: 10,
          unit_price: 50000,
          total_value: 500000,
          reference_type: 'purchase',
          reference_id: 'PO-2025-001',
          to_location: 'IT Store',
          remarks: 'New procurement batch',
          created_by: 'admin',
          created_date: new Date().toISOString()
        },
        {
          id: '2',
          item_id: '2',
          item_name: 'Office Chair',
          movement_type: 'out',
          quantity: 5,
          reference_type: 'issue',
          reference_id: 'ISS-2025-001',
          from_location: 'Main Store',
          to_location: 'Admin Office',
          remarks: 'Office furniture allocation',
          created_by: 'store_keeper',
          created_date: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
      
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomenclature?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = item.current_stock <= item.reorder_level;
    else if (stockFilter === 'out') matchesStock = item.current_stock === 0;
    else if (stockFilter === 'normal') matchesStock = item.current_stock > item.reorder_level;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  // Calculate inventory statistics
  const inventoryStats = {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + item.total_value, 0),
    lowStockItems: items.filter(item => item.current_stock <= item.reorder_level).length,
    outOfStockItems: items.filter(item => item.current_stock === 0).length,
    categories: categories.length,
    averageValue: items.length > 0 ? items.reduce((sum, item) => sum + item.total_value, 0) / items.length : 0
  };

  const handleCreateItem = async () => {
    try {
      // In real app, call API to create item
      // Reset form and close dialog
      setItemFormData({
        item_code: '',
        item_name: '',
        nomenclature: '',
        description: '',
        category: '',
        subcategory: '',
        unit_of_measure: 'pieces',
        minimum_stock_level: 0,
        maximum_stock_level: 0,
        reorder_level: 0,
        unit_price: 0,
        location: '',
        supplier: '',
        status: 'active'
      });
      setIsCreateItemOpen(false);
      
      // Refresh items
      await fetchInventoryData();
      
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const handleStockAdjustment = async () => {
    try {
      if (!selectedItem) return;
      
      // In real app, call API to adjust stock
      // Update local state
      const adjustmentAmount = stockAdjustmentData.adjustment_type === 'add' 
        ? stockAdjustmentData.quantity 
        : -stockAdjustmentData.quantity;
      
      setItems(items.map(item => 
        item.id === selectedItem.id 
          ? { 
              ...item, 
              current_stock: Math.max(0, item.current_stock + adjustmentAmount),
              total_value: (item.current_stock + adjustmentAmount) * item.unit_price
            }
          : item
      ));
      
      // Reset form and close dialog
      setStockAdjustmentData({
        adjustment_type: 'add',
        quantity: 0,
        reason: '',
        remarks: ''
      });
      setIsStockAdjustmentOpen(false);
      setSelectedItem(null);
      
    } catch (err) {
      console.error('Error adjusting stock:', err);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { status: 'Out of Stock', color: 'destructive' };
    if (item.current_stock <= item.reorder_level) return { status: 'Low Stock', color: 'secondary' };
    return { status: 'In Stock', color: 'default' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading inventory management...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Manage items, stock levels, and inventory movements</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchInventoryData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Scan className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
            <Button onClick={() => setIsCreateItemOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(inventoryStats.totalItems)}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">Active inventory</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryStats.totalValue)}</p>
                </div>
                <Package2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">Avg: {formatCurrency(inventoryStats.averageValue)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStockItems}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-yellow-600">Need attention</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStockItems}</p>
                </div>
                <Archive className="w-8 h-8 text-red-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-red-600">Immediate action needed</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search items by name, code, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={stockFilter} onValueChange={setStockFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Stock Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock Levels</SelectItem>
                        <SelectItem value="normal">Normal Stock</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="out">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
                <CardDescription>Manage your inventory items and stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Details</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Stock Levels</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const stockStatus = getStockStatus(item);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.item_name}</div>
                                <div className="text-sm text-gray-500">{item.item_code}</div>
                                <div className="text-xs text-gray-400">{item.nomenclature}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.category}</div>
                                {item.subcategory && (
                                  <div className="text-sm text-gray-500">{item.subcategory}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="text-lg font-bold">{formatNumber(item.current_stock)}</div>
                                <div className="text-xs text-gray-500">{item.unit_of_measure}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div>Min: {formatNumber(item.minimum_stock_level)}</div>
                                <div>Reorder: {formatNumber(item.reorder_level)}</div>
                                {item.maximum_stock_level && (
                                  <div>Max: {formatNumber(item.maximum_stock_level)}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              {formatCurrency(item.total_value)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.color as any}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setIsStockAdjustmentOpen(true);
                                  }}
                                >
                                  <Package className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Item Categories</CardTitle>
                <CardDescription>Organize your inventory with categories and subcategories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-600" />
                            <h3 className="font-semibold">{category.name}</h3>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {items.filter(item => item.category === category.name).length} items
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Movements</CardTitle>
                <CardDescription>Track all inventory movements and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Movement</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">
                            {formatDate(movement.created_date)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{movement.item_name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={movement.movement_type === 'in' ? 'default' : movement.movement_type === 'out' ? 'destructive' : 'secondary'}
                            >
                              {movement.movement_type === 'in' ? 'Stock In' : movement.movement_type === 'out' ? 'Stock Out' : 'Adjustment'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.movement_type === 'out' ? '-' : '+'}{formatNumber(movement.quantity)}
                          </TableCell>
                          <TableCell>
                            {movement.total_value ? formatCurrency(movement.total_value) : '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{movement.reference_type}</div>
                              {movement.reference_id && (
                                <div className="text-sm text-gray-500">{movement.reference_id}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.from_location && (
                              <div>From: {movement.from_location}</div>
                            )}
                            {movement.to_location && (
                              <div>To: {movement.to_location}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{movement.created_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold mb-2">Stock Level Report</h3>
                  <p className="text-sm text-gray-500">Current stock levels and alerts</p>
                </div>
              </Card>
              
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-semibold mb-2">Movement Report</h3>
                  <p className="text-sm text-gray-500">Stock movements and transactions</p>
                </div>
              </Card>
              
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="font-semibold mb-2">Valuation Report</h3>
                  <p className="text-sm text-gray-500">Inventory valuation and trends</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockAdjustmentOpen} onOpenChange={setIsStockAdjustmentOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Stock Adjustment</DialogTitle>
              <DialogDescription>
                Adjust stock levels for {selectedItem?.item_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Stock</Label>
                  <Input value={selectedItem?.current_stock || 0} disabled />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input value={selectedItem?.unit_price ? formatCurrency(selectedItem.unit_price) : 'N/A'} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select 
                  value={stockAdjustmentData.adjustment_type} 
                  onValueChange={(value) => setStockAdjustmentData({...stockAdjustmentData, adjustment_type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock</SelectItem>
                    <SelectItem value="remove">Remove Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={stockAdjustmentData.quantity}
                  onChange={(e) => setStockAdjustmentData({...stockAdjustmentData, quantity: parseInt(e.target.value) || 0})}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select 
                  value={stockAdjustmentData.reason} 
                  onValueChange={(value) => setStockAdjustmentData({...stockAdjustmentData, reason: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged Items</SelectItem>
                    <SelectItem value="lost">Lost/Missing</SelectItem>
                    <SelectItem value="found">Found Items</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Textarea
                  value={stockAdjustmentData.remarks}
                  onChange={(e) => setStockAdjustmentData({...stockAdjustmentData, remarks: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              {selectedItem && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm">
                    <div className="font-medium">New Stock Level:</div>
                    <div className="text-lg font-bold">
                      {stockAdjustmentData.adjustment_type === 'add' 
                        ? selectedItem.current_stock + stockAdjustmentData.quantity
                        : Math.max(0, selectedItem.current_stock - stockAdjustmentData.quantity)
                      } {selectedItem.unit_of_measure}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockAdjustmentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment}>
                Apply Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default InventoryManagement;