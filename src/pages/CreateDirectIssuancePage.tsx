import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  directIssuanceService, 
  CatalogItem, 
  EmployeeUser,
  DirectIssuancePayloadItem 
} from '@/services/directIssuanceService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { 
  ArrowLeft, Package, Search, Plus, Trash2, UserCheck, 
  Building2, Users, AlertCircle, CheckCircle2, ShoppingCart, 
  FileText, Check, X, Tag, Boxes, Layers, RefreshCw
} from 'lucide-react';

interface CartItem extends DirectIssuancePayloadItem {
  catalogItem: CatalogItem;
}

export const CreateDirectIssuancePage: React.FC = () => {
  const navigate = useNavigate();

  // Data lists
  const [itemsList, setItemsList] = useState<CatalogItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [employeesList, setEmployeesList] = useState<EmployeeUser[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Recipient form state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isManualRecipient, setIsManualRecipient] = useState(false);
  const [toWhomIssuedName, setToWhomIssuedName] = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [notes, setNotes] = useState('');

  // Item Picker state
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [currentQty, setCurrentQty] = useState<number>(1);

  // Multi-item Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCatalogItems();
    fetchEmployees();
  }, []);

  const fetchCatalogItems = async () => {
    try {
      setLoadingItems(true);
      const res = await directIssuanceService.getItemsCatalog();
      setItemsList(res.data || []);
    } catch (err) {
      console.error('Error loading items catalog:', err);
      toast.error('Failed to load item catalog');
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await directIssuanceService.getEmployees();
      setEmployeesList(res.data || []);
    } catch (err) {
      console.error('Error loading employees list:', err);
      toast.error('Failed to load employee directory');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Categories & Groups extracted from itemsList
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    itemsList.forEach(i => {
      if (i.category_name) cats.add(i.category_name);
    });
    return Array.from(cats).sort();
  }, [itemsList]);

  const uniqueGroups = useMemo(() => {
    const grps = new Set<number>();
    itemsList.forEach(i => {
      if (i.group_number !== null && i.group_number !== undefined) {
        grps.add(Number(i.group_number));
      }
    });
    return Array.from(grps).sort((a, b) => a - b);
  }, [itemsList]);

  // Filtered Items for Combobox
  const filteredCatalogItems = useMemo(() => {
    return itemsList.filter(item => {
      const q = itemSearchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.nomenclature.toLowerCase().includes(q) ||
        item.item_code.toLowerCase().includes(q) ||
        (item.category_name && item.category_name.toLowerCase().includes(q)) ||
        (item.group_number && `group ${item.group_number}`.includes(q)) ||
        (item.group_number && `grp ${item.group_number}`.includes(q));

      const matchCat = selectedCategoryFilter === 'all' || item.category_name === selectedCategoryFilter;
      const matchGrp = selectedGroupFilter === 'all' || String(item.group_number) === selectedGroupFilter;

      return matchSearch && matchCat && matchGrp;
    });
  }, [itemsList, itemSearchQuery, selectedCategoryFilter, selectedGroupFilter]);

  // Filtered Employees for Combobox
  const filteredEmployees = useMemo(() => {
    if (!userSearchQuery.trim()) return employeesList.slice(0, 50);
    const q = userSearchQuery.toLowerCase().trim();
    return employeesList.filter(u => {
      return (
        (u.FullName && u.FullName.toLowerCase().includes(q)) ||
        (u.DesignationName && u.DesignationName.toLowerCase().includes(q)) ||
        (u.WingName && u.WingName.toLowerCase().includes(q)) ||
        (u.DECName && u.DECName.toLowerCase().includes(q)) ||
        (u.OfficeName && u.OfficeName.toLowerCase().includes(q)) ||
        (u.CNIC && u.CNIC.includes(q)) ||
        (u.UserName && u.UserName.toLowerCase().includes(q))
      );
    }).slice(0, 50);
  }, [employeesList, userSearchQuery]);

  const handleSelectEmployee = (emp: EmployeeUser) => {
    setSelectedEmployee(emp);
    const formattedTitle = `${emp.FullName} - ${emp.DesignationName || 'Staff'}${emp.WingName ? ` (${emp.WingName})` : ''}`;
    setToWhomIssuedName(formattedTitle);
    if (!receivedByName) {
      setReceivedByName(emp.FullName);
    }
    setIsUserDropdownOpen(false);
  };

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setIsItemDropdownOpen(false);
    setCurrentQty(1);
  };

  const handleAddToCart = () => {
    if (!selectedItem) {
      toast.error('Please select an item to add');
      return;
    }

    if (currentQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    // Check if item already exists in cart
    const existingIndex = cart.findIndex(c => c.item_master_id === selectedItem.id);
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity_issued += currentQty;
      setCart(updatedCart);
      toast.info(`Updated quantity for "${selectedItem.nomenclature}" to ${updatedCart[existingIndex].quantity_issued}`);
    } else {
      setCart(prev => [
        ...prev,
        {
          item_master_id: selectedItem.id,
          quantity_issued: currentQty,
          catalogItem: selectedItem
        }
      ]);
      toast.success(`Added "${selectedItem.nomenclature}" (${currentQty} ${selectedItem.unit}) to issuance list`);
    }

    // Reset item selector
    setSelectedItem(null);
    setItemSearchQuery('');
    setCurrentQty(1);
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantity_issued = newQty;
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    const item = cart[index];
    setCart(prev => prev.filter((_, i) => i !== index));
    toast.info(`Removed "${item.catalogItem.nomenclature}" from list`);
  };

  const totalQuantitySum = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity_issued, 0);
  }, [cart]);

  const handleSubmitIssuance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Please add at least one item to the issuance list');
      return;
    }

    if (!toWhomIssuedName.trim()) {
      toast.error('Please select or enter "To Whom Issued" (Recipient Officer / Employee)');
      return;
    }

    if (!receivedByName.trim()) {
      toast.error('Please enter "Received By" (Person taking physical custody)');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        items: cart.map(c => ({
          item_master_id: c.item_master_id,
          quantity_issued: c.quantity_issued
        })),
        to_whom_issued_name: toWhomIssuedName.trim(),
        received_by_name: receivedByName.trim(),
        recipient_user_id: selectedEmployee?.Id || undefined,
        recipient_wing_id: selectedEmployee?.wing_id ? Number(selectedEmployee.wing_id) : undefined,
        recipient_branch_id: selectedEmployee?.branch_id ? String(selectedEmployee.branch_id) : undefined,
        source_store_type: 'admin',
        notes: notes.trim() || undefined
      };

      const res = await directIssuanceService.createDirectIssuance(payload);
      toast.success(res.message || 'Direct express issuance recorded successfully!');
      
      // Navigate back to the register page
      navigate('/dashboard/direct-issuance-register');
    } catch (error: any) {
      console.error('Error creating direct issuance:', error);
      toast.error(error.message || 'Failed to record direct issuance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/direct-issuance-register')}
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Issuance Register
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-600" />
              Direct / Express Multi-Item Issuance
            </h1>
            <p className="text-xs text-slate-500">
              Issue multiple stock items on-the-spot without a prior online requisition. Stock is immediately deducted and tracked with a physical receiving slip.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 px-3 py-1 font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
            Status: 🔴 Slip Not Received (Pending)
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmitIssuance} className="space-y-6">
        {/* SECTION 1: RECIPIENT & HANDOVER DETAILS */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              1. Recipient & Handover Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* TO WHOM ISSUED */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    To Whom Issued (Employee / Officer) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualRecipient(!isManualRecipient);
                      if (!isManualRecipient) {
                        setSelectedEmployee(null);
                        setUserSearchQuery('');
                      }
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    {isManualRecipient ? '🔍 Select from Active Staff' : '✏️ Manual Entry'}
                  </button>
                </div>

                {!isManualRecipient ? (
                  <div className="space-y-2">
                    {selectedEmployee ? (
                      <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {selectedEmployee.FullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{selectedEmployee.FullName}</div>
                            <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                              {selectedEmployee.DesignationName && (
                                <span className="font-medium text-indigo-900">{selectedEmployee.DesignationName}</span>
                              )}
                              {selectedEmployee.WingName && (
                                <span className="text-slate-500">• {selectedEmployee.WingName}</span>
                              )}
                              {selectedEmployee.DECName && (
                                <span className="text-slate-500">• {selectedEmployee.DECName}</span>
                              )}
                            </div>
                            {selectedEmployee.CNIC && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                CNIC: {selectedEmployee.CNIC}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(null);
                            setToWhomIssuedName('');
                            setIsUserDropdownOpen(true);
                          }}
                          className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search active staff by Name, Designation, Wing, CNIC..."
                            value={userSearchQuery}
                            onChange={e => {
                              setUserSearchQuery(e.target.value);
                              setIsUserDropdownOpen(true);
                            }}
                            onFocus={() => setIsUserDropdownOpen(true)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        {/* Employee Dropdown List */}
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                          {loadingEmployees ? (
                            <div className="p-4 text-center text-xs text-slate-500">Loading active employees...</div>
                          ) : filteredEmployees.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No matching employees found in AspNetUsers / REG_APP.
                            </div>
                          ) : (
                            filteredEmployees.map(emp => (
                              <div
                                key={emp.Id}
                                onClick={() => handleSelectEmployee(emp)}
                                className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 text-xs">{emp.FullName}</div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <span className="text-indigo-700 font-semibold">{emp.DesignationName || 'Staff'}</span>
                                    {emp.WingName && <span>• {emp.WingName}</span>}
                                    {emp.OfficeName && <span>• {emp.OfficeName}</span>}
                                  </div>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                  {emp.CNIC || emp.UserName}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Muhammad Ali (Assistant Director, IT Wing)"
                      value={toWhomIssuedName}
                      onChange={e => setToWhomIssuedName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Enter full name, designation, and wing/office of recipient.</p>
                  </div>
                )}
              </div>

              {/* RECEIVED BY & SOURCE STORE */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Received By (Physical Receiver) *
                    </label>
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={() => setReceivedByName(selectedEmployee.FullName)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                      >
                        Same as Recipient
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mehmood (Naib Qasid / Self)"
                    value={receivedByName}
                    onChange={e => setReceivedByName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Name of the person physically collecting items from the storekeeper.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Source Store
                    </label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      Main Admin Store
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Issuance Date
                    </label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: ADD ITEMS TO ISSUANCE */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-indigo-600" />
                2. Select & Add Items
              </span>
              <span className="text-xs font-normal text-slate-500">
                Catalog: {itemsList.length} items available
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Selected Item Preview or Search Box */}
            {selectedItem ? (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white font-mono text-xs">
                        {selectedItem.item_code}
                      </Badge>
                      {selectedItem.group_number && (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-xs">
                          Group {selectedItem.group_number}
                        </Badge>
                      )}
                      <Badge className="bg-slate-200 text-slate-700 text-xs">
                        {selectedItem.category_name}
                      </Badge>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1.5">
                      {selectedItem.nomenclature}
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItem(null);
                      setIsItemDropdownOpen(true);
                    }}
                    className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                  >
                    Change Item
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-indigo-200/60">
                  <div className="text-xs">
                    <span className="text-slate-500">Available Stock:</span>{' '}
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedItem.available_quantity} {selectedItem.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-xs font-bold text-slate-700 uppercase">Quantity to Issue:</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedItem.available_quantity > 0 ? selectedItem.available_quantity : 9999}
                      value={currentQty}
                      onChange={e => setCurrentQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 text-sm font-bold bg-white border border-indigo-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-600">{selectedItem.unit}</span>

                    <Button
                      type="button"
                      onClick={handleAddToCart}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold ml-2 shadow-md shadow-indigo-600/20"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add to Issuance List
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search item by name, code (GRP-..), category, group number..."
                    value={itemSearchQuery}
                    onChange={e => {
                      setItemSearchQuery(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategoryFilter}
                    onChange={e => setSelectedCategoryFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="all">📁 All Categories ({uniqueCategories.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={selectedGroupFilter}
                    onChange={e => setSelectedGroupFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="all">🏷️ All Groups ({uniqueGroups.length})</option>
                    {uniqueGroups.map(grp => (
                      <option key={grp} value={String(grp)}>Group {grp}</option>
                    ))}
                  </select>

                  <span className="text-[11px] text-slate-500 ml-auto font-medium">
                    Found {filteredCatalogItems.length} items
                  </span>
                </div>

                {/* Scrollable Items List */}
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {loadingItems ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading catalog items...</div>
                  ) : filteredCatalogItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching items found. Adjust your search or filters.
                    </div>
                  ) : (
                    filteredCatalogItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            {item.nomenclature}
                            {item.group_number && (
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                Group {item.group_number}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono text-slate-600">{item.item_code}</span>
                            <span>• {item.category_name}</span>
                            <span>• Unit: {item.unit}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">
                            {item.available_quantity} {item.unit}
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.available_quantity > 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.available_quantity > 0 ? 'In Stock' : 'Low/Zero Stock'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: ITEMS TO ISSUE CART TABLE */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-600" />
              3. Items to Issue ({cart.length} distinct items, {totalQuantitySum} total units)
            </CardTitle>
            {cart.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCart([])}
                className="text-red-600 hover:text-red-800 text-xs h-7 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Items Added to Issuance Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Search and select items from Section 2 above and click "Add to Issuance List" to include multiple items in this direct handover.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Item Code & Nomenclature</th>
                      <th className="p-3">Category & Group</th>
                      <th className="p-3 text-center">Available Stock</th>
                      <th className="p-3 text-center w-36">Quantity to Issue</th>
                      <th className="p-3 text-center">Item Status</th>
                      <th className="p-3 text-center w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {cart.map((cartItem, idx) => (
                      <tr key={cartItem.item_master_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-xs">{cartItem.catalogItem.nomenclature}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{cartItem.catalogItem.item_code}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium text-[11px]">
                              {cartItem.catalogItem.category_name}
                            </span>
                            {cartItem.catalogItem.group_number && (
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold text-[11px]">
                                Group {cartItem.catalogItem.group_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-700">
                            {cartItem.catalogItem.available_quantity} {cartItem.catalogItem.unit}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(idx, cartItem.quantity_issued - 1)}
                              className="h-7 w-7 rounded bg-slate-100 border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={cartItem.quantity_issued}
                              onChange={e => handleUpdateCartQty(idx, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(idx, cartItem.quantity_issued + 1)}
                              className="h-7 w-7 rounded bg-slate-100 border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                            >
                              +
                            </button>
                            <span className="text-[11px] text-slate-500 font-medium ml-1">{cartItem.catalogItem.unit}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className="bg-red-100 text-red-800 border-red-300 font-bold text-[11px] px-2 py-0.5">
                            🔴 Slip Pending
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: PURPOSE, NOTES & STOCK DEDUCTION BANNER */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              4. Remarks & Verification Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Purpose / Handover Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Urgent official stationery handover for upcoming meeting / election cell requirement..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-2 text-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                Physical Stock Deduction & Slip Receipt Lifecycle Notice
              </p>
              <p className="text-slate-700">
                1. Submitting will immediately deduct the specified quantities from the <strong>Main Admin Store</strong> and record transactions in the inventory audit ledger.
              </p>
              <p className="text-slate-700">
                2. The direct issuance and all {cart.length} item(s) will be listed in the Direct Issuance Register marked as 🔴 <strong>Slip Not Received (Pending)</strong> until the signed physical receiving voucher is uploaded.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FORM ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/direct-issuance-register')}
            className="border-slate-300 text-slate-700"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <LoadingSpinner />
                <span>Recording Issuance...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Confirm & Issue {cart.length} Item(s) ({totalQuantitySum} Units)</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDirectIssuancePage;
