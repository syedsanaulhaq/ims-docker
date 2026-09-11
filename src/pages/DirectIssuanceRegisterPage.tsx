import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  directIssuanceService, 
  DirectIssuanceItem,
  DirectIssuanceChildItem 
} from '@/services/directIssuanceService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { 
  Plus, Search, FileText, Eye, Upload, AlertCircle, CheckCircle2, 
  Bell, RefreshCw, Package, Printer, ShoppingCart, 
  Building2, Users, Layers, ExternalLink, Calendar, Check, X
} from 'lucide-react';

export const DirectIssuanceRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [issuances, setIssuances] = useState<DirectIssuanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Slip Upload Modal State
  const [selectedForUpload, setSelectedForUpload] = useState<DirectIssuanceItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Detail View Modal
  const [viewDetailItem, setViewDetailItem] = useState<DirectIssuanceItem | null>(null);

  useEffect(() => {
    fetchIssuances();
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
  const totalItemsIssued = issuances.reduce((acc, curr) => acc + (curr.total_quantity_issued || curr.quantity_issued || 0), 0);
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
      const matchChild = item.items?.some(child => 
        child.nomenclature?.toLowerCase().includes(term) ||
        child.item_code?.toLowerCase().includes(term) ||
        child.category_name?.toLowerCase().includes(term)
      );
      return matchNum || matchTo || matchRec || matchItem || matchChild;
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
            On-the-spot physical multi-item stock issuance log with official employee catalog integration, instant stock deduction, physical receiving slip tracking, and DD/DG reminder escalations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchIssuances()}
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>

          <Button
            onClick={() => navigate('/dashboard/direct-issuance-create')}
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
              <p className="text-xs font-semibold text-blue-700 uppercase">Total Units Issued</p>
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
              <Button 
                onClick={() => navigate('/dashboard/direct-issuance-create')} 
                size="sm" 
                className="bg-indigo-600 text-white mt-2"
              >
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
                    <th className="p-3">Issued Items & Categories</th>
                    <th className="p-3 text-center">Total Qty</th>
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
                    const hasMultipleItems = item.items && item.items.length > 1;
                    const itemsCount = item.items_count || (item.items ? item.items.length : 1);
                    const totalQty = item.total_quantity_issued || item.quantity_issued || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.to_whom_issued_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.issuance_number}</div>
                        </td>
                        <td className="p-3">
                          {hasMultipleItems ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5">
                                  📦 {itemsCount} Items Bundle
                                </Badge>
                              </div>
                              <div className="text-[11px] text-slate-600 max-w-md truncate">
                                {item.items?.map(it => `${it.nomenclature || 'Item'} (${it.quantity_issued})`).join(', ')}
                              </div>
                            </div>
                          ) : item.items && item.items.length === 1 ? (
                            <div>
                              <div className="font-semibold text-indigo-950">{item.items[0].nomenclature}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                {item.items[0].category_name && (
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                                    {item.items[0].category_name}
                                  </span>
                                )}
                                {item.items[0].group_number && (
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                                    Group {item.items[0].group_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
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
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-1 font-bold text-sm bg-slate-100 text-slate-900 rounded-md border border-slate-200">
                            {totalQty} units
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
              <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1.5">
                <p className="font-semibold text-slate-800">Issuance: <span className="font-mono text-slate-600">{selectedForUpload.issuance_number}</span></p>
                <p className="text-slate-600">Issued To: <strong>{selectedForUpload.to_whom_issued_name}</strong></p>
                <p className="text-slate-600">Physical Receiver: <strong>{selectedForUpload.received_by_name}</strong></p>
                <div className="pt-1 text-slate-700 font-medium">
                  {selectedForUpload.items && selectedForUpload.items.length > 0 ? (
                    <div>
                      <span>Items to verify ({selectedForUpload.items.length}):</span>
                      <ul className="list-disc list-inside mt-0.5 text-slate-600">
                        {selectedForUpload.items.map((it, i) => (
                          <li key={i}>{it.nomenclature} - {it.quantity_issued} {it.unit || 'units'}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <span>Item: <strong>{selectedForUpload.item_nomenclature}</strong> (Qty: {selectedForUpload.quantity_issued})</span>
                  )}
                </div>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
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
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Issued By (Storekeeper)</span>
                <span className="font-medium text-slate-900 mt-0.5 block">{viewDetailItem.issuer_full_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Date Issued</span>
                <span className="font-medium text-slate-900 mt-0.5 block">
                  {new Date(viewDetailItem.issuance_date).toLocaleString()}
                </span>
              </div>

              {/* Items Breakdown Table */}
              <div className="col-span-2 space-y-1.5">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Issued Stock Items Breakdown</span>
                {viewDetailItem.items && viewDetailItem.items.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Item Code</th>
                          <th className="p-2.5">Nomenclature</th>
                          <th className="p-2.5">Group / Category</th>
                          <th className="p-2.5 text-center">Quantity</th>
                          <th className="p-2.5 text-center">Item Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {viewDetailItem.items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-slate-600">{it.item_code || '-'}</td>
                            <td className="p-2.5 font-semibold text-slate-900">{it.nomenclature}</td>
                            <td className="p-2.5 text-slate-600">
                              {it.group_number ? `Group ${it.group_number}` : ''} {it.category_name ? `(${it.category_name})` : ''}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-900">
                              {it.quantity_issued} {it.unit || 'units'}
                            </td>
                            <td className="p-2.5 text-center">
                              {it.item_status === 'received' || viewDetailItem.slip_status === 'slip_received' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">🟢 Received</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 text-[10px]">🔴 Slip Pending</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{viewDetailItem.item_nomenclature}</span>
                      <span className="text-slate-500 text-[11px] block">{viewDetailItem.category_name}</span>
                    </div>
                    <span className="font-bold text-indigo-950 text-sm">
                      {viewDetailItem.quantity_issued} {viewDetailItem.item_unit || 'units'}
                    </span>
                  </div>
                )}
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
