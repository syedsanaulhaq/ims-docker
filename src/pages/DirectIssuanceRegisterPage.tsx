import React, { useState, useEffect } from 'react';
import { 
  directIssuanceService, 
  DirectIssuanceItem, 
  CreateDirectIssuancePayload 
} from '@/services/directIssuanceService';
import { itemMasterApi } from '@/services/itemMasterApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { 
  Plus, Search, FileText, Send, Eye, Upload, AlertCircle, CheckCircle2, 
  Bell, RefreshCw, Calendar, ArrowRight, UserCheck, Package, Download, Printer
} from 'lucide-react';

export const DirectIssuanceRegisterPage: React.FC = () => {
  const [issuances, setIssuances] = useState<DirectIssuanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Item masters list for issuance creation
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // New Issuance Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemStock, setSelectedItemStock] = useState<number | null>(null);
  const [formPayload, setFormPayload] = useState<CreateDirectIssuancePayload>({
    item_master_id: '',
    quantity_issued: 1,
    to_whom_issued_name: '',
    received_by_name: '',
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
    fetchItemMasters();
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

  const fetchItemMasters = async () => {
    try {
      setLoadingItems(true);
      const res = await itemMasterApi.getItemMasters();
      const list = Array.isArray(res) ? res : res?.data || [];
      setItemsList(list);
    } catch (err) {
      console.error('Error loading item masters:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setFormPayload(prev => ({ ...prev, item_master_id: itemId }));
    const found = itemsList.find(i => String(i.id) === itemId);
    if (found) {
      setSelectedItemStock(found.available_quantity ?? found.total_quantity ?? 0);
    } else {
      setSelectedItemStock(null);
    }
  };

  const handleCreateIssuance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPayload.item_master_id) {
      toast.error('Please select an item to issue');
      return;
    }
    if (!formPayload.to_whom_issued_name.trim()) {
      toast.error('Please enter "To Whom Issued" (Employee/Officer)');
      return;
    }
    if (!formPayload.received_by_name.trim()) {
      toast.error('Please enter "Received By" (Person taking delivery)');
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
      setFormPayload({
        item_master_id: '',
        quantity_issued: 1,
        to_whom_issued_name: '',
        received_by_name: '',
        notes: ''
      });
      setSelectedItemId('');
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
      const res = await directIssuanceService.uploadReceivingSlip(selectedForUpload.id, uploadFile);
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

  const handleSendReminder = async (item: DirectIssuanceItem, target: 'DD Admin' | 'DG Admin') => {
    try {
      const res = await directIssuanceService.sendReminder(item.id, target);
      toast.success(`Reminder sent to ${target} for ${item.issuance_number}!`);
      fetchIssuances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminder');
    }
  };

  const filteredIssuances = issuances.filter(item => {
    if (statusFilter !== 'all' && item.slip_status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        item.issuance_number.toLowerCase().includes(term) ||
        item.to_whom_issued_name.toLowerCase().includes(term) ||
        item.received_by_name.toLowerCase().includes(term) ||
        (item.item_nomenclature || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalIssuedQty = issuances.reduce((acc, i) => acc + (i.quantity_issued || 0), 0);
  const totalPendingSlips = issuances.filter(i => i.slip_status === 'slip_not_received').length;
  const totalConfirmedSlips = issuances.filter(i => i.slip_status === 'slip_received').length;
  const totalRemindersSent = issuances.reduce((acc, i) => acc + (i.reminder_count || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Direct Issuance Register</span>
            <Badge className="bg-amber-100 text-amber-900 border-amber-300">Without Requisition</Badge>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Express direct stock issuance, physical receiving slip tracking (Red/Green), and DD/DG reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchIssuances}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow"
          >
            <Plus className="h-4 w-4" />
            New Direct Issuance
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase">Total Items Issued</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1">{totalIssuedQty}</h3>
              <p className="text-xs text-blue-600 mt-1">{issuances.length} issuance transactions</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase">🔴 Slip Not Received</p>
              <h3 className="text-2xl font-bold text-red-900 mt-1">{totalPendingSlips}</h3>
              <p className="text-xs text-red-600 mt-1">Receiving voucher pending</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase">🟢 Slip Received</p>
              <h3 className="text-2xl font-bold text-emerald-900 mt-1">{totalConfirmedSlips}</h3>
              <p className="text-xs text-emerald-600 mt-1">Signed receipt verified</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-purple-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase">DD / DG Reminders</p>
              <h3 className="text-2xl font-bold text-purple-900 mt-1">{totalRemindersSent}</h3>
              <p className="text-xs text-purple-600 mt-1">Escalations sent</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg text-purple-700">
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
                placeholder="Search issuance #, employee, receiver, or item..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Main Register Table (Matching Client Physical Notebook) */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Express Issuance Register (Without Requisition)
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
              <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-blue-600 text-white mt-2">
                Record First Direct Issuance
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">Sr #</th>
                    <th className="p-3">To Whom Issued</th>
                    <th className="p-3">Item Nomenclature</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3">Received By</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3 text-center">Status</th>
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
                          <div className="font-semibold text-blue-900">{item.item_nomenclature || 'Item Master'}</div>
                          <div className="text-[11px] text-slate-500">Source: {item.source_store_type?.toUpperCase()} STORE</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-1 font-bold text-sm bg-slate-100 text-slate-900 rounded-md border border-slate-200">
                            {item.quantity_issued}
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
                        <td className="p-3 text-center">
                          {item.reminder_count > 0 ? (
                            <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <Bell className="h-3 w-3 text-purple-600" />
                              <span>{item.reminder_count} Sent</span>
                              {item.escalated_to_designation && (
                                <span className="text-[10px] text-purple-600">({item.escalated_to_designation})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          {isRed && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => setSelectedForUpload(item)}
                              >
                                <Upload className="h-3 w-3 mr-1" /> Upload Slip
                              </Button>

                              <div className="inline-block relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                                  onClick={() => handleSendReminder(item, 'DD Admin')}
                                >
                                  <Bell className="h-3 w-3 mr-1" /> Remind DD/DG
                                </Button>
                              </div>
                            </>
                          )}

                          {!isRed && item.slip_proof_url && (
                            <a
                              href={`http://localhost:3001${item.slip_proof_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Slip
                            </a>
                          )}
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                New Express Direct Issuance
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIssuance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Item Master *
                </label>
                <select
                  value={selectedItemId}
                  onChange={e => handleItemSelect(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Item from Inventory Catalog --</option>
                  {itemsList.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nomenclature} (Available: {item.available_quantity ?? item.total_quantity ?? 0} {item.unit || 'units'})
                    </option>
                  ))}
                </select>
                {selectedItemStock !== null && (
                  <p className="text-xs font-semibold text-emerald-700 mt-1">
                    📦 Physical Stock Available: {selectedItemStock} units
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quantity to Issue *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPayload.quantity_issued}
                    onChange={e => setFormPayload(prev => ({ ...prev, quantity_issued: Number(e.target.value) }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Received By (Person) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fazal"
                    value={formPayload.received_by_name}
                    onChange={e => setFormPayload(prev => ({ ...prev, received_by_name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  To Whom Issued (Employee / Officer / Section) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sr. Stack Developer / Software Wing"
                  value={formPayload.to_whom_issued_name}
                  onChange={e => setFormPayload(prev => ({ ...prev, to_whom_issued_name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes / Purpose (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Express handover on urgent basis..."
                  value={formPayload.notes || ''}
                  onChange={e => setFormPayload(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Instant Physical Stock Deduction
                </p>
                <p>Submitting will deduct stock immediately and create a entry marked as 🔴 <strong>Slip Not Received</strong> until paper voucher is uploaded.</p>
              </div>

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
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {submitting ? 'Issuing...' : 'Confirm & Issue Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD RECEIVING SLIP MODAL */}
      {selectedForUpload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Upload Physical Receiving Slip
              </h3>
              <button onClick={() => setSelectedForUpload(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p><strong>Issuance #:</strong> {selectedForUpload.issuance_number}</p>
                <p><strong>To Whom:</strong> {selectedForUpload.to_whom_issued_name}</p>
                <p><strong>Item:</strong> {selectedForUpload.item_nomenclature} ({selectedForUpload.quantity_issued} Qty)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Signed Slip Document / Image *
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 border border-slate-300 rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
    </div>
  );
};

export default DirectIssuanceRegisterPage;
