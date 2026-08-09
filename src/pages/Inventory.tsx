import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCombobox } from "@/components/ui/item-combobox";
import ItemMasterDialog from "@/components/ui/ItemMasterDialog";
import StoreDialog from "@/components/ui/StoreDialog";

import { useItemsCombobox } from "@/hooks/useItemsCombobox";
import { useItemMasterData } from "@/hooks/useItemMasterData";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiInventoryData } from "@/hooks/useApiInventoryData";
import { useApiReorderRequests } from "@/hooks/useApiReorderRequests";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorState from "@/components/common/ErrorState";
import { invmisApi } from '@/services/invmisApi';
import { useNavigate } from 'react-router-dom';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('all-items');
  // State for Item Master Dialog
  const [itemMasterDialogOpen, setItemMasterDialogOpen] = useState(false);
  // State for Store Dialog
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  // Track the last created item master id
  const [lastCreatedItemMasterId, setLastCreatedItemMasterId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Items combobox logic (all item masters as options)
  const { itemMasters, refreshData: refreshItemMasterData } = useItemMasterData();
  // Cast itemMasters to InventoryItem[] for useItemsCombobox compatibility
  const { allItems: itemOptions, addCustomItem } = useItemsCombobox((itemMasters || []) as any);
  // DEBUG: Log what is being sent to the combobox

  // Helper function to get vendor name
  const getVendorNameById = (vendorId: string) => {
    if (!vendors || !vendorId) return 'N/A';
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.vendor_name : 'Unknown Vendor';
  };

  // Use API-based hooks instead of localStorage hooks
  const { 
    inventoryItems, 
    stats, 
    stores,
    getLowStockItems,
    isLoading,
    itemsError,
    createItem,
    updateItem,
    deleteItem,
    isCreatingItem,
    isUpdatingItem,
    isDeletingItem,
    refreshData
  } = useApiInventoryData();
  
  const { 
    addReorderRequest, 
    getRequestForItem, 
    getPendingRequests,
    isLoading: reorderLoading 
  } = useApiReorderRequests();
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  // Removed categories/subCategories state (now only itemId links to item_master)
  const [vendors, setVendors] = useState<any[]>([]);

  // Add the missing newItem state
  const [newItem, setNewItem] = useState({
    itemMasterId: '', // normalized: reference to item master
    minimumStock: '',
    maximumStock: '',
    reorderLevel: '',
    currentStock: '',
    vendorId: '',
    storeId: '', // Use storeId instead of location
    itemType: 'Deadlock Items' as 'Deadlock Items' | 'Consumable Items'
  });

  useEffect(() => {
    async function fetchMeta() {
      try {
        // Only fetch vendors for inventory form - for now use empty array
        // TODO: Add vendors API endpoint to invmisApi
        setVendors([]);
      } catch (err) {
        // Optionally show error toast
      }
    }
    fetchMeta();
  }, []);

  // Removed category/subcategory logic (handled by item_master)

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      itemMasterId: item.itemMasterId || '',
      minimumStock: item.minimumStock?.toString() || '',
      maximumStock: item.maximumStock?.toString() || '',
      reorderLevel: item.reorderLevel?.toString() || '',
      currentStock: item.currentStock?.toString() || '',
      vendorId: item.vendorId || '',
      storeId: item.storeId || '',
      itemType: item.itemType || 'Deadlock Items',
    });
    setShowItemForm(true);
  };

  const handleUpdateItem = () => {
    if (!newItem.itemMasterId) {
      toast({
        title: "Error",
        description: "Item selection is required",
        variant: "destructive"
      });
      return;
    }
    const updateData = {
      id: editingItem.id,
      itemMasterId: newItem.itemMasterId,
      currentStock: parseInt(newItem.currentStock),
      minimumStock: parseInt(newItem.minimumStock),
      maximumStock: newItem.maximumStock ? parseInt(newItem.maximumStock) : undefined,
      reorderLevel: newItem.reorderLevel ? parseInt(newItem.reorderLevel) : undefined,
      storeId: newItem.storeId || '',
      itemType: newItem.itemType,
      vendorId: newItem.vendorId || '',
    };
    updateItem(updateData);
    setEditingItem(null);
    setNewItem({
      itemMasterId: '', minimumStock: '', maximumStock: '', reorderLevel: '', currentStock: '', vendorId: '', storeId: '', itemType: 'Deadlock Items'
    });
    setShowItemForm(false);
  };

  const handleAddItem = async () => {
    if (!newItem.itemMasterId) {
      toast({
        title: "Error",
        description: "Item selection is required",
        variant: "destructive"
      });
      return;
    }
    const createData = {
      itemId: parseInt(newItem.itemMasterId),
      currentQuantity: parseInt(newItem.currentStock),
      minimumLevel: parseInt(newItem.minimumStock),
      maximumLevel: newItem.maximumStock ? parseInt(newItem.maximumStock) : undefined,
      updatedBy: 'current-user', // TODO: Get from auth context
    };
    try {
      await createItem(createData);
      setNewItem({
        itemMasterId: '', minimumStock: '', maximumStock: '', reorderLevel: '', currentStock: '', vendorId: '', storeId: '', itemType: 'Deadlock Items'
      });
      setShowItemForm(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add inventory item",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNewItem({
      itemMasterId: '', minimumStock: '', maximumStock: '', reorderLevel: '', currentStock: '', vendorId: '', storeId: '', itemType: 'Deadlock Items'
    });
    setShowItemForm(false);
  };

  const handleStoreCreated = async (newStore: any) => {
    toast({
      title: "Success",
      description: `Store "${newStore.store_name}" created successfully`,
    });
    
    // Refresh the stores data
    await refreshData();
    
    // Optionally select the newly created store
    setNewItem(prev => ({ ...prev, storeId: newStore.id }));
  };

  const getStockStatus = (item: any) => {
    if (item.currentStock <= item.minimumStock) {
      return { status: 'critical', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' };
    } else {
      return { status: 'good', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
    }
  };

  const handleReorderRequest = async (item: any) => {
    const existingRequest = getRequestForItem(item.id);
    
    if (existingRequest) {
      toast({
        title: "Request Already Exists",
        description: `Reorder request for ${item.name} is already pending`,
        variant: "destructive"
      });
      return;
    }

    await addReorderRequest(item);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  const handleViewReport = (itemId: string) => {
    navigate(`/inventory/${itemId}/report`);
  };

  const lowStockItems = getLowStockItems();
  const pendingRequests = getPendingRequests();

  // Show loading state
  if (isLoading || reorderLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (itemsError) {
    return (
      <div className="p-6">
        <ErrorState 
          message="Failed to load inventory data. Please check your connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-2">Manage your inventory items and stock levels</p>
        </div>
        <Button 
          onClick={() => setShowItemForm(true)} 
          className="flex items-center space-x-2"
          disabled={isCreatingItem}
        >
          {isCreatingItem ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>{isCreatingItem ? 'Adding...' : 'Item'}</span>
        </Button>
      </div>

      <Tabs
        defaultValue="all-items"
        className="space-y-6"
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'all-items') setShowItemForm(false);
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-items">All Items</TabsTrigger>
          <TabsTrigger value="low-stock" className="relative">
            Low Stock
            {lowStockItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {lowStockItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reorder-requests" className="relative">
            Reorder Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* All Items Tab */}
        <TabsContent value="all-items" className="space-y-6">
          {/* Add/Edit Item Form */}
          {showItemForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="itemId">Item *</Label>
                    <div className="flex items-center gap-2">
                      <ItemCombobox
                        items={itemOptions}
                        value={newItem.itemMasterId}
                        onValueChange={(itemMasterId) => setNewItem((prev) => ({ ...prev, itemMasterId }))}
                        onAddItem={addCustomItem}
                        placeholder="Select item..."
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-1"
                        aria-label="Add New Item Master"
                        onClick={() => setItemMasterDialogOpen(true)}
                        tabIndex={-1}
                        data-testid="add-item-master-combobox"
                      >
                        <Plus className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                    <ItemMasterDialog
                      open={itemMasterDialogOpen}
                      onOpenChange={(open) => {
                        setItemMasterDialogOpen(open);
                        if (!open && lastCreatedItemMasterId) {
                          setLastCreatedItemMasterId(null);
                        }
                      }}
                      onItemCreated={async (item) => {
                        // Refresh item master list and select the new item
                        await refreshItemMasterData();
                        if (item && item.id) {
                          setNewItem((prev) => ({ ...prev, itemMasterId: item.id }));
                          setLastCreatedItemMasterId(item.id);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemType">Item Type</Label>
                    <select
                      id="itemType"
                      name="itemType"
                      aria-label="Select item type"
                      value={newItem.itemType}
                      onChange={(e) => setNewItem({ ...newItem, itemType: e.target.value as 'Deadlock Items' | 'Consumable Items' })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Deadlock Items">Deadlock Items</option>
                      <option value="Consumable Items">Consumable Items</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="minimumStock">Minimum Stock</Label>
                    <Input
                      id="minimumStock"
                      type="number"
                      value={newItem.minimumStock}
                      onChange={(e) => setNewItem({ ...newItem, minimumStock: e.target.value })}
                      placeholder="Enter minimum stock"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maximumStock">Maximum Stock</Label>
                    <Input
                      id="maximumStock"
                      type="number"
                      value={newItem.maximumStock}
                      onChange={(e) => setNewItem({ ...newItem, maximumStock: e.target.value })}
                      placeholder="Enter maximum stock"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input
                      id="reorderLevel"
                      type="number"
                      value={newItem.reorderLevel}
                      onChange={(e) => setNewItem({ ...newItem, reorderLevel: e.target.value })}
                      placeholder="Enter reorder level"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      value={newItem.currentStock}
                      onChange={(e) => setNewItem({ ...newItem, currentStock: e.target.value })}
                      placeholder="Enter current stock"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendorId">Vendor</Label>
                    <select
                      id="vendorId"
                      name="vendorId"
                      aria-label="Select vendor"
                      value={newItem.vendorId}
                      onChange={(e) => setNewItem({ ...newItem, vendorId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="storeId">Store</Label>
                    <div className="flex items-center gap-2">
                      <select
                        id="storeId"
                        name="storeId"
                        aria-label="Select store"
                        value={newItem.storeId}
                        onChange={(e) => setNewItem({ ...newItem, storeId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select Store</option>
                        {stores?.map((store) => (
                          <option key={store.id} value={store.id}>{store.store_name}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-1"
                        aria-label="Add New Store"
                        onClick={() => setStoreDialogOpen(true)}
                        tabIndex={-1}
                        data-testid="add-store-button"
                      >
                        <Plus className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    disabled={isCreatingItem || isUpdatingItem}
                  >
                    {isCreatingItem || isUpdatingItem ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : null}
                    {editingItem ? 'Update Item' : 'Save Item'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>All inventory items in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Stock Info</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const StockIcon = stockStatus.icon;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-medium">{item.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.itemType === 'Deadlock Items'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {item.itemType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
                              <span className="font-medium">{item.currentStock} {item.unit}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Min: {item.minimumStock}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                        <div className="text-sm">
                            {getVendorNameById(item.vendorId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{item.location}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'In Stock' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewReport(item.id)}
                              title="View Report"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditItem(item)}
                              disabled={isUpdatingItem}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={isDeletingItem}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Low Stock Items</span>
              </CardTitle>
              <CardDescription>Items that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All items are well stocked!</p>
                  <p className="text-muted-foreground">No items require immediate restocking.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Minimum Stock</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Action Needed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => {
                      const hasRequest = getRequestForItem(item.id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">{item.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">
                              {item.currentStock} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>{item.minimumStock} {item.unit}</TableCell>
                          <TableCell>{item.location}</TableCell>
                          <TableCell>
                            {hasRequest ? (
                              <div className="flex items-center space-x-2 text-orange-600">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">Request Pending</span>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-blue-600"
                                onClick={() => handleReorderRequest(item)}
                              >
                                Request Reorder
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reorder Requests Tab */}
        <TabsContent value="reorder-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span>Reorder Requests</span>
              </CardTitle>
              <CardDescription>Track pending reorder requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">No pending reorder requests</p>
                  <p className="text-muted-foreground">All requests have been processed.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Required Stock</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <span className="font-mono text-sm">{request.id}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.item_master_id}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {request.current_stock}
                          </span>
                        </TableCell>
                        <TableCell>{request.minimum_level}</TableCell>
                        <TableCell>{request.requested_at}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {request.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalItems}</div>
                <p className="text-muted-foreground">Active inventory items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.lowStockItems}</div>
                <p className="text-muted-foreground">Items need restocking</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingRequests.length}</div>
                <p className="text-muted-foreground">Reorder requests pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.totalVendors}</div>
                <p className="text-muted-foreground">Supplier relationships</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Store Dialog */}
      <StoreDialog
        open={storeDialogOpen}
        onOpenChange={setStoreDialogOpen}
        onStoreCreated={handleStoreCreated}
      />
    </div>
  );
};

export default Inventory;
