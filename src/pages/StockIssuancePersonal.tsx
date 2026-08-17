import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  Search, 
  Send, 
  User, 
  Building2,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { inventoryLocalService } from '@/services/inventoryLocalService';
import { categoriesLocalService } from '@/services/categoriesLocalService';
import erpDatabaseService from '@/services/erpDatabaseService';
import stockIssuanceService from '@/services/stockIssuanceService';
import { approvalForwardingService } from '@/services/approvalForwardingService';
import type { User as UserType } from '@/services/erpDatabaseService';
import { Office as ERPOffice, Wing as ERPWing, DEC as ERPDEC } from '@/types/office';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionGate } from '@/components/PermissionGate';
import { getApiBaseUrl } from '@/services/invmisApi';

interface InventoryItem {
  id: string;
  item_master_id?: string;  // Add this field
  intOfficeID: string;
  nomenclature: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  current_stock: number;
  minimum_stock_level: number;
  weighted_avg_price: number;
  primary_Location: string;
}

interface IssuanceItem {
  inventory_id: string;
  inventory_intOfficeID: string;
  item_master_id?: string;  // Add this field for the actual item master ID
  item_code?: string;
  nomenclature: string;
  requested_quantity: number;
  last_issued_quantity?: number;
  last_issue_date?: string | null;
  available_stock: number;
  unit_price: number;
  item_type: 'inventory' | 'custom';
  custom_item_name?: string;
}

