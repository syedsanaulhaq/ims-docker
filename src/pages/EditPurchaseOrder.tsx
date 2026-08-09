import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Trash2, Edit2, Check, X, Plus } from 'lucide-react';

interface POItem {
  id: number;
  po_id: number;
  item_master_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  specifications?: string;
  nomenclature: string;
  category_name: string;
  unit: string;
  subcategory_name?: string;
}

interface TenderItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  quantity: number;
  estimated_unit_price: number;
  nomenclature: string;
  category_name: string;
  unit: string;
}

interface PurchaseOrderDetails {
  id: number;
  po_number: string;
  tender_id: string;
  vendor_id: string;
  po_date: string;
  file_number?: string;
  total_amount: number;
  status: string;
  remarks?: string;
  po_detail?: string;
  created_at: string;
  updated_at: string;
  tender_title: string;
  tender_reference_number?: string;
  tender_type: string;
  vendor_name: string;
  vendor_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  items: POItem[];
}

export default function EditPurchaseOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [po, setPO] = useState<PurchaseOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [poDate, setPoDate] = useState<string>('');
  const [fileNumber, setFileNumber] = useState<string>('');
  const [poDetail, setPoDetail] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  
  // Items state
  const [items, setItems] = useState<POItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  
  // Add item state
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedNewItem, setSelectedNewItem] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<string>('1');
  const [newItemPrice, setNewItemPrice] = useState<string>('0');

  useEffect(() => {
    if (id) {
      fetchPODetails(id);
    }
  }, [id]);

  const fetchPODetails = async (poId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${poId}`);
      if (!response.ok) throw new Error('Failed to fetch PO details');
      const data = await response.json();
      setPO(data);
      setPoDate(data.po_date.split('T')[0]); // Extract date only
      setFileNumber(data.file_number || '');
      setPoDetail(data.po_detail || '');
      setRemarks(data.remarks || '');
      setItems(data.items || []);
      
      // Fetch tender items for this tender
      if (data.tender_id) {
        fetchTenderItems(data.tender_id);
      }
    } catch (err) {
      console.error('Error fetching PO:', err);
      setError('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tender items for adding to PO
  const fetchTenderItems = async (tenderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch tender items');
      const data = await response.json();
      setTenderItems(data || []);
    } catch (err) {
      console.error('Error fetching tender items:', err);
    }
  };

  // Get available items (tender items not already in PO)
  const getAvailableItems = () => {
    const existingItemMasterIds = items.map(item => item.item_master_id);
    return tenderItems.filter(ti => !existingItemMasterIds.includes(ti.item_master_id));
  };

  // Add new item to PO
  const addNewItem = () => {
    if (!selectedNewItem) {
      alert('Please select an item to add');
      return;
    }
    
    const tenderItem = tenderItems.find(ti => ti.item_master_id === selectedNewItem);
    if (!tenderItem) return;
    
    const qty = parseFloat(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || 0;
    
    // Create a new item with a temporary negative ID (will be handled by backend as new)
    const newItem: POItem = {
      id: -Date.now(), // Temporary negative ID to indicate new item
      po_id: po?.id || 0,
      item_master_id: tenderItem.item_master_id,
      quantity: qty,
      unit_price: price,
      total_price: qty * price,
      nomenclature: tenderItem.nomenclature,
      category_name: tenderItem.category_name,
      unit: tenderItem.unit
    };
    
    setItems(prev => [...prev, newItem]);
    setShowAddItem(false);
    setSelectedNewItem('');
    setNewItemQty('1');
    setNewItemPrice('0');
  };

  // Calculate total amount from items
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  // Start editing an item
  const startEditItem = (item: POItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditUnitPrice(item.unit_price.toString());
  };

  // Cancel editing
  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditQuantity('');
    setEditUnitPrice('');
  };

  // Save item edit
  const saveItemEdit = (itemId: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = parseFloat(editQuantity) || 0;
        const newPrice = parseFloat(editUnitPrice) || 0;
        return {
          ...item,
          quantity: newQty,
          unit_price: newPrice,
          total_price: newQty * newPrice
        };
      }
      return item;
    }));
    setEditingItemId(null);
    setEditQuantity('');
    setEditUnitPrice('');
  };

  // Remove an item
  const removeItem = (itemId: number) => {
    if (items.length <= 1) {
      alert('Cannot remove the last item. A PO must have at least one item.');
      return;
    }
    if (confirm('Are you sure you want to remove this item?')) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleSave = async () => {
    if (!po) return;

    try {
      setSaving(true);
      
      const totalAmount = calculateTotal();
      
      const updateData = {
        po_date: poDate,
        file_number: fileNumber,
        po_detail: poDetail,
        remarks: remarks,
        status: po.status,
        total_amount: totalAmount,
        items: items.map(item => ({
          // If ID is negative, it's a new item - don't send ID so backend creates it
          id: item.id > 0 ? item.id : undefined,
          item_master_id: item.item_master_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          specifications: item.specifications || null
        }))
      };
      
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${po.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.error || 'Failed to update PO');
      }

      const result = await response.json();
      alert('✅ Purchase/Supply order updated successfully');
      navigate(`/dashboard/po/${po.id}`);
    } catch (err) {
      console.error('Error saving PO:', err);
      alert('❌ Failed to update purchase/supply order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading purchase/supply order...</p>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error || 'Purchase/Supply order not found'}</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/dashboard/purchase-orders')}
              >
                Back to POs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (po.status !== 'draft') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center text-amber-600">
              <p className="font-semibold mb-2">Cannot Edit</p>
              <p className="text-sm">Only draft purchase/supply orders can be edited.</p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/dashboard/po/${po.id}`)}
              >
                View PO Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/dashboard/po/${po.id}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Edit Purchase/Supply Order</h1>
                <p className="text-sm text-slate-600">PO Number: {po.po_number}</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white p-6 rounded-b-lg shadow-lg space-y-6">
          
          {/* PO Information */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase/Supply Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Vendor</label>
                  <Input value={po.vendor_name} disabled className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tender</label>
                  <Input value={po.tender_title} disabled className="mt-1 bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">PO Date</label>
                  <Input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">File Number</label>
                  <Input
                    type="text"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    placeholder="Enter file number..."
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Supply Order Details</label>
                <p className="text-xs text-slate-500 mb-2">
                  This text will appear in the Supply Order section of the printed PO
                </p>
                <Textarea
                  value={poDetail}
                  onChange={(e) => setPoDetail(e.target.value)}
                  placeholder="Enter supply order details..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional remarks..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Items ({items.length})</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-normal text-slate-500">Click edit to modify quantity or price</span>
                  {getAvailableItems().length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddItem(!showAddItem)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Item Section */}
              {showAddItem && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-3">Add Item from Tender</h4>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm text-slate-600">Select Item</label>
                      <select
                        value={selectedNewItem}
                        onChange={(e) => {
                          setSelectedNewItem(e.target.value);
                          const item = tenderItems.find(ti => ti.item_master_id === e.target.value);
                          if (item) {
                            setNewItemPrice(item.estimated_unit_price?.toString() || '0');
                          }
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="">-- Select an item --</option>
                        {getAvailableItems().map(ti => (
                          <option key={ti.item_master_id} value={ti.item_master_id}>
                            {ti.nomenclature} ({ti.category_name}) - Rs.{ti.estimated_unit_price?.toLocaleString() || 0}/unit
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Quantity</label>
                      <Input
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        min="1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Unit Price</label>
                      <Input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Total</label>
                      <div className="mt-1 px-3 py-2 bg-green-100 border border-green-300 rounded-md text-lg font-bold text-green-800">
                        Rs.{((parseFloat(newItemQty) || 0) * (parseFloat(newItemPrice) || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={addNewItem}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Add to PO
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddItem(false);
                        setSelectedNewItem('');
                        setNewItemQty('1');
                        setNewItemPrice('0');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-center py-2 px-3">Quantity</th>
                      <th className="text-right py-2 px-3">Unit Price</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-center py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-3">
                          <div className="font-medium">{item.nomenclature}</div>
                          <div className="text-xs text-slate-500">{item.category_name}</div>
                        </td>
                        <td className="text-center py-2 px-3">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-20 text-center mx-auto"
                              min="1"
                            />
                          ) : (
                            <span>{item.quantity} Nos.</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-3">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              value={editUnitPrice}
                              onChange={(e) => setEditUnitPrice(e.target.value)}
                              className="w-28 text-right ml-auto"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            <span>Rs.{item.unit_price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-3 font-semibold">
                          Rs.{(item.quantity * item.unit_price).toLocaleString()}
                        </td>
                        <td className="text-center py-2 px-3">
                          {editingItemId === item.id ? (
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveItemEdit(item.id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditItem}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditItem(item)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-slate-50">
                      <td colSpan={3} className="py-3 px-3 text-right">Total Amount:</td>
                      <td className="text-right py-3 px-3 text-lg">Rs.{calculateTotal().toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
