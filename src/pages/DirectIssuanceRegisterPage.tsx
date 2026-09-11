import React, { useState, useEffect, useMemo } from 'react';
import { 
  directIssuanceService, 
  DirectIssuanceItem, 
  CatalogItem,
  EmployeeUser,
  CreateDirectIssuancePayload 
} from '@/services/directIssuanceService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { 
  Plus, Search, FileText, Send, Eye, Upload, AlertCircle, CheckCircle2, 
  Bell, RefreshCw, Calendar, ArrowRight, UserCheck, Package, Printer,
  Building2, Users, User, Check, X, Tag, Boxes, Layers, ChevronDown
} from 'lucide-react';

export const DirectIssuanceRegisterPage: React.FC = () => {
  const [issuances, setIssuances] = useState<DirectIssuanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Catalog Items & Active Employees state
  const [itemsList, setItemsList] = useState<CatalogItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [employeesList, setEmployeesList] = useState<EmployeeUser[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // New Issuance Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Item Selection State
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

  // Modal Recipient Selection State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isManualRecipient, setIsManualRecipient] = useState(false);

  // Form Payload
  const [formPayload, setFormPayload] = useState<CreateDirectIssuancePayload>({
    item_master_id: '',
    quantity_issued: 1,
    to_whom_issued_name: '',
    received_by_name: '',
    recipient_user_id: '',
    recipient_wing_id: undefined,
    recipient_branch_id: '',
    source_store_type: 'admin',
    notes: ''
  });

  // Slip Upload Modal State
  const [selectedForUpload, setSelectedForUpload] = useState<DirectIssuanceItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Detail View Modal
  const [viewDetailItem, setViewDetailItem] = useState<DirectIssuanceItem | null>(null);

  useEffect(() => {
    fetchIssuances();
    fetchCatalogItems();
    fetchEmployees();
  }, []);

  const fetchIssuances = async () => {
    try {
      setLoading(true);
      const res = await directIssuanceService.getDirectIssuances({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm.trim() || undefined
      });
      setIssuances(res.data || []);
    } catch (error: any) {
      console.error('Error fetching direct issuances:', error);
      toast.error(error.message || 'Failed to load issuance register');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      setLoadingItems(true);
      const res = await directIssuanceService.getItemsCatalog();
      setItemsList(res.data || []);
    } catch (err) {
      console.error('Error loading items catalog:', err);
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

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setFormPayload(prev => ({
      ...prev,
      item_master_id: item.id
    }));
    setIsItemDropdownOpen(false);
  };

  const handleSelectEmployee = (emp: EmployeeUser) => {
    setSelectedEmployee(emp);
    const formattedTitle = `${emp.FullName} - ${emp.DesignationName || 'Staff'}${emp.WingName ? ` (${emp.WingName})` : ''}`;
    setFormPayload(prev => ({
      ...prev,
      recipient_user_id: emp.Id,
      to_whom_issued_name: formattedTitle,
      recipient_wing_id: emp.wing_id || undefined,
      recipient_branch_id: emp.branch_id ? String(emp.branch_id) : undefined,
      // If received_by is empty, default to employee name
      received_by_name: prev.received_by_name ? prev.received_by_name : emp.FullName
    }));
    setIsUserDropdownOpen(false);
  };

  const handleCreateIssuance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPayload.item_master_id) {
      toast.error('Please select an item to issue');
      return;
    }
    if (!formPayload.to_whom_issued_name.trim()) {
      toast.error('Please select or enter "To Whom Issued" (Employee / Officer)');
      return;
    }
    if (!formPayload.received_by_name.trim()) {
      toast.error('Please enter "Received By" (Person taking physical delivery)');
      return;
    }
    if (formPayload.quantity_issued <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const res = await directIssuanceService.createDirectIssuance(formPayload);
      toast.success(res.message || 'Direct express issuance recorded successfully!');
      setShowNewModal(false);
      
      // Reset form
      setSelectedItem(null);
      setSelectedEmployee(null);
      setItemSearchQuery('');
      setUserSearchQuery('');
      setFormPayload({
        item_master_id: '',
        quantity_issued: 1,
        to_whom_issued_name: '',
        received_by_name: '',
        recipient_user_id: '',
        recipient_wing_id: undefined,
        recipient_branch_id: '',
        source_store_type: 'admin',
        notes: ''
      });
      fetchIssuances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record direct issuance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSlip = async () => {
    if (!selectedForUpload || !uploadFile) {
      toast.error('Please select a receiving slip file to upload');
      return;
    }

    try {
      setUploading(true);
      await directIssuanceService.uploadReceivingSlip(selectedForUpload.id, uploadFile);
      toast.success('Receiving slip verified! Status updated to GREEN (Slip Received).');
      setSelectedForUpload(null);
      setUploadFile(null);
      fetchIssuances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receiving slip');
    } finally {
      setUploading(false);
    }
  };

  const handleSendReminder = async (item: DirectIssuanceItem, targetDesignation = 'DD Admin') => {
    try {
      const res = await directIssuanceService.sendReminder(item.id, targetDesignation);
      toast.success(res.message || `Reminder sent to ${targetDesignation}!`);
      fetchIssuances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminder');
    }
  };

  // Metrics Calculation
  const totalItemsIssued = issuances.reduce((acc, curr) => acc + (curr.quantity_issued || 0), 0);
  const pendingSlipsCount = issuances.filter(i => i.slip_status === 'slip_not_received').length;
  const receivedSlipsCount = issuances.filter(i => i.slip_status === 'slip_received').length;
  const totalRemindersSent = issuances.reduce((acc, curr) => acc + (curr.reminder_count || 0), 0);

  const filteredIssuances = issuances.filter(item => {
    if (statusFilter !== 'all' && item.slip_status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = item.issuance_number?.toLowerCase().includes(term);
      const matchTo = item.to_whom_issued_name?.toLowerCase().includes(term);
      const matchRec = item.received_by_name?.toLowerCase().includes(term);
      const matchItem = item.item_nomenclature?.toLowerCase().includes(term);
      return matchNum || matchTo || matchRec || matchItem;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package className="h-7 w-7 text-indigo-400" />
              Direct Issuance Register
            </h1>
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 font-semibold">
              Without Requisition
            </Badge>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            On-the-spot physical stock issuance log with official employee catalog integration, instant stock deduction, physical receiving slip tracking, and DD/DG reminder escalations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              fetchIssuances();
              fetchCatalogItems();
              fetchEmployees();
            }}
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>

          <Button
            onClick={() => setShowNewModal(true)}
            size="sm"
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Direct Issuance
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase">Total Items Issued</p>
              <h3 className="text-2xl font-bold text-blue-950 mt-1">{totalItemsIssued}</h3>
              <p className="text-xs text-blue-600 mt-1">{issuances.length} issuance records</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase">🔴 Slip Not Received</p>
              <h3 className="text-2xl font-bold text-red-950 mt-1">{pendingSlipsCount}</h3>
              <p className="text-xs text-red-600 mt-1">Pending physical voucher</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase">🟢 Slip Received</p>
              <h3 className="text-2xl font-bold text-emerald-950 mt-1">{receivedSlipsCount}</h3>
              <p className="text-xs text-emerald-600 mt-1">Verified & acknowledged</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 shadow-sm bg-purple-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase">DD / DG Reminders</p>
              <h3 className="text-2xl font-bold text-purple-950 mt-1">{totalRemindersSent}</h3>
              <p className="text-xs text-purple-600 mt-1">Escalations sent</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
              <Bell className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search issuance #, employee, receiver, or item code/name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('slip_not_received')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'slip_not_received'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <span>🔴</span> Slip Not Received
              </button>
              <button
                onClick={() => setStatusFilter('slip_received')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'slip_received'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>🟢</span> Slip Received
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5">
              <Printer className="h-4 w-4" /> Print Register
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Register Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Express Issuance Register Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner />
              <p className="text-sm text-slate-500 mt-2">Loading issuance ledger...</p>
            </div>
          ) : filteredIssuances.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="h-12 w-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-semibold text-slate-700">No Direct Issuances Found</h4>
              <p className="text-xs text-slate-500">Record a direct issuance on the spot to start tracking physical receipts.</p>
              <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-indigo-600 text-white mt-2">
                Record First Direct Issuance
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">Sr #</th>
                    <th className="p-3">To Whom Issued (Employee)</th>
                    <th className="p-3">Item Details</th>
                    <th className="p-3 text-center">Qty Issued</th>
                    <th className="p-3">Received By</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3 text-center">Slip Status</th>
                    <th className="p-3 text-center">Reminders</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredIssuances.map((item, index) => {
                    const isRed = item.slip_status === 'slip_not_received';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.to_whom_issued_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.issuance_number}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-indigo-950">{item.item_nomenclature || 'Item Master'}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            {item.category_name && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                                {item.category_name}
                              </span>
                            )}
                            {item.item_group_number && (
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                                Group {item.item_group_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-1 font-bold text-sm bg-slate-100 text-slate-900 rounded-md border border-slate-200">
                            {item.quantity_issued} {item.item_unit || 'units'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {item.received_by_name}
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {new Date(item.issuance_date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {isRed ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300 font-bold px-2.5 py-1">
                              🔴 Slip Not Received
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2.5 py-1">
                              🟢 Slip Received
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.reminder_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[11px]">
                              <Bell className="h-3 w-3" /> {item.reminder_count} sent
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewDetailItem(item)}
                              title="View Issuance Details"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {isRed && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedForUpload(item)}
                                  title="Upload Signed Receiving Slip"
                                  className="h-8 px-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-semibold"
                                >
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  Upload Slip
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(item, 'DD Admin')}
                                  title="Send DD Admin Reminder"
                                  className="h-8 px-2 text-xs bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 font-semibold"
                                >
                                  <Bell className="h-3.5 w-3.5 mr-1" />
                                  Remind
                                </Button>
                              </>
                            )}

                            {!isRed && item.slip_proof_url && (
                              <a
                                href={item.slip_proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-2 text-xs bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 font-semibold rounded-md flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Slip
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW DIRECT ISSUANCE MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  New Express Direct Issuance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct issuance with real-time employee lookup & catalog group/category selection.
                </p>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIssuance} className="space-y-4">
              
              {/* 1. SELECT ITEM MASTER */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Item Master *
                  </label>
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(null);
                        setFormPayload(prev => ({ ...prev, item_master_id: '' }));
                        setIsItemDropdownOpen(true);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                    >
                      Change Item
                    </button>
                  )}
                </div>

                {!selectedItem ? (
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    {/* Item Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search item by name, code (GRP-..), category, group..."
                        value={itemSearchQuery}
                        onChange={e => {
                          setItemSearchQuery(e.target.value);
                          setIsItemDropdownOpen(true);
                        }}
                        onFocus={() => setIsItemDropdownOpen(true)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Category & Group Quick Filters */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <select
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none"
                      >
                        <option value="all">📁 All Categories ({uniqueCategories.length})</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <select
                        value={selectedGroupFilter}
                        onChange={e => setSelectedGroupFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none"
                      >
                        <option value="all">🏷️ All Groups ({uniqueGroups.length})</option>
                        {uniqueGroups.map(grp => (
                          <option key={grp} value={String(grp)}>Group {grp}</option>
                        ))}
                      </select>

                      <span className="text-[11px] text-slate-500 ml-auto font-medium">
                        Showing {filteredCatalogItems.length} items
                      </span>
                    </div>

                    {/* Scrollable Items List */}
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {loadingItems ? (
                        <div className="p-4 text-center text-xs text-slate-500">Loading catalog items...</div>
                      ) : filteredCatalogItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No items match your search</div>
                      ) : (
                        filteredCatalogItems.slice(0, 100).map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="p-2.5 hover:bg-indigo-50/80 cursor-pointer flex items-center justify-between transition-colors text-left"
                          >
                            <div className="space-y-0.5 flex-1 pr-2">
                              <div className="text-xs font-bold text-slate-900">{item.nomenclature}</div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-mono text-slate-600 font-semibold">{item.item_code}</span>
                                {item.category_name && (
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    {item.category_name}
                                  </span>
                                )}
                                {item.group_number && (
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold border border-indigo-200">
                                    Group {item.group_number}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                              <span className="text-xs font-bold text-slate-700 block">
                                {item.available_quantity} {item.unit || 'units'}
                              </span>
                              <span className="text-[10px] text-slate-400">In Admin Store</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected Item Highlight Card */
                  <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {selectedItem.nomenclature}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-800">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                          Code: {selectedItem.item_code}
                        </span>
                        {selectedItem.category_name && (
                          <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">
                            Category: <strong>{selectedItem.category_name}</strong>
                          </span>
                        )}
                        {selectedItem.group_number && (
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                            Group {selectedItem.group_number}
                          </span>
                        )}
                        <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">
                          Unit: {selectedItem.unit || 'Nos.'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right pl-3">
                      <div className="text-sm font-black text-indigo-900">
                        {selectedItem.available_quantity} {selectedItem.unit || 'units'}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold">Available Stock</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. TO WHOM ISSUED (EMPLOYEE / OFFICER) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    To Whom Issued (Employee / Officer) *
                  </label>
                  <div className="flex items-center gap-3">
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployee(null);
                          setFormPayload(prev => ({
                            ...prev,
                            recipient_user_id: '',
                            to_whom_issued_name: ''
                          }));
                          setIsUserDropdownOpen(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                      >
                        Change Employee
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsManualRecipient(!isManualRecipient)}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      {isManualRecipient ? 'Switch to Employee Catalog' : 'Manual Entry'}
                    </button>
                  </div>
                </div>

                {isManualRecipient ? (
                  <input
                    type="text"
                    placeholder="Enter full name, designation and wing manually..."
                    value={formPayload.to_whom_issued_name}
                    onChange={e => setFormPayload(prev => ({ ...prev, to_whom_issued_name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                ) : !selectedEmployee ? (
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    {/* User Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employee by Name, Designation, Wing, DEC, CNIC..."
                        value={userSearchQuery}
                        onChange={e => {
                          setUserSearchQuery(e.target.value);
                          setIsUserDropdownOpen(true);
                        }}
                        onFocus={() => setIsUserDropdownOpen(true)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Scrollable Employees List */}
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {loadingEmployees ? (
                        <div className="p-4 text-center text-xs text-slate-500">Loading active employees...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No employees match your search</div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div
                            key={emp.Id}
                            onClick={() => handleSelectEmployee(emp)}
                            className="p-2.5 hover:bg-indigo-50/80 cursor-pointer flex items-center justify-between transition-colors text-left"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-indigo-600" />
                                {emp.FullName}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                {emp.DesignationName && (
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-700">
                                    {emp.DesignationName}
                                  </span>
                                )}
                                {emp.WingName && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">
                                    {emp.WingName}
                                  </span>
                                )}
                                {emp.DECName && emp.DECName !== emp.WingName && (
                                  <span className="text-slate-400">({emp.DECName})</span>
                                )}
                                {emp.CNIC && (
                                  <span className="font-mono text-slate-400 text-[10px] ml-1">CNIC: {emp.CNIC}</span>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600">
                              Select
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected Employee Highlight Card */
                  <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-blue-950 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {selectedEmployee.FullName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-blue-800">
                        {selectedEmployee.DesignationName && (
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-semibold">
                            {selectedEmployee.DesignationName}
                          </span>
                        )}
                        {selectedEmployee.WingName && (
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-medium">
                            {selectedEmployee.WingName}
                          </span>
                        )}
                        {selectedEmployee.OfficeName && (
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                            {selectedEmployee.OfficeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFormPayload(prev => ({ ...prev, received_by_name: selectedEmployee.FullName }))}
                      className="text-xs bg-white text-blue-700 hover:bg-blue-100 border-blue-300"
                    >
                      Set as Receiver
                    </Button>
                  </div>
                )}
              </div>

              {/* 3. QUANTITY & RECEIVED BY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Quantity to Issue * {selectedItem?.unit && `(${selectedItem.unit})`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPayload.quantity_issued}
                    onChange={e => setFormPayload(prev => ({ ...prev, quantity_issued: Number(e.target.value) }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Received By (Person taking delivery) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Employee self / Driver / Messenger"
                    value={formPayload.received_by_name}
                    onChange={e => setFormPayload(prev => ({ ...prev, received_by_name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. NOTES / PURPOSE */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Notes / Purpose (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Express handover / emergency requirement notes..."
                  value={formPayload.notes || ''}
                  onChange={e => setFormPayload(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Warning Banner */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Instant Physical Stock Deduction
                </p>
                <p>
                  Submitting will deduct stock immediately and create a entry marked as 🔴 <strong>Slip Not Received</strong> until the signed paper voucher is uploaded.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !selectedItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  {submitting ? 'Recording Issuance...' : 'Confirm & Issue Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD RECEIVING SLIP MODAL */}
      {selectedForUpload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Upload Physical Receiving Slip
              </h3>
              <button onClick={() => setSelectedForUpload(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                <p className="font-semibold text-slate-800">Issuance: <span className="font-mono text-slate-600">{selectedForUpload.issuance_number}</span></p>
                <p className="text-slate-600">Issued To: <strong>{selectedForUpload.to_whom_issued_name}</strong></p>
                <p className="text-slate-600">Item: <strong>{selectedForUpload.item_nomenclature}</strong> (Qty: {selectedForUpload.quantity_issued})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Upload Signed Slip (Image / PDF) *
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setSelectedForUpload(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSlip}
                  disabled={uploading || !uploadFile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {uploading ? 'Uploading...' : 'Verify & Set GREEN (Received)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewDetailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Issuance Details: {viewDetailItem.issuance_number}
              </h3>
              <button onClick={() => setViewDetailItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Issued To</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{viewDetailItem.to_whom_issued_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Received By</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{viewDetailItem.received_by_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Item Nomenclature</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{viewDetailItem.item_nomenclature}</span>
                {viewDetailItem.category_name && (
                  <span className="text-[11px] text-slate-500">Category: {viewDetailItem.category_name}</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Quantity Issued</span>
                <span className="font-bold text-indigo-950 text-base mt-0.5 block">
                  {viewDetailItem.quantity_issued} {viewDetailItem.item_unit || 'units'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Issued By (Storekeeper)</span>
                <span className="font-medium text-slate-900 mt-0.5 block">{viewDetailItem.issuer_full_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Date Issued</span>
                <span className="font-medium text-slate-900 mt-0.5 block">
                  {new Date(viewDetailItem.issuance_date).toLocaleString()}
                </span>
              </div>

              <div className="col-span-2 p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Slip Status</span>
                <div className="mt-1 flex items-center justify-between">
                  {viewDetailItem.slip_status === 'slip_received' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                      🟢 Slip Received & Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-red-300 font-bold">
                      🔴 Slip Not Received (Pending Voucher)
                    </Badge>
                  )}
                  {viewDetailItem.slip_proof_url && (
                    <a
                      href={viewDetailItem.slip_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Uploaded Slip
                    </a>
                  )}
                </div>
              </div>

              {viewDetailItem.notes && (
                <div className="col-span-2 p-3 bg-slate-50 rounded-lg border">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Notes</span>
                  <p className="text-slate-700 mt-0.5">{viewDetailItem.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t pt-3">
              <Button variant="outline" onClick={() => setViewDetailItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectIssuanceRegisterPage;
