import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import StockAvailabilityChecker from '@/components/stock/StockAvailabilityChecker';
import { PermissionGate } from '@/components/PermissionGate';
import { getApiBaseUrl } from '@/services/invmisApi';

interface InventoryItem {
  id: string;
  item_master_id?: string;
  intOfficeID: string;
  nomenclature: string;
  category_id?: string;
  category_name?: string;
  current_stock: number;
  minimum_stock_level: number;
  weighted_avg_price: number;
  primary_Location: string;
}

interface ScopedInventoryRow {
  item_master_id?: number | string | null;
  nomenclature?: string;
  issued_quantity?: number;
  current_return_status?: string;
}

interface IssuanceItem {
  inventory_id: string;
  inventory_intOfficeID: string;
  item_master_id?: string;
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

const StockIssuanceWing: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; category_name: string }[]>([]);
  const [offices, setOffices] = useState<ERPOffice[]>([]);
  const [wings, setWings] = useState<ERPWing[]>([]);
  const [decs, setDecs] = useState<ERPDEC[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [issuanceItems, setIssuanceItems] = useState<IssuanceItem[]>([]);
  const [lastIssuedByItemId, setLastIssuedByItemId] = useState<Record<string, { qty: number; date: string | null }>>({});
  const [wingInventoryByItemId, setWingInventoryByItemId] = useState<Record<string, number>>({});
  const [wingInventoryByName, setWingInventoryByName] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Custom items state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);

  // Hierarchical selection
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [selectedWingId, setSelectedWingId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Form fields - WING REQUEST (Organizational only)
  const [requestType] = useState<'Individual' | 'Organizational'>('Organizational');
  const [purpose, setPurpose] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [justification, setJustification] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [isReturnable, setIsReturnable] = useState(true);

  // Navigation hook
  const navigate = useNavigate();

  // Filtered data based on hierarchy
  const filteredWings = wings.filter(wing => wing.OfficeID === parseInt(selectedOfficeId));
  const filteredDecs = decs.filter(dec => dec.WingID === parseInt(selectedWingId));

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB');
  };

  const getInventoryQtyBadgeClass = (qty: number) => {
    if (qty <= 0) return 'text-red-700 bg-red-50 border border-red-200';
    if (qty <= 5) return 'text-amber-700 bg-amber-50 border border-amber-200';
    return 'text-green-700 bg-green-50 border border-green-200';
  };

  const getWingInventoryQty = (item: { item_master_id?: string | number; id?: string | number; inventory_id?: string | number; inventory_intOfficeID?: string | number; nomenclature?: string; }) => {
    const candidateIds = [item.item_master_id, item.id, item.inventory_id, item.inventory_intOfficeID]
      .filter((id) => id !== undefined && id !== null && String(id) !== '')
      .map((id) => String(id));

    for (const key of candidateIds) {
      const value = wingInventoryByItemId[key];
      if (value !== undefined) return value;
    }

    const nameKey = String(item.nomenclature || '').trim().toLowerCase();
    if (!nameKey) return 0;
    return Number(wingInventoryByName[nameKey] || 0);
  };
  
  // Load users dynamically when office, wing, or branch changes
  useEffect(() => {
    const loadFilteredUsers = async () => {
      if (!selectedOfficeId || !selectedWingId) {
        setUsers([]);
        return;
      }

      try {
        // Use DECID directly from the combo (no mapping needed with new view)
        const branchFilterValue = selectedBranchId && selectedBranchId !== 'ALL_BRANCHES' 
          ? parseInt(selectedBranchId) 
          : undefined;
        
        const filteredUsersData = await erpDatabaseService.getFilteredUsers(
          parseInt(selectedOfficeId),
          parseInt(selectedWingId),
          branchFilterValue
        );
        setUsers(filteredUsersData);
      } catch (error) {
        console.error('❌ Error loading filtered users:', error);
        setUsers([]);
      }
    };

    loadFilteredUsers();
  }, [selectedOfficeId, selectedWingId, selectedBranchId]);

  // filteredUsers is now just the users state (already filtered by backend)
  const filteredUsers = users || [];

  useEffect(() => {
    fetchInitialData();
  }, []);

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
      if (!selectedWingId) {
        setLastIssuedByItemId({});
        return;
      }

      try {
        const rows = await stockIssuanceService.getLastIssuedSummary({ wing_id: selectedWingId });
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
        }
    };

    loadLastIssuedSummary();
  }, [selectedWingId]);

  useEffect(() => {
    setIssuanceItems((prev) => prev.map((item) => {
      if (item.item_type !== 'inventory') return item;
      const key = String(item.inventory_intOfficeID || item.inventory_id || '');
      const history = lastIssuedByItemId[key];
      return {
        ...item,
        last_issued_quantity: history?.qty,
        last_issue_date: history?.date || null
      };
    }));
  }, [lastIssuedByItemId]);

  useEffect(() => {
    const loadWingInventoryTotals = async () => {
      if (!selectedWingId) {
        setWingInventoryByItemId({});
        setWingInventoryByName({});
        return;
      }

      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/wing-inventory/${selectedWingId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          setWingInventoryByItemId({});
          setWingInventoryByName({});
          return;
        }

        const data = await response.json();
        const rows: ScopedInventoryRow[] = Array.isArray(data?.items) ? data.items : [];
        const byItemId: Record<string, number> = {};
        const byName: Record<string, number> = {};

        rows
          .filter((row) => String(row.current_return_status || '').toLowerCase() !== 'returned')
          .forEach((row) => {
            const qty = Number(row.issued_quantity || 0);
            if (!qty) return;

            if (row.item_master_id !== undefined && row.item_master_id !== null && String(row.item_master_id) !== '') {
              const key = String(row.item_master_id);
              byItemId[key] = Number(byItemId[key] || 0) + qty;
            }

            const nameKey = String(row.nomenclature || '').trim().toLowerCase();
            if (nameKey) {
              byName[nameKey] = Number(byName[nameKey] || 0) + qty;
            }
          });

        setWingInventoryByItemId(byItemId);
        setWingInventoryByName(byName);
      } catch (err) {
        console.error('Error loading wing inventory totals:', err);
        setWingInventoryByItemId({});
        setWingInventoryByName({});
      }
    };

    loadWingInventoryTotals();
  }, [selectedWingId]);

  // Clear selected user when switching to Organizational request type
  useEffect(() => {
    if (requestType === 'Organizational') {
      setSelectedUserId('');
    }
  }, [requestType]);

  const fetchInitialData = async () => {
    try {
      // Fetch inventory items using the local service
      // Use the full requestable catalog so all active items can be requested.
      const inventory = await inventoryLocalService.getRequestableItems();
      if (inventory && inventory.length > 0) {
        // Transform data to match the expected structure for StockIssuance
        const transformedItems = inventory
          .map((item) => ({
            id: `inventory-${item.id}`,
            item_master_id: String(item.item_master_id || item.id || ''),
            item_code: item.item_code || item.item_masters?.item_code || '',
            intOfficeID: item.id,
            nomenclature: item.nomenclature || item.item_masters?.nomenclature || 'Unknown Item',
            category_id: item.category_id,
            category_name: item.category_name || item.category_description || '',
            current_stock: item.current_quantity || item.intCurrentStock || 0,
            minimum_stock_level: item.intMinimumLevel || 0,
            weighted_avg_price: item.fltUnitPrice || 0,
            primary_Location: item.strStockLocation || 'Main Warehouse'
          }));

        setInventoryItems(transformedItems);
        } else {
        setInventoryItems([]);
        }

      // Fetch ERP data using ERP service
      try {
        const [officesData, wingsData, decsData] = await Promise.all([
          erpDatabaseService.getActiveOffices(),
          erpDatabaseService.getActiveWings(),
          erpDatabaseService.getActiveDecs()
        ]);

        setOffices(officesData);
        setWings(wingsData);
        setDecs(decsData);
        // Users will be loaded dynamically when office/wing/branch is selected
      } catch (erpError) {
        console.error('❌ Error loading ERP data:', erpError);
        setError('Failed to load office, wing, DEC, and user data');
      }

      } catch (error: any) {
      console.error('❌ Error loading stock issuance form data:', error);
      setError('Failed to load data: ' + error.message);
    }
  };

  // Handler functions
  const handleOfficeChange = (officeId: string) => {
    setSelectedOfficeId(officeId);
    setSelectedWingId('');
    setSelectedBranchId('');
    setSelectedUserId('');
  };

  const handleWingChange = (wingId: string) => {
    setSelectedWingId(wingId);
    setSelectedBranchId('');
    setSelectedUserId('');
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedUserId('');
  };

  const filteredInventory = inventoryItems.filter(item => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = (item.nomenclature || '').toLowerCase().includes(searchLower) ||
                          (item.item_code && item.item_code.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addIssuanceItem = (item: InventoryItem) => {
    const existing = issuanceItems.find(i => i.inventory_id === item.id);
    if (existing) {
      setError('Item already added to issuance list');
      return;
    }

    const history = lastIssuedByItemId[String(item.item_master_id || item.intOfficeID || '')];
    const newItem: IssuanceItem = {
      inventory_id: item.id,
      inventory_intOfficeID: item.intOfficeID,
      item_master_id: item.item_master_id,
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
        available_stock: 0,
        unit_price: 0,
        item_type: 'custom',
        custom_item_name: customItemName.trim()
      };
      setIssuanceItems([...issuanceItems, newCustomItem]);
      setCustomItemName('');
      setCustomItemQuantity(1);
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
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedUser = selectedUserId ? (users || []).find(user => user.Id === selectedUserId) : null;
      const requestNumber = stockIssuanceService.generateRequestNumber();
      
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

      const requestResult = await stockIssuanceService.submitRequest(requestData);

      // Add issuance items
      const requestItems = issuanceItems.map(item => ({
        item_master_id: item.item_type === 'inventory' ? item.inventory_intOfficeID : undefined,
        nomenclature: item.nomenclature,
        requested_quantity: item.requested_quantity,
        unit_price: 0, // Value field removed from UI
        item_type: item.item_type,
        custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined
      }));

      await stockIssuanceService.submitItems(requestResult.id, requestItems);

      // Submit for approval workflow
      try {
        // Get stock issuance workflow
        const workflows = await approvalForwardingService.getWorkflows();
        const stockWorkflow = workflows.find(w => w.request_type === 'stock_issuance');
        
        if (stockWorkflow) {
          await approvalForwardingService.submitForApproval(
            requestResult.id, 
            'stock_issuance', 
            stockWorkflow.id
          );
          } else {
          }
      } catch (approvalError: any) {
        console.error('❌ Error submitting for approval:', approvalError);
        // Don't fail the entire submission if approval fails
      }

      const successMessage = requestType === 'Individual' && selectedUser
        ? `Stock issuance request ${requestNumber} submitted successfully and sent for approval for ${selectedUser.FullName}!`
        : `Stock issuance request ${requestNumber} submitted successfully and sent for approval!`;
      
      setSuccess(successMessage);
      
      // Reset form
      resetForm();

      // Navigate to approval dashboard to see the submitted request
      setTimeout(() => {
        navigate('/dashboard/approval-dashboard');
      }, 3000);

    } catch (error: any) {
      setError('Failed to submit request to SQL Server: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIssuanceItems([]);
    setSelectedOfficeId('');
    setSelectedWingId('');
    setSelectedBranchId('');
    setSelectedUserId('');
    setPurpose('');
    setJustification('');
    setExpectedReturnDate('');
    setUrgencyLevel('Normal');
    setCustomItemName('');
    setCustomItemQuantity(1);
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
                <Building2 className="w-5 h-5" />
                Wing/Department Stock Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Request Type - Hidden (always Organizational for Wing requests) */}
              
              {/* Hierarchical User Selection */}
              <div className="space-y-4 border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Organizational Hierarchy Selection
                </h3>
                
                {/* Office Selection */}
                <div>
                  <Label htmlFor="office">Office *</Label>
                  <Select value={selectedOfficeId} onValueChange={handleOfficeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map(office => (
                        <SelectItem key={office.intOfficeID} value={office.intOfficeID.toString()}>
                          {office.strOfficeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Wing Selection */}
                <div>
                  <Label htmlFor="wing">Wing *</Label>
                  <Select 
                    value={selectedWingId} 
                    onValueChange={handleWingChange}
                    disabled={!selectedOfficeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedOfficeId ? "Select office first" : "Select wing"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredWings.map(wing => (
                        <SelectItem key={wing.Id} value={wing.Id.toString()}>
                          {wing.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch/Dec Selection */}
                <div>
                  <Label htmlFor="branch">Branch/Dec (Optional)</Label>
                  <Select 
                    value={selectedBranchId} 
                    onValueChange={handleBranchChange}
                    disabled={!selectedWingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedWingId ? "Select wing first" : "Select branch/dec (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_BRANCHES">All branches in this wing</SelectItem>
                      {filteredDecs.map(dec => (
                        <SelectItem key={dec.intAutoID} value={dec.intAutoID.toString()}>
                          {dec.DECName} {dec.DECCode && `(${dec.DECCode})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Selection - Only show for Individual requests */}
                {requestType === 'Individual' && (
                  <div>
                    <Label htmlFor="user">User *</Label>
                    <Select 
                      value={selectedUserId} 
                      onValueChange={setSelectedUserId}
                      disabled={!selectedWingId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedWingId ? "Select wing first" : `Select user (${filteredUsers.length} available)`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.length === 0 && selectedWingId ? (
                          <SelectItem value="no-users" disabled>
                            No users found for this hierarchy
                          </SelectItem>
                        ) : (
                          filteredUsers.map(user => (
                            <SelectItem key={user.Id} value={user.Id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.FullName}</span>
                                <span className="text-xs text-gray-500">
                                  {user.DesignationName || user.Role || 'No designation'} {user.CNIC && `• ${user.CNIC}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedWingId && filteredUsers.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        ⚠️ No users found for Office: {selectedOfficeId}, Wing: {selectedWingId}
                        {selectedBranchId && `, Branch: ${selectedBranchId}`}
                      </p>
                    )}
                    {selectedWingId && filteredUsers.length > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ Found {filteredUsers.length} user{filteredUsers.length > 1 ? 's' : ''} 
                        {selectedBranchId ? ' in this specific branch' : ' in this wing (all branches)'}
                      </p>
                    )}
                  </div>
                )}

                {/* Request Type Info */}
                {requestType === 'Organizational' && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-sm text-blue-700">
                      📋 <strong>Organizational Request:</strong> This request is for the entire {selectedBranchId && selectedBranchId !== 'ALL_BRANCHES' ? 'branch' : 'wing/organization'}. No individual user selection required.
                    </p>
                  </div>
                )}

                {/* Selected User Display */}
                {selectedUserId && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Selected Requester:</h4>
                    {(() => {
                      const user = (users || []).find(u => u.Id === selectedUserId);
                      const office = offices.find(o => o.intOfficeID === parseInt(selectedOfficeId));
                      const wing = filteredWings.find(w => w.Id === parseInt(selectedWingId));
                      const branch = filteredDecs.find(d => d.intAutoID === parseInt(selectedBranchId));
                      
                      return (
                        <div className="text-sm">
                          <p><strong>Name:</strong> {user?.FullName}</p>
                          <p><strong>Email:</strong> {user?.Email || 'N/A'}</p>
                          <p><strong>CNIC:</strong> {user?.CNIC || 'N/A'}</p>
                          <p><strong>Designation:</strong> {user?.DesignationName || 'N/A'}</p>
                          <p><strong>Office:</strong> {office?.strOfficeName}</p>
                          <p><strong>Wing:</strong> {wing?.Name}</p>
                          <p><strong>Branch:</strong> {branch?.DECName}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
          {/* End Left Column */}

          {/* Right Column: Stock Availability & Item Selection */}
          <div className="space-y-6">
            {/* Stock Availability Checker - NEW FEATURE */}
            <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Search className="w-5 h-5" />
                Check Stock Availability
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Search for items and check their real-time availability before adding to your request
              </p>
            </CardHeader>
            <CardContent>
              <StockAvailabilityChecker
                selectedItems={issuanceItems.map(item => ({
                  item_master_id: item.item_master_id || item.inventory_intOfficeID || item.inventory_id,
                  requested_quantity: item.requested_quantity
                }))}
                onItemSelect={(item) => {
                  // Add selected item to issuance list
                  const history = lastIssuedByItemId[String(item.item_master_id || '')];
                  const newItem: IssuanceItem = {
                    inventory_id: item.item_master_id,
                    inventory_intOfficeID: item.item_master_id,
                    item_master_id: item.item_master_id,
                    nomenclature: item.nomenclature,
                    requested_quantity: 1,
                    last_issued_quantity: history?.qty,
                    last_issue_date: history?.date || null,
                    available_stock: item.available_quantity,
                    unit_price: item.unit_price || 0,
                    item_type: 'inventory'
                  };
                  
                  // Check if already added
                  const existing = issuanceItems.find(i => i.inventory_id === item.item_master_id);
                  if (!existing) {
                    setIssuanceItems([...issuanceItems, newItem]);
                    setSuccess(`✅ ${item.nomenclature} added to request`);
                    setTimeout(() => setSuccess(''), 3000);
                  } else {
                    setError('Item already added to issuance list');
                    setTimeout(() => setError(''), 3000);
                  }
                }}
                onAvailabilityCheck={(result) => {
                  // Show availability feedback
                  if (!result.can_fulfill) {
                    setError(`⚠️ Only ${result.available_quantity} units available for ${result.nomenclature}`);
                    setTimeout(() => setError(''), 5000);
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Items Selection */}
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
                  <Label htmlFor="categoryFilter" className="text-xs text-gray-600">Filter by Group</Label>
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
                    <SelectTrigger id="categoryFilter" className="mt-1">
                      <SelectValue placeholder="All Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Available Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {filteredInventory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {item.item_code ? <span className="text-blue-600 mr-2 font-mono text-xs">[{item.item_code}]</span> : null}
                        {item.nomenclature}
                      </div>
                      <div className="text-xs text-gray-500">
                        Location: {item.primary_Location}
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded mt-1 text-xs font-medium ${getInventoryQtyBadgeClass(getWingInventoryQty(item))}`}>
                        Wing Inventory Qty: {getWingInventoryQty(item)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addIssuanceItem(item)}
                      disabled={issuanceItems.some(i => i.inventory_id === item.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Custom Items Section */}
              <div className="border-t pt-4 mb-4">
                <h4 className="font-medium mb-3 text-blue-700">Add Custom Items</h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-3">
                    💡 Add items that are not in the inventory system
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label htmlFor="customItemName">Item Name</Label>
                      <Input
                        id="customItemName"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Enter custom item strOfficeName..."
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
                  <Button
                    onClick={addCustomItem}
                    disabled={!customItemName.trim()}
                    className="mt-3 w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Item
                  </Button>
                </div>
              </div>

              {/* Selected Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Selected Items ({issuanceItems.length})</h4>
                <div className="border rounded-lg">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="text-left px-3 py-2 w-[36%]">Item</th>
                        <th className="text-left px-3 py-2 w-[16%]">Last Issued Qty</th>
                        <th className="text-left px-3 py-2 w-[16%]">Last Issue Date</th>
                        <th className="text-left px-3 py-2 w-[32%]">Fresh Requirement</th>
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
                            {item.item_type !== 'custom' && (
                              <div className={`inline-flex items-center px-2 py-0.5 rounded mt-1 text-xs font-medium ${getInventoryQtyBadgeClass(getWingInventoryQty(item))}`}>
                                Wing Inventory Qty: {getWingInventoryQty(item)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">{item.item_type === 'custom' ? '-' : (item.last_issued_quantity ?? 0)}</td>
                          <td className="px-3 py-2">{item.item_type === 'custom' ? '-' : formatDate(item.last_issue_date)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.inventory_id, item.requested_quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-10 text-center text-sm font-medium">{item.requested_quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.inventory_id, item.requested_quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeIssuanceItem(item.inventory_id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t bg-gray-50 px-3 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => setIssuanceItems([])}
                      disabled={issuanceItems.length === 0}
                    >
                      Clear Selected Items
                    </Button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <PermissionGate 
                  permission="stock_request.create_wing"
                  fallback={
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Access Restricted:</strong> You don't have permission to create wing-level stock requests.
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
                        Submit Issuance Request
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

export default StockIssuanceWing;
