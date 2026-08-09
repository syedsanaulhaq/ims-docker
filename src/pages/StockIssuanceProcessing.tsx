import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { getApiBaseUrl } from '@/services/invmisApi';
import { stockIssuanceService } from '@/services/stockIssuanceService';
import { formatDateDMY } from '@/utils/dateUtils';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Package, CheckCircle, AlertCircle, Truck, User, Calendar,
  FileText, Send, Eye, Upload, X, Image, ChevronDown,
  ClipboardCheck, Car, UserCheck, ArrowRight, RefreshCw
} from 'lucide-react';

const API = () => getApiBaseUrl();

// ─── types ────────────────────────────────────────────────────────────────────
interface RequestRow {
  id: string;
  request_number: string;
  requester_name: string;
  office_name: string;
  wing_name: string;
  purpose: string;
  urgency_level: string;
  approval_status: string;
  dispatch_method?: string;
  dispatcher_name?: string;
  dispatched_at?: string;
  delivery_confirmed_at?: string;
  delivery_proof_url?: string;
  items: { nomenclature: string; requested_quantity: number; approved_quantity?: number }[];
  updated_at: string;
}

type DispatchMethod = 'Direct' | 'NQ' | 'Driver';

// ─── helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  const l = (s || '').toLowerCase();
  if (l.includes('approved') || l.includes('admin')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (l === 'issued') return 'bg-blue-100 text-blue-800 border-blue-300';
  if (l === 'dispatched') return 'bg-violet-100 text-violet-800 border-violet-300';
  if (l === 'delivered') return 'bg-teal-100 text-teal-800 border-teal-300';
  if (l === 'completed') return 'bg-gray-100 text-gray-700 border-gray-300';
  return 'bg-yellow-100 text-yellow-800 border-yellow-300';
};

const methodIcon = (m: DispatchMethod) => {
  if (m === 'NQ') return <UserCheck className="h-5 w-5" />;
  if (m === 'Driver') return <Car className="h-5 w-5" />;
  return <ArrowRight className="h-5 w-5" />;
};