const StockIssuancePersonal: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();  const { id } = useParams<{ id: string }>();  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; category_name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [issuanceItems, setIssuanceItems] = useState<IssuanceItem[]>([]);
  const [lastIssuedByItemId, setLastIssuedByItemId] = useState<Record<string, { qty: number; date: string | null }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Custom items state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);

  // Form fields - PERSONAL REQUEST (Individual only)
  const [requestType] = useState<'Individual' | 'Organizational'>('Individual');
  const [purpose, setPurpose] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [justification, setJustification] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [isReturnable, setIsReturnable] = useState(true);

  // Automatically set from logged-in user session
  const selectedOfficeId = user?.office_id?.toString() || '';
  const selectedWingId = user?.wing_id?.toString() || '';
  const selectedBranchId = user?.branch_id?.toString() || '';
  const selectedUserId = user?.user_id || '';

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB');
  };

  useEffect(() => {
    // Check if we're in edit mode
    if (id) {
      setIsEditMode(true);
      console.log('✏️ Edit mode detected for request ID:', id);
      loadExistingRequest(id);
    } else {
      fetchInitialData();
    }
  }, [id]);

  useEffect(() => {
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

    loadCategories();
  }, []);

  useEffect(() => {
    const loadLastIssuedSummary = async () => {
      if (!selectedUserId) return;
      try {
        const rows = await stockIssuanceService.getLastIssuedSummary({ user_id: selectedUserId });
        const map: Record<string, { qty: number; date: string | null }> = {};
        rows.forEach((row: any) => {
          const key = String(row.item_master_id || '');
          if (!key) return;
          map[key] = {
            qty: Number(row.last_issued_quantity || 0),
            date: row.last_issue_date || null
          };
        });
        setLastIssuedByItemId(map);
      } catch (err) {
        console.warn('Failed to load last issued summary:', err);
      }
    };

    loadLastIssuedSummary();
  }, [selectedUserId]);

  useEffect(() => {
    setIssuanceItems((prev) => prev.map((item) => {
      if (item.item_type !== 'inventory') return item;
      const key = String(item.item_master_id || item.inventory_intOfficeID || '');
      const history = lastIssuedByItemId[key];
      return {
        ...item,
        last_issued_quantity: history?.qty,
        last_issue_date: history?.date || null
      };
    }));
  }, [lastIssuedByItemId]);

  const fetchInitialData = async () => {
    try {
      console.log('🔄 Loading stock issuance form data (Personal Request)...');
      
      // Fetch inventory items using the local service
      // Use the requestable-items catalog so all active items (regardless of
      // current stock record) are available for personal requests.
      console.log('📦 Fetching requestable inventory items...');
      console.log('📦 Using endpoint: /api/inventory/requestable-items');
      const inventory = await inventoryLocalService.getRequestableItems();
      console.log('📦 Inventory response:', inventory);

      if (inventory && inventory.length > 0) {
        console.log('📦 First item structure:', JSON.stringify(inventory[0], null, 2));
        console.log('📦 API returned item_master_id:', inventory[0].item_master_id);
        // Transform data to match the expected structure for StockIssuance
        const transformedItems = inventory
          .map((item) => {
            return {
              id: item.id || `inventory-${item.item_master_id}`,
              item_master_id: item.item_master_id,  // Add this field
              item_code: item.item_code || '',
              intOfficeID: item.id,
              nomenclature: item.nomenclature || item.item_name || 'Unknown Item',
              description: item.category_description || item.description || '',
              category_id: item.category_id,
              category_name: item.category_name || item.category_description || '',
              current_stock: item.current_quantity || 0,
              minimum_stock_level: item.minimum_stock_level || 0,
              weighted_avg_price: 0,
              primary_Location: 'Warehouse'
            };
          });

        setInventoryItems(transformedItems);
        console.log('✅ Inventory items loaded:', transformedItems.length);
      } else {
        setInventoryItems([]);
        console.log('⚠️ No inventory items found');
      }

      console.log('✅ Personal stock issuance form data loaded successfully');
      console.log('👤 Using session data:', { 
        user: user?.user_name, 
        office: selectedOfficeId, 
        wing: selectedWingId 
      });
    } catch (error: any) {
      console.error('❌ Error loading stock issuance form data:', error);
      setError('Failed to load data: ' + error.message);
    }
  };

  const loadExistingRequest = async (requestId: string) => {
    try {
      console.log('📝 Loading existing request for editing:', requestId);
      setIsLoading(true);
      
      // Fetch the existing request data
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/stock-issuance/requests/${requestId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const request = data.data;
          console.log('📝 Existing request loaded:', request);
          
          // Populate form with existing data
          setPurpose(request.purpose || '');
          setUrgencyLevel(request.urgency_level || 'Normal');
          
          // Load the items from the request
          if (request.items && request.items.length > 0) {
            const loadedItems = request.items.map((item: any) => ({
              id: item.id || `item-${Date.now()}-${Math.random()}`,
              inventory_id: item.item_master_id,
              item_name: item.nomenclature || item.item_name,
              requested_quantity: item.requested_quantity,
              unit: item.unit || 'Each',
              item_type: item.custom_item_name ? 'custom' : 'inventory',
              custom_item_name: item.custom_item_name || ''
            }));
            setIssuanceItems(loadedItems);
          }
          
          setSuccess('Request loaded for editing');
        } else {
          setError('Failed to load request data');
        }
      } else {
        setError('Failed to fetch request data');
      }
    } catch (error: any) {
      console.error('❌ Error loading existing request:', error);
      setError('Failed to load request: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInventory = inventoryItems.filter(item => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = (item.nomenclature || '').toLowerCase().includes(searchLower) ||
                          (item.item_code && item.item_code.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'all' || item.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addIssuanceItem = (item: InventoryItem) => {
    const existing = issuanceItems.find(i => i.inventory_id === item.id);
    if (existing) {
      setError('Item already added to issuance list');
      return;
    }

    const historyKey = String(item.item_master_id || item.intOfficeID || '');
    const history = lastIssuedByItemId[historyKey];

    const newItem: IssuanceItem = {
      inventory_id: item.id,
      inventory_intOfficeID: item.intOfficeID,
      item_master_id: item.item_master_id,  // Add the actual item master ID
      item_code: item.item_code,
      nomenclature: item.nomenclature,
      requested_quantity: 1,
      last_issued_quantity: history?.qty,
      last_issue_date: history?.date || null,
      available_stock: item.current_stock,
      unit_price: item.weighted_avg_price,
      item_type: 'inventory'
    };

    setIssuanceItems([...issuanceItems, newItem]);
    setError('');
  };

  const addCustomItem = () => {
    if (customItemName.trim() && customItemQuantity > 0) {
      const customId = `custom_${Date.now()}`;
      const newCustomItem: IssuanceItem = {
        inventory_id: customId,
        inventory_intOfficeID: customId,
        nomenclature: customItemName.trim(),
        requested_quantity: customItemQuantity,
        last_issued_quantity: 0,
        last_issue_date: null,
        available_stock: 0,
        unit_price: 0,
        item_type: 'custom',
        custom_item_name: customItemName.trim()
      };
      setIssuanceItems([...issuanceItems, newCustomItem]);
      setCustomItemName('');
      setCustomItemQuantity(1);
      setShowCustomItemForm(false);
      setError('');
    } else {
      setError('Please enter a valid custom item name and quantity');
    }
  };

  const updateQuantity = (inventory_id: string, quantity: number) => {
    setIssuanceItems(items =>
      items.map(item => {
        if (item.inventory_id === inventory_id) {
          // For custom items, allow any positive quantity
          if (item.item_type === 'custom') {
            return { ...item, requested_quantity: Math.max(1, quantity) };
          }
          // Allow requesting any positive quantity regardless of current stock
          return { ...item, requested_quantity: Math.max(1, quantity) };
        }
        return item;
      })
    );
  };

  const removeIssuanceItem = (inventory_id: string) => {
    setIssuanceItems(items => items.filter(item => item.inventory_id !== inventory_id));
  };

  const validateForm = () => {
    // Only require user selection for Individual requests
    if (requestType === 'Individual' && !selectedUserId) {
      setError('Please select a user for this individual request');
      return false;
    }
    if (!selectedOfficeId || !selectedWingId) {
      setError('Please select at least Office and Wing from the hierarchy');
      return false;
    }
    if (issuanceItems.length === 0) {
      setError('Please add at least one item to the issuance request');
      return false;
    }
    if (!purpose.trim()) {
      setError('Please provide a purpose for this request');
      return false;
    }
    return true;
  };

  const submitIssuanceRequest = async () => {
    console.log('🚀 Starting submitIssuanceRequest...');
    console.log('📋 Current issuanceItems:', issuanceItems);
    console.log('📋 Current issuanceItems length:', issuanceItems.length);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    console.log('✅ Form validation passed');

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isEditMode && id) {
        // Update existing request
        console.log('📝 Updating existing request:', id);
        
        const apiBase = getApiBaseUrl();
        const updateData = {
          purpose,
          urgency_level: urgencyLevel,
          justification: justification || undefined,
          expected_return_date: expectedReturnDate || undefined,
          is_returnable: isReturnable,
          items: issuanceItems.map(item => ({
            item_master_id: item.item_type === 'inventory' ? item.item_master_id : undefined,
            nomenclature: item.nomenclature,
            requested_quantity: item.requested_quantity,
            unit: item.unit,
            custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined
          }))
        };

        const response = await fetch(`${apiBase}/stock-issuance/requests/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSuccess('Request updated and resubmitted for approval successfully!');
            
            // Navigate back to my requests
            setTimeout(() => {
              navigate('/dashboard/my-requests');
            }, 2000);
          } else {
            setError('Failed to update request: ' + (result.error || 'Unknown error'));
          }
        } else {
          setError('Failed to update request');
        }
      } else {
        // Create new request (existing logic)
        console.log('📝 Creating new request...');
        const requestNumber = stockIssuanceService.generateRequestNumber();
        console.log('🔢 Generated request number:', requestNumber);
        
        // Create issuance request using SQL Server API
        const requestData = {
          request_number: requestNumber,
          request_type: requestType,
          requester_office_id: parseInt(selectedOfficeId),
          requester_wing_id: parseInt(selectedWingId),
          requester_branch_id: selectedBranchId && selectedBranchId !== 'ALL_BRANCHES' ? selectedBranchId : undefined,
          requester_user_id: requestType === 'Individual' ? selectedUserId : undefined,
          purpose,
          urgency_level: urgencyLevel,
          justification: justification || undefined,
          expected_return_date: expectedReturnDate || undefined,
          is_returnable: isReturnable,
          request_status: 'Submitted'
        };
        console.log('📋 Request data:', requestData);

        const requestResult = await stockIssuanceService.submitRequest(requestData);
        console.log('✅ Request submitted successfully:', requestResult);
        console.log('🔍 Request result id:', requestResult.id);
        console.log('🔍 Request result type:', typeof requestResult.id);

      // Add issuance items
      console.log('📦 Processing issuance items...');
      const requestItems = issuanceItems.map(item => {
        const itemData = {
          item_master_id: item.item_type === 'inventory' ? item.item_master_id : undefined,
          nomenclature: item.nomenclature,
          requested_quantity: item.requested_quantity,
          unit_price: 0, // Value field removed from UI
          item_type: item.item_type,
          custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined
        };
        console.log('📦 Submitting item:', itemData);
        return itemData;
      });
      console.log('📦 All request items:', requestItems);

      console.log('📦 Calling submitItems with requestId:', requestResult.id, 'and items:', requestItems);
      await stockIssuanceService.submitItems(requestResult.id, requestItems);
      console.log('✅ Items submitted successfully');

      // Submit for approval workflow
      try {
        console.log('🔄 Submitting for approval workflow...');
        
        // Get stock issuance workflow
        const workflows = await approvalForwardingService.getWorkflows();
        const stockWorkflow = workflows.find(w => w.request_type === 'stock_issuance');
        
        if (stockWorkflow) {
          await approvalForwardingService.submitForApproval(
            requestResult.id, 
            'stock_issuance', 
            stockWorkflow.id
          );
          console.log('✅ Successfully submitted for approval');
        } else {
          console.warn('⚠️ No stock issuance workflow found - request submitted without approval process');
        }
      } catch (approvalError: any) {
        console.error('❌ Error submitting for approval:', approvalError);
        // Don't fail the entire submission if approval fails
      }

        const successMessage = `Stock issuance request ${requestNumber} submitted successfully and sent for approval for ${user?.user_name}!`;
        console.log('🎉 Success message:', successMessage);
        
        setSuccess(successMessage);
        
        // Reset form
        resetForm();

        // Navigate to my requests page to see the submitted request
        setTimeout(() => {
          navigate('/dashboard/my-requests');
        }, 3000);
      }

    } catch (error: any) {
      setError('Failed to submit request to SQL Server: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIssuanceItems([]);
    setPurpose('');
    setJustification('');
    setExpectedReturnDate('');
    setUrgencyLevel('Normal');
    setCustomItemName('');
    setCustomItemQuantity(1);
    setShowCustomItemForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Stock Issuance</h1>
          <p className="text-gray-600 mt-1">Issue inventory items to employees and departments</p>
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
                  Personal Stock Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display Logged-in User Information */}
                <div className="space-y-4 border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Request For (Current User)
                  </h3>
                  
                  <div className="space-y-2 bg-white p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="text-gray-900">{user?.user_name || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="text-gray-900">{user?.email || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Role:</span>
                      <span className="text-gray-900">{user?.role || 'Not available'}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200 mt-2">
                      <p className="text-sm text-green-700">
                        ✅ <strong>Personal Request:</strong> This request is being created for your own use.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose and Urgency */}
                <div>
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Explain why these items are needed"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={urgencyLevel} onValueChange={(value: 'Low' | 'Normal' | 'High' | 'Critical') => setUrgencyLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {requestType === 'Individual' && (
                    <div>
                      <Label htmlFor="returnDate">Expected Return Date</Label>
                      <Input
                        id="returnDate"
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Justification */}
                <div>
                  <Label htmlFor="justification">Additional Justification</Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Any additional context or justification"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Item Selection */}
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Select Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Category Filter */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search inventory items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
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
                {/* Always visible Add Custom Item button */}
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

              {/* Available Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {item.item_code ? <span className="text-blue-600 mr-2 font-mono text-xs">[{item.item_code}]</span> : null}
                            {item.nomenclature}
                          </div>
                          {item.description && (
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                        {!item.description && (
                          <div className="text-xs text-gray-400 italic">No description</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addIssuanceItem(item)}
                        disabled={issuanceItems.some(i => i.inventory_id === item.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : searchTerm.trim() ? (
                  // No items found - show quick add custom item option
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
                ) : selectedCategory !== 'all' ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No items found in the selected category.</p>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">Search for items to get started...</p>
                  </div>
                )}
              </div>

              {/* Custom Items Section - Only show when user clicks to add custom item */}
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
                          onChange={(e) => setCustomItemName(e.target.value)}
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
                            onChange={(e) => setCustomItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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

              {/* Selected Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Selected Items ({issuanceItems.length})</h4>
                <div className="border rounded-lg">
                  <table className="w-full table-fixed text-xs">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="text-left px-2 py-2 w-[34%]">Item</th>
                        <th className="text-left px-2 py-2 w-[16%]">Last Qty</th>
                        <th className="text-left px-2 py-2 w-[16%]">Last Date</th>
                        <th className="text-left px-2 py-2 w-[24%]">Fresh Req</th>
                        <th className="text-left px-2 py-2 w-[10%]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuanceItems.map(item => (
                        <tr key={item.inventory_id} className="border-t align-middle">
                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {item.item_code ? <span className="text-blue-600 mr-2 font-mono text-xs">[{item.item_code}]</span> : null}
                              {item.nomenclature}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.item_type === 'custom' ? 'Custom item' : `Available: ${item.available_stock}`}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">{item.item_type === 'custom' ? '-' : (item.last_issued_quantity ?? 0)}</td>
                          <td className="px-2 py-2 align-top">{item.item_type === 'custom' ? '-' : formatDate(item.last_issue_date)}</td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.inventory_id, item.requested_quantity - 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-xs font-medium">{item.requested_quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.inventory_id, item.requested_quantity + 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeIssuanceItem(item.inventory_id)}
                              className="h-7 px-2 text-[11px]"
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

              {/* Submit Button */}
              <div className="mt-6">
                <PermissionGate 
                  permission="stock_request.create"
                  fallback={
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Access Restricted:</strong> You don't have permission to create personal stock requests.
                      </p>
                    </div>
                  }
                >
                  <Button
                    onClick={submitIssuanceRequest}
                    disabled={isLoading || issuanceItems.length === 0}
                    className="w-full"
                  >
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {isEditMode ? 'Update & Resubmit Request' : 'Submit Issuance Request'}
                      </>
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
          </div>
          {/* End Right Column */}
        </div>
      </div>
    </div>
  );
};

export default StockIssuancePersonal;
