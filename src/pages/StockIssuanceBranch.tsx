import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';
import { useSession } from '../contexts/SessionContext';
import { generateScopedRequestNumber } from '@/utils/requestNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2, CheckCircle, Minus, Package, Plus, Search, Send, Users } from 'lucide-react';
import { categoriesLocalService } from '@/services/categoriesLocalService';

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
  source_demand_ids?: string[];
  source_staff_names?: string[];
}

interface ItemMaster {
  id: number;
  vItemNomenclature: string;
  vItemCode: string;
  vCategoryName: string;
  vSubCategoryName: string;
  vUnitOfMeasure: string;
}

interface BranchStaffDemand {
  id: string;
  item_master_id?: string | null;
  item_nomenclature: string;
  requested_quantity: number;
  unit_label: string;
  staff_user_id: string;
  staff_name?: string;
  status: string;
  justification?: string;
  created_at?: string;
}

const parseApiJsonSafely = (raw: string) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const StockIssuanceBranch: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [priority, setPriority] = useState('normal');
  const [justification, setJustification] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemsLibrary, setItemsLibrary] = useState<ItemMaster[]>([]);
  const [itemsError, setItemsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<{ id: string; category_name: string }[]>([]);
  const [staffDemands, setStaffDemands] = useState<BranchStaffDemand[]>([]);
  const [myDemands, setMyDemands] = useState<BranchStaffDemand[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);

  const branchId = Number((user as any)?.branch_id ?? (user as any)?.intBranchID ?? 0) || 0;
  const branchName = (user as any)?.branch_name || (user as any)?.BranchName || 'Unknown Branch';
  const branchAcronym = (user as any)?.branch_acronym || (user as any)?.BranchAcron || '';
  const roleNames = ((user as any)?.ims_roles || []).map((r: any) => String(r?.role_name || '').toUpperCase().replace(/\s+/g, '_'));
  const isBranchSupervisor = roleNames.some((role: string) => role === 'BRANCH_SUPERVISOR' || role === 'CUSTOM_BRANCH_SUPERVISOR') || (user as any)?.is_super_admin;

  useEffect(() => {
    fetchItemsLibrary();
    loadCategories();
    if (isBranchSupervisor) {
      fetchBranchDemandInbox();
    } else {
      fetchMyBranchDemands();
    }
  }, [isBranchSupervisor]);

  const loadCategories = async () => {
    try {
      const response = await categoriesLocalService.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  };

  const fetchBranchDemandInbox = async () => {
    try {
      setDemandLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands/branch-inbox`, {
        credentials: 'include'
      });
      const raw = await response.text();
      const data = parseApiJsonSafely(raw);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load branch demand inbox');
      }
      setStaffDemands(data.demands || []);
    } catch (err) {
      console.error('Error loading branch demand inbox:', err);
      setStaffDemands([]);
    } finally {
      setDemandLoading(false);
    }
  };

  const fetchMyBranchDemands = async () => {
    try {
      setDemandLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands/my`, {
        credentials: 'include'
      });
      const raw = await response.text();
      const data = parseApiJsonSafely(raw);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load your branch demands');
      }
      setMyDemands(data.demands || []);
    } catch (err) {
      console.error('Error loading my branch demands:', err);
      setMyDemands([]);
    } finally {
      setDemandLoading(false);
    }
  };

  const fetchItemsLibrary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/items-master`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const mappedItems = (data.items || []).map((item: any) => ({
          id: item.id,
          vItemNomenclature: item.nomenclature,
          vItemCode: item.item_code,
          vCategoryName: item.category_name || '',
          vSubCategoryName: '',
          vUnitOfMeasure: item.unit
        }));

        setItemsLibrary(mappedItems);
        if (!mappedItems || mappedItems.length === 0) {
          setItemsError('No items found in the items library.');
        }
      } else {
        setItemsError('Failed to fetch items library.');
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items library');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item: ItemMaster) => {
    const existingItem = selectedItems.find(selectedItem => selectedItem.item_master_id === item.id);

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
    setSearchTerm('');
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...selectedItems];
    updated[index].requested_quantity = Math.max(1, quantity);
    setSelectedItems(updated);
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

  const addStaffDemandToSelection = (demand: BranchStaffDemand) => {
    const demandId = String(demand.id);
    const existingIndex = selectedItems.findIndex((item) => {
      const sameMaster = String(item.item_master_id || '') === String(demand.item_master_id || '');
      const sameName = item.item_nomenclature.trim().toLowerCase() === String(demand.item_nomenclature || '').trim().toLowerCase();
      return sameMaster || sameName;
    });

    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      const target = updated[existingIndex];
      target.requested_quantity = Math.max(1, Number(target.requested_quantity || 0) + Number(demand.requested_quantity || 0));
      target.source_demand_ids = Array.from(new Set([...(target.source_demand_ids || []), demandId]));
      target.source_staff_names = Array.from(new Set([...(target.source_staff_names || []), demand.staff_name || 'Staff'])) ;
      setSelectedItems(updated);
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        item_master_id: demand.item_master_id || `demand_${demand.id}`,
        item_nomenclature: demand.item_nomenclature,
        item_code: '',
        category_name: '',
        subcategory_name: '',
        requested_quantity: Number(demand.requested_quantity || 1),
        unit_of_measurement: 'No(s)',
        notes: demand.justification || '',
        source_demand_ids: [demandId],
        source_staff_names: [demand.staff_name || 'Staff']
      }
    ]);
  };

  const handleSubmitStaffDemand = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (!selectedItems || selectedItems.length === 0) {
        setError('Please add at least one demand line');
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          justification,
          demand_lines: selectedItems.map((item) => ({
            item_master_id: String(item.item_master_id).startsWith('custom_') ? null : item.item_master_id,
            item_nomenclature: item.item_nomenclature,
            requested_quantity: item.requested_quantity,
            justification: item.notes || justification || ''
          }))
        })
      });

      const raw = await response.text();
      const data = parseApiJsonSafely(raw);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit branch demand');
      }

      setSuccess('Branch demand submitted to Branch Supervisor successfully!');
      setSelectedItems([]);
      setJustification('');
      fetchMyBranchDemands();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit branch demand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (!branchId) {
        setError('Branch information not found in session. Please log in again.');
        return;
      }

      if (!selectedItems || selectedItems.length === 0) {
        setError('Please select at least one item');
        return;
      }

      if (!justification.trim()) {
        setError('Please provide a purpose for this request');
        return;
      }

      const userId = (user as any)?.user_id || (user as any)?.Id;
      const wingId = (user as any)?.wing_id || (user as any)?.intWingID || (user as any)?.WingID || null;
      const requestNumber = generateScopedRequestNumber(branchAcronym || branchName, 'BRANCH');

      const requestPayload = {
        request_number: requestNumber,
        request_type: 'branch',
        requester_office_id: null,
        requester_wing_id: wingId,
        requester_branch_id: branchId,
        requester_user_id: userId || null,
        purpose: 'Branch Stock Request',
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

      const requestRaw = await requestResponse.text();
      const requestData = parseApiJsonSafely(requestRaw);
      if (!requestResponse.ok) {
        throw new Error(requestData.error || requestData.message || 'Failed to create request');
      }

      const requestId = requestData.data?.id;
      if (!requestId) {
        throw new Error('No request ID returned from server');
      }

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
        const itemRaw = await itemResponse.text();
        const itemError = parseApiJsonSafely(itemRaw);
        throw new Error(itemError.error || itemError.message || 'Request was created, but items could not be added');
      }

      const demandIds = Array.from(new Set(selectedItems.flatMap((item) => item.source_demand_ids || [])));
      if (demandIds.length > 0) {
        await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands/attach-to-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            request_id: requestId,
            demand_ids: demandIds
          })
        });
      }

      setSuccess('Branch request submitted successfully!');
      setSelectedItems([]);
      setJustification('');
      setPriority('normal');

      setTimeout(() => {
        navigate('/dashboard/branch-dashboard');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request';
      console.error('Branch request submit error:', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = itemsLibrary.filter(item => {
    const matchesSearch = item.vItemNomenclature.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.vCategoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{isBranchSupervisor ? 'Branch Stock Request' : 'Branch Demand Submission'}</h1>
          <p className="text-gray-600 mt-1">{isBranchSupervisor ? 'Consolidate and submit branch procurement request' : 'Submit your branch demand lines to Branch Supervisor'}</p>
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {isBranchSupervisor ? 'Branch Stock Request Details' : 'Branch Demand Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Request For (Current Branch)
                  </h3>

                  <div className="space-y-2 bg-white p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Branch:</span>
                      <span className="text-gray-900">{branchName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Branch ID:</span>
                      <span className="text-gray-900">{branchId || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Requested By:</span>
                      <span className="text-gray-900">{(user as any)?.user_name || 'Not available'}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200 mt-2">
                      <p className="text-sm text-green-700">
                        <strong>{isBranchSupervisor ? 'Branch Request' : 'Branch Demand'}:</strong> {isBranchSupervisor ? 'You are creating the final branch request.' : 'You are sending demand lines for supervisor consolidation.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>{isBranchSupervisor ? 'Purpose *' : 'Demand Purpose *'}</Label>
                  <Textarea
                    value={justification}
                    onChange={event => setJustification(event.target.value)}
                    placeholder={isBranchSupervisor ? 'Explain why these items are needed for your branch' : 'Explain why these items are needed by your section/team'}
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
                    onChange={event => setJustification(event.target.value)}
                    placeholder="Any additional context or procurement details"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {isBranchSupervisor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Demand Inbox ({staffDemands.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {demandLoading ? (
                  <div className="text-sm text-gray-500">Loading staff demands...</div>
                ) : staffDemands.length === 0 ? (
                  <div className="text-sm text-gray-500">No pending staff demand lines found.</div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {staffDemands.map((demand) => (
                      <div key={demand.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{demand.item_nomenclature}</div>
                          <div className="text-xs text-gray-600">{demand.staff_name || 'Staff'} requested {demand.requested_quantity} No(s)</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => addStaffDemandToSelection(demand)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Include
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {isBranchSupervisor ? 'Select Items' : 'Add Demand Items'}
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
                      onChange={event => setSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="mt-3">
                    <Label htmlFor="categoryFilter" className="text-xs text-gray-600">Filter by Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="categoryFilter" className="mt-1">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.category_name}>
                            {category.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            disabled={selectedItems.some(selectedItem => selectedItem.item_master_id === item.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : searchTerm.trim() ? (
                      <div className="p-4 border border-dashed border-amber-300 rounded-lg bg-amber-50">
                        <p className="text-sm text-amber-800 mb-3">
                          No items found for "<span className="font-semibold">{searchTerm}</span>"
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
                      <p className="text-sm text-blue-600 mb-3">Configure your custom item details</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label htmlFor="customItemName">Item Name</Label>
                          <Input
                            id="customItemName"
                            value={customItemName}
                            onChange={event => setCustomItemName(event.target.value)}
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
                              onChange={event => setCustomItemQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
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
                        <Button onClick={addCustomItem} disabled={!customItemName.trim()} className="flex-1">
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
                  <div className="border rounded-lg">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2 w-[52%]">Item</th>
                          <th className="text-left px-3 py-2 w-[14%]">Unit</th>
                          <th className="text-left px-3 py-2 w-[22%]">Required Quantity</th>
                          <th className="text-left px-3 py-2 w-[12%]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, index) => (
                          <tr key={`${item.item_master_id}-${index}`} className="border-t align-middle">
                            <td className="px-3 py-2">
                              <div className="font-medium break-words">{item.item_nomenclature}</div>
                              <div className="text-xs text-gray-500">
                                {item.item_master_id.toString().startsWith('custom_') ? 'Custom item' : 'Standard item'}
                              </div>
                            </td>
                            <td className="px-3 py-2 break-words">{item.unit_of_measurement || '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(index, item.requested_quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-10 text-center text-sm font-medium">{item.requested_quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(index, item.requested_quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Button size="sm" variant="destructive" onClick={() => removeItem(index)}>
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!isBranchSupervisor && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">My Submitted Branch Demands ({myDemands.length})</h4>
                    {demandLoading ? (
                      <div className="text-sm text-gray-500">Loading...</div>
                    ) : myDemands.length === 0 ? (
                      <div className="text-sm text-gray-500">No submitted demands yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {myDemands.map((demand) => (
                          <div key={demand.id} className="text-xs border rounded p-2 flex items-center justify-between">
                            <span>{demand.item_nomenclature} - {demand.requested_quantity} No(s)</span>
                            <span className="font-medium text-blue-700">{demand.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <Button disabled={selectedItems.length === 0 || submitting} className="w-full" onClick={isBranchSupervisor ? handleSubmit : handleSubmitStaffDemand}>
                    {submitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {isBranchSupervisor ? 'Submit Branch Request' : 'Submit Branch Demand'}
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
};

export default StockIssuanceBranch;