// ─── component ────────────────────────────────────────────────────────────────
const StockIssuanceProcessing: React.FC = () => {
  const { user } = useSession();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // dispatch modal state
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState<DispatchMethod>('Direct');
  const [dispatcherName, setDispatcherName] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // proof upload (for NQ/Driver from this page too)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // issue first then dispatch
  const [issuanceNotes, setIssuanceNotes] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await stockIssuanceService.getApprovedRequests();
      // Also fetch dispatched/issued requests still pending receipt
      const allRes = await fetch(`${API()}/stock-issuance/requests?status=Issued`, { credentials: 'include' });
      const allData = await allRes.json();
      const extra = allData.success ? allData.data : [];

      const rows: RequestRow[] = [...data, ...extra].map((r: any) => ({
        id: r.id,
        request_number: r.request_number,
        requester_name: r.requester?.full_name || r.requester_name || 'Unknown',
        office_name: r.office?.name || r.office?.office_name || '',
        wing_name: r.wing?.name || '',
        purpose: r.purpose || '',
        urgency_level: r.urgency_level || 'Normal',
        approval_status: r.approval_status || '',
        dispatch_method: r.dispatch_method,
        dispatcher_name: r.dispatcher_name,
        dispatched_at: r.dispatched_at,
        delivery_confirmed_at: r.delivery_confirmed_at,
        delivery_proof_url: r.delivery_proof_url,
        items: r.items || [],
        updated_at: r.updated_at
      }));

      // De-dup by id
      const seen = new Set<string>();
      setRequests(rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
    } catch (e: any) {
      setError('Failed to load requests: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDispatch = (req: RequestRow) => {
    setSelected(req);
    setMethod('Direct');
    setDispatcherName('');
    setDispatchNotes('');
    setIssuanceNotes('');
    setProofFile(null);
    setProofPreview('');
    setShowModal(true);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProofFile(f);
    if (f.type.startsWith('image/')) setProofPreview(URL.createObjectURL(f));
    else setProofPreview('');
  };

  const handleDispatch = async () => {
    if (!selected) return;
    if ((method === 'NQ' || method === 'Driver') && !dispatcherName.trim()) {
      setError(`Please enter the ${method} name`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const status = (selected.approval_status || '').toLowerCase();

      // Step 1: If still only "approved", issue it first
      if (status.includes('approved') || status.includes('admin')) {
        const issRes = await fetch(`${API()}/stock-issuance/issue/${selected.id}`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issued_by: user?.user_id, issued_by_name: user?.full_name, issuance_notes: issuanceNotes })
        });
        if (!issRes.ok) {
          const err = await issRes.json();
          throw new Error(err.details || err.error || 'Failed to mark as issued');
        }
      }

      // Step 2: Dispatch
      const dispRes = await fetch(`${API()}/stock-issuance/dispatch/${selected.id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatch_method: method, dispatcher_name: dispatcherName, dispatch_notes: dispatchNotes })
      });
      if (!dispRes.ok) {
        const err = await dispRes.json();
        throw new Error(err.details || err.error || 'Dispatch failed');
      }

      // Step 3: If proof file selected, upload it
      if (proofFile && (method === 'NQ' || method === 'Driver')) {
        const fd = new FormData();
        fd.append('proof_image', proofFile);
        fd.append('notes', dispatchNotes);
        await fetch(`${API()}/stock-issuance/delivery-proof/${selected.id}`, {
          method: 'POST', credentials: 'include', body: fd
        });
      }

      const msg = method === 'Direct'
        ? `✅ Items delivered directly for ${selected.request_number}`
        : `✅ Items dispatched via ${method} (${dispatcherName}) for ${selected.request_number}`;
      setSuccess(msg);
      setShowModal(false);
      await fetchRequests();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isActionable = (r: RequestRow) => {
    const s = (r.approval_status || '').toLowerCase();
    return s.includes('approved') || s === 'issued';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Truck className="h-7 w-7 text-white" />
              </div>
              Stock Issuance & Delivery
            </h1>
            <p className="text-gray-500 mt-1">Approve, issue, and dispatch items to requesters</p>
          </div>
          <button onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}
        {error && !showModal && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-semibold text-gray-500">No requests pending dispatch</p>
            <p className="text-gray-400 mt-1 text-sm">Approved requests will appear here for issuance</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requests.map(req => (
              <div key={req.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div>
                    <h3 className="font-bold text-gray-900">{req.request_number}</h3>
                    <p className="text-xs text-gray-400">{req.updated_at ? format(new Date(req.updated_at), 'dd MMM yyyy, HH:mm') : ''}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor(req.approval_status)}`}>
                    {req.approval_status}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{req.requester_name}</span>
                    {req.wing_name && <span className="text-gray-400">• {req.wing_name}</span>}
                  </div>
                  {req.purpose && (
                    <p className="text-sm text-gray-600 line-clamp-2">{req.purpose}</p>
                  )}

                  {/* Items summary */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Items ({req.items.length})</p>
                    {req.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span className="truncate max-w-[200px]">{item.nomenclature}</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {item.approved_quantity ?? item.requested_quantity} units
                        </span>
                      </div>
                    ))}
                    {req.items.length > 3 && <p className="text-xs text-gray-400 mt-1">+{req.items.length - 3} more</p>}
                  </div>

                  {/* Dispatch info if already dispatched */}
                  {req.dispatch_method && (
                    <div className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-violet-700">
                      {methodIcon(req.dispatch_method as DispatchMethod)}
                      <span>Dispatched via <strong>{req.dispatch_method}</strong>
                        {req.dispatcher_name && <> by <strong>{req.dispatcher_name}</strong></>}
                      </span>
                    </div>
                  )}

                  {/* Proof uploaded badge */}
                  {req.delivery_proof_url && (
                    <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-teal-700">
                      <Image className="h-4 w-4" />
                      <span>Signed delivery document uploaded</span>
                      <a href={`http://localhost:3001${req.delivery_proof_url}`}
                        target="_blank" rel="noreferrer"
                        className="ml-auto underline font-medium">View</a>
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  {isActionable(req) ? (
                    <button onClick={() => openDispatch(req)}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                      <Send className="h-4 w-4" /> Send / Dispatch
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No further action needed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dispatch Modal ───────────────────────────────────────────────────── */}
      {showModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dispatch Items</h2>
                <p className="text-sm text-gray-500">{selected.request_number}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              {/* Requester info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 mb-2">DELIVERING TO</p>
                <p className="font-semibold text-gray-800">{selected.requester_name}</p>
                {selected.office_name && <p className="text-sm text-gray-500">{selected.office_name}</p>}
                {selected.wing_name && <p className="text-sm text-gray-500">{selected.wing_name}</p>}
              </div>

              {/* Delivery method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Delivery Method *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Direct', 'NQ', 'Driver'] as DispatchMethod[]).map(m => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                        method === m
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>
                      <div className={`p-2 rounded-full ${method === m ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {m === 'Direct' && <ArrowRight className="h-5 w-5" />}
                        {m === 'NQ' && <UserCheck className="h-5 w-5" />}
                        {m === 'Driver' && <Car className="h-5 w-5" />}
                      </div>
                      <span className="text-xs font-semibold">{m === 'Direct' ? 'Direct' : m}</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">
                        {m === 'Direct' ? 'Hand over now' : m === 'NQ' ? 'Via Naib Qasid' : 'Via Driver'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispatcher name (NQ / Driver only) */}
              {(method === 'NQ' || method === 'Driver') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {method} Name *
                  </label>
                  <input
                    value={dispatcherName}
                    onChange={e => setDispatcherName(e.target.value)}
                    placeholder={`Enter ${method === 'NQ' ? 'Naib Qasid' : 'Driver'} name`}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={dispatchNotes}
                  onChange={e => setDispatchNotes(e.target.value)}
                  rows={2}
                  placeholder="Any delivery instructions…"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Proof upload (NQ / Driver) */}
              {(method === 'NQ' || method === 'Driver') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Upload Signed Delivery Doc (optional)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    {proofPreview ? (
                      <img src={proofPreview} alt="proof" className="max-h-40 mx-auto rounded-lg object-contain" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload image or PDF</p>
                        <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                      </>
                    )}
                    {proofFile && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">{proofFile.name}</p>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleDispatch}
                disabled={submitting}
                className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-white text-sm transition-all ${
                  submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}>
                {submitting ? (
                  <><LoadingSpinner size="sm" /> Processing…</>
                ) : method === 'Direct' ? (
                  <><CheckCircle className="h-5 w-5" /> Mark as Delivered</>
                ) : (
                  <><Send className="h-5 w-5" /> Dispatch via {method}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIssuanceProcessing;
