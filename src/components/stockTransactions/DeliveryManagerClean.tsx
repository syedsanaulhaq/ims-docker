import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Truck, Plus, Edit, Trash2, Package, X, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tender, TenderItem } from '@/types/tender';

interface DeliveryItem {
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  unit_price?: number;
  total_item_amount?: number;
}

interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_items: DeliveryItem[];
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  pricing_method: string;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryManagerProps {
  tender: Tender;
  onDeliveryUpdate?: () => void;
}

const DeliveryManager: React.FC<DeliveryManagerProps> = ({ tender, onDeliveryUpdate }) => {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    delivery_personnel: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_notes: '',
    pricing_method: 'individual',
    total_amount: ''
  });
  
  // Items in current delivery being created/edited
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  
  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    item_master_id: '',
    delivery_qty: 1,
    unit_price: 0
  });

  // Load deliveries for this tender
  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(`deliveries_${tender.id}`);
      if (stored) {
        const parsedData = JSON.parse(stored);
        setDeliveries(Array.isArray(parsedData) ? parsedData : []);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      
      setDeliveries([]);
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, [tender.id]);

  // Get next delivery number
  const getNextDeliveryNumber = () => {
    if (!deliveries || deliveries.length === 0) return 1;
    const maxNumber = deliveries.reduce((max, delivery) => 
      Math.max(max, delivery.delivery_number || 0), 0);
    return maxNumber + 1;
  };

  // Add item to current delivery
  const addItemToDelivery = () => {
    if (!currentItem.item_master_id || !currentItem.delivery_qty) {
      toast({
        title: "Validation Error",
        description: "Please select an item and enter quantity",
        variant: "destructive",
      });
      return;
    }

    // For individual pricing, validate unit price
    if (formData.pricing_method === 'individual' && (!currentItem.unit_price || currentItem.unit_price <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid unit price for individual pricing",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = tender.items.find(item => item.itemMasterId === currentItem.item_master_id);
    if (!selectedItem) return;

    const qty = Number(currentItem.delivery_qty);
    const unitPrice = formData.pricing_method === 'individual' ? Number(currentItem.unit_price) : undefined;
    const totalItemAmount = unitPrice ? qty * unitPrice : undefined;

    const newItem: DeliveryItem = {
      item_master_id: currentItem.item_master_id,
      item_name: selectedItem.nomenclature,
      delivery_qty: qty,
      unit_price: unitPrice,
      total_item_amount: totalItemAmount
    };

    setDeliveryItems([...deliveryItems, newItem]);
    setCurrentItem({ item_master_id: '', delivery_qty: 1, unit_price: 0 });
  };

  // Remove item from current delivery
  const removeItemFromDelivery = (index: number) => {
    setDeliveryItems(deliveryItems.filter((_, i) => i !== index));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      delivery_personnel: '',
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_notes: '',
      pricing_method: 'individual',
      total_amount: ''
    });
    setDeliveryItems([]);
    setCurrentItem({ item_master_id: '', delivery_qty: 1, unit_price: 0 });
    setEditingDelivery(null);
  };

  // Save delivery
  const saveDelivery = async () => {
    if (!formData.delivery_personnel || deliveryItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter delivery personnel and add at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      const deliveryRecord: DeliveryRecord = {
        id: editingDelivery?.id || `delivery_${Date.now()}`,
        delivery_number: editingDelivery?.delivery_number || getNextDeliveryNumber(),
        tender_id: tender.id,
        delivery_items: deliveryItems,
        delivery_personnel: formData.delivery_personnel,
        delivery_date: formData.delivery_date,
        delivery_notes: formData.delivery_notes,
        pricing_method: formData.pricing_method,
        total_amount: parseFloat(formData.total_amount) || 0,
        created_at: editingDelivery?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updatedDeliveries;
      if (editingDelivery) {
        updatedDeliveries = deliveries.map(d => d.id === editingDelivery.id ? deliveryRecord : d);
      } else {
        updatedDeliveries = [...deliveries, deliveryRecord];
      }

      localStorage.setItem(`deliveries_${tender.id}`, JSON.stringify(updatedDeliveries));
      setDeliveries(updatedDeliveries);

      toast({
        title: "Success",
        description: `Delivery ${editingDelivery ? 'updated' : 'added'} successfully`,
      });

      resetForm();
      setIsDialogOpen(false);
      
      if (onDeliveryUpdate) {
        onDeliveryUpdate();
      }
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save delivery",
        variant: "destructive",
      });
    }
  };

  // Edit delivery
  const editDelivery = (delivery: DeliveryRecord) => {
    setFormData({
      delivery_personnel: delivery.delivery_personnel,
      delivery_date: delivery.delivery_date,
      delivery_notes: delivery.delivery_notes || '',
      pricing_method: delivery.pricing_method || 'individual',
      total_amount: delivery.total_amount?.toString() || ''
    });
    setDeliveryItems(delivery.delivery_items ? [...delivery.delivery_items] : []);
    setEditingDelivery(delivery);
    setIsDialogOpen(true);
  };

  // Delete delivery
  const deleteDelivery = (deliveryId: string) => {
    const updatedDeliveries = deliveries.filter(d => d.id !== deliveryId);
    localStorage.setItem(`deliveries_${tender.id}`, JSON.stringify(updatedDeliveries));
    setDeliveries(updatedDeliveries);
    
    toast({
      title: "Success",
      description: "Delivery deleted successfully",
    });
    
    if (onDeliveryUpdate) {
      onDeliveryUpdate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Delivery Management</span>
            </CardTitle>
            <CardDescription>
              Manage deliveries for tender: {tender.tenderNumber}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDelivery ? 'Edit Delivery' : 'Create New Delivery'}
                </DialogTitle>
                <DialogDescription>
                  {editingDelivery 
                    ? `Editing delivery #${editingDelivery.delivery_number}`
                    : `Creating delivery #${getNextDeliveryNumber()}`
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Delivery Items Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Items to Deliver</h3>
                  
                  {/* Add Item Form */}
                  <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg mb-4">
                    <div className="col-span-2">
                      <Label>Select Item</Label>
                      <Select 
                        value={currentItem.item_master_id} 
                        onValueChange={(value) => setCurrentItem(prev => ({ ...prev, item_master_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose item" />
                        </SelectTrigger>
                        <SelectContent>
                          {tender.items.map(item => (
                            <SelectItem key={item.itemMasterId} value={item.itemMasterId}>
                              {item.nomenclature} (Available: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={currentItem.delivery_qty}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, delivery_qty: Number(e.target.value) }))}
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={addItemToDelivery} className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                  </div>

                  {/* Current Items List */}
                  {deliveryItems.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead className="w-20">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveryItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.item_name}</TableCell>
                              <TableCell>{item.delivery_qty}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItemFromDelivery(index)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Delivery Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Delivery Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="personnel">Delivery Personnel</Label>
                      <Input
                        id="personnel"
                        value={formData.delivery_personnel}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_personnel: e.target.value }))}
                        placeholder="Enter delivery personnel name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Delivery Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Delivery Notes</Label>
                    <Input
                      id="notes"
                      value={formData.delivery_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
                      placeholder="Optional delivery notes"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveDelivery} disabled={deliveryItems.length === 0}>
                    {editingDelivery ? 'Update' : 'Create'} Delivery
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading deliveries...</div>
        ) : (
          <>
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No deliveries created yet</p>
                <p className="text-sm">Click "Add Delivery" to create your first delivery record</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery Records ({deliveries.length})</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery #</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Personnel</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell>
                            <Badge variant="outline">#{delivery.delivery_number}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {(delivery.delivery_items && delivery.delivery_items.length > 0) ? (
                                delivery.delivery_items.map((item, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="font-medium">{item.item_name}</span>
                                    <span className="text-gray-500 ml-2">({item.delivery_qty} units)</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-400 italic">
                                  No items recorded
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{delivery.delivery_personnel}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm text-gray-600 truncate" title={delivery.delivery_notes}>
                              {delivery.delivery_notes || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => editDelivery(delivery)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteDelivery(delivery.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryManager;
