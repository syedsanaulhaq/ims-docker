import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';
import { useSession } from '../contexts/SessionContext';
import erpDatabaseService from '@/services/erpDatabaseService';
import { generateScopedRequestNumber } from '@/utils/requestNumber';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Minus, Send, User, Package, AlertCircle, CheckCircle } from 'lucide-react';

interface SelectedItem {
  item_master_id: number | string;
  item_nomenclature: string;
  item_code: string;
  category_name: string;
  subcategory_name: string;
  requested_quantity: number;
  unit_of_measurement: string;
  estimated_unit_price?: number;
  notes?: string;
}

interface ItemMaster {
  id: number;
  vItemNomenclature: string;
  vItemCode: string;
  vCategoryName: string;
  vSubCategoryName: string;
  vUnitOfMeasure: string;
}

const NewProcurementRequest: React.FC = () => {
    // Custom item state
    const [customItemName, setCustomItemName] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState(1);
    const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  // Debug: log user object
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Session user:', user);
  }, [user]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wings, setWings] = useState<any[]>([]);
  const [wingName, setWingName] = useState('');
  const [wingsError, setWingsError] = useState('');

  // Form fields
  const [priority, setPriority] = useState('normal');
  const [justification, setJustification] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Item selection
  const [itemsLibrary, setItemsLibrary] = useState<ItemMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);


  useEffect(() => {
    fetchItemsLibrary();
    fetchWingsAndSetWingName();
  }, []);

  const fetchWingsAndSetWingName = async () => {
    try {
      const wingsData = await erpDatabaseService.getActiveWings();
      setWings(wingsData);
      // Debug: log wings data
      // eslint-disable-next-line no-console
      console.log('Wings data:', wingsData);
      // Try multiple possible user wing fields
      const wingId = user?.intWingID || user?.wing_id || user?.WingID;
      if (wingId) {
        const foundWing = wingsData.find((w: any) => w.Id === wingId || w.id === wingId);
        setWingName(foundWing ? foundWing.Name || foundWing.name : 'Unknown Wing');
      } else {
        setWingName('Unknown Wing');
        setWingsError('No wing ID found in user session.');
      }
    } catch (err) {
      setWingName('Unknown Wing');
      setWingsError('Failed to load wings.');
    }
  };
  const [itemsError, setItemsError] = useState('');

  const fetchItemsLibrary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/items-master`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend fields to frontend ItemMaster structure
        const mappedItems = (data.items || []).map((item: any) => ({
          id: item.id,
          vItemNomenclature: item.nomenclature,
          vItemCode: item.item_code,
          vCategoryName: '', // Fill if available from backend
          vSubCategoryName: '', // Fill if available from backend
          vUnitOfMeasure: item.unit
        }));
        // eslint-disable-next-line no-console
        console.log('Items library:', mappedItems);
        setItemsLibrary(mappedItems);
        if (!mappedItems || mappedItems.length === 0) {
          setItemsError('No items found in the items library.');
        }
      } else {
        setItemsError('Failed to fetch items library.');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load items library');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item: ItemMaster) => {
    const existingItem = selectedItems.find(si => si.item_master_id === item.id);
    
    if (existingItem) {
      setError(`${item.vItemNomenclature} is already added to the request`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newItem: SelectedItem = {
      item_master_id: item.id,
      item_nomenclature: item.vItemNomenclature,
      item_code: item.vItemCode,
      category_name: item.vCategoryName,
      subcategory_name: item.vSubCategoryName,
      requested_quantity: 1,
      unit_of_measurement: item.vUnitOfMeasure,
      notes: ''
    };

    setSelectedItems([...selectedItems, newItem]);
    setShowItemPicker(false);
    setSearchTerm('');
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };


  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...selectedItems];
    updated[index].requested_quantity = quantity;
    setSelectedItems(updated);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (!selectedItems || selectedItems.length === 0) {
        setError('Please select at least one item');
        return;
      }

      if (!justification.trim()) {
        setError('Please provide a justification for this request');
        return;
      }

      // Get user ID from session
      const userId = user?.user_id || user?.Id;
      if (!userId) {
        setError('User information not found. Please log in again.');
        return;
      }

      // Get wing ID from user
      const wingId = user?.intWingID || user?.wing_id || user?.WingID;

      // Generate request number from the current wing name, e.g. Project Management Unit -> PMU-1234567890
      const requestNumber = generateScopedRequestNumber(wingName || (user as any)?.wing_name, 'WING');

      // Create the stock issuance request first
      const requestPayload = {
        request_number: requestNumber,
        request_type: 'wing',
        requester_office_id: null,
        requester_wing_id: wingId || null,
        requester_branch_id: null,
        requester_user_id: userId,
        purpose: 'Wing Stock Request',
        urgency_level: priority === 'critical' ? 'High' : priority === 'urgent' ? 'Medium' : 'Normal',
        justification,
        expected_return_date: null,
        is_returnable: 0,
        request_status: 'Submitted'
      };

      const requestResponse = await fetch(`${getApiBaseUrl()}/api/stock-issuance/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestPayload)
      });

      const requestData = await requestResponse.json();

      if (!requestResponse.ok) {
        throw new Error(requestData.error || requestData.message || 'Failed to create request');
      }

      const requestId = requestData.data?.id;
      if (!requestId) {
        throw new Error('No request ID returned from server');
      }

      console.log('✅ Request created with ID:', requestId);

      // Now add items to the request - send all items in one request
      if (selectedItems.length > 0) {
        const itemsPayload = {
          request_id: requestId,
          items: selectedItems.map(item => ({
            item_master_id: item.item_master_id,
            nomenclature: item.item_nomenclature,
            requested_quantity: item.requested_quantity,
            unit_price: 0,
            item_type: item.item_master_id.toString().startsWith('custom_') ? 'custom' : 'standard',
            custom_item_name: item.item_master_id.toString().startsWith('custom_') ? item.item_nomenclature : null
          }))
        };

        const itemResponse = await fetch(`${getApiBaseUrl()}/api/stock-issuance/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(itemsPayload)
        });

        if (!itemResponse.ok) {
          const errorData = await itemResponse.json();
          console.warn('⚠️ Failed to add items:', errorData);
        } else {
          console.log('✅ Items added successfully');
        }
      }

      setSuccess('Wing request submitted successfully!');
      setSelectedItems([]);
      setJustification('');
      setPriority('normal');

      // Redirect after success
      setTimeout(() => {
        navigate('/dashboard/wing-dashboard');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request';
      console.error('❌ Submit error:', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const addCustomItem = () => {
    if (customItemName.trim() && customItemQuantity > 0) {
      const customItem: SelectedItem = {
        item_master_id: `custom_${Date.now()}`,
        item_nomenclature: customItemName.trim(),
        item_code: '',
        category_name: '',
        subcategory_name: '',
        requested_quantity: customItemQuantity,
        unit_of_measurement: '',
        notes: ''
      };

      setSelectedItems([...selectedItems, customItem]);
      setShowCustomItemForm(false);
      setCustomItemName('');
      setCustomItemQuantity(1);
      setError('');
      return;
    }

    setError('Please enter a valid custom item name and quantity');
  };

  const filteredItems = itemsLibrary.filter(item =>
    item.vItemNomenclature.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Wings Stock Request</h1>
          <p className="text-gray-600 mt-1">Request procurement of items for your wing/department</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Request Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Wing Stock Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Request For (Current Wing)
                  </h3>

                  <div className="space-y-2 bg-white p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Wing:</span>
                      <span className="text-gray-900">{wingName || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Requested By:</span>
                      <span className="text-gray-900">{user?.user_name || 'Not available'}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200 mt-2">
                      <p className="text-sm text-green-700">
                        ✅ <strong>Wing Request:</strong> This request is being created for your current wing.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Purpose *</Label>
                  <Textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    placeholder="Explain why these items are needed for your wing"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Additional Justification</Label>
                  <Textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    placeholder="Any additional context or procurement details"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Items Library and Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Select Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search inventory items..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {!showCustomItemForm && (
                    <button
                      type="button"
                      onClick={() => setShowCustomItemForm(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Can't find your item? Add a custom item
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading items...</div>
                ) : itemsError ? (
                  <div className="p-4 text-center text-red-600">{itemsError}</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.vItemNomenclature}</div>
                            <div className="text-xs text-gray-600 line-clamp-2">
                              Unit: {item.vUnitOfMeasure || 'N/A'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addItem(item)}
                            disabled={selectedItems.some(si => si.item_master_id === item.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : searchTerm.trim() ? (
                      <div className="p-4 border border-dashed border-amber-300 rounded-lg bg-amber-50">
                        <p className="text-sm text-amber-800 mb-3">
                          ❌ No items found for "<span className="font-semibold">{searchTerm}</span>"
                        </p>
                        <Button
                          onClick={() => {
                            setCustomItemName(searchTerm);
                            setCustomItemQuantity(1);
                            setShowCustomItemForm(true);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add "{searchTerm}" as Custom Item
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">Search for items to get started...</p>
                      </div>
                    )}
                  </div>
                )}

                {showCustomItemForm && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-medium mb-3 text-blue-700">Add Custom Item</h4>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 mb-3">
                        💡 Configure your custom item details
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label htmlFor="customItemName">Item Name</Label>
                          <Input
                            id="customItemName"
                            value={customItemName}
                            onChange={e => setCustomItemName(e.target.value)}
                            placeholder="Enter custom item name..."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customItemQuantity">Quantity</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCustomItemQuantity(Math.max(1, customItemQuantity - 1))}
                              type="button"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              id="customItemQuantity"
                              type="number"
                              value={customItemQuantity}
                              onChange={e => setCustomItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-16 text-center"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCustomItemQuantity(customItemQuantity + 1)}
                              type="button"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={addCustomItem}
                          disabled={!customItemName.trim()}
                          className="flex-1"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Custom Item
                        </Button>
                        <Button
                          onClick={() => {
                            setShowCustomItemForm(false);
                            setCustomItemName('');
                            setCustomItemQuantity(1);
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Selected Items ({selectedItems.length})</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Item</th>
                          <th className="text-left px-3 py-2 w-48">Unit</th>
                          <th className="text-left px-3 py-2 w-44">Required Quantity</th>
                          <th className="text-left px-3 py-2 w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, idx) => (
                          <tr key={`${item.item_master_id}-${idx}`} className="border-t align-middle">
                            <td className="px-3 py-2">
                              <div className="font-medium">{item.item_nomenclature}</div>
                              <div className="text-xs text-gray-500">
                                {item.item_master_id.toString().startsWith('custom_') ? 'Custom item' : 'Standard item'}
                              </div>
                            </td>
                            <td className="px-3 py-2">{item.unit_of_measurement || '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(idx, Math.max(1, item.requested_quantity - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-10 text-center text-sm font-medium">{item.requested_quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(idx, item.requested_quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeItem(idx)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    disabled={selectedItems.length === 0 || submitting}
                    className="w-full"
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Wing Request
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewProcurementRequest;
