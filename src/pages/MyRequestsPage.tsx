import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, AlertCircle, Truck, UserCheck, Car, ArrowRight, Image as ImageIcon, Activity, X, ChevronRight, ClipboardList, ArrowUpRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined, defaultText = 'N/A'): string => {
  if (!dateString) return defaultText;
  const date = new Date(dateString);
  if (!isValid(date) || date.getFullYear() < 2000) return defaultText;
  return format(date, 'MMM dd, yyyy');
};

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
}

interface SubmittedRequest {
  id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  current_status: string;
  current_approver_name?: string;
  items: RequestItem[];
  total_items: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  office_name?: string;
  wing_name?: string;
  approval_status?: string;           // raw from DB
  dispatch_method?: string;
  dispatcher_name?: string;
  dispatched_at?: string;
  delivery_proof_url?: string;
  delivery_confirmed_at?: string;
  approval_items?: {
    id: string;
    nomenclature: string;
    decision_type?: string | null;
  }[];
}

// ── Progress history entry type ──────────────────────────────────────────────
interface ProgressEntry {
  action: string;
  actor_name: string;
  timestamp: string | null;
  comments: string;
  is_current_step?: boolean;
  forwarded_to_name?: string | null;
}

const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'forwarded_to_supervisor' | 'forwarded_to_admin' | 'approved' | 'rejected'>('all');
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    forwarded_to_supervisor: 0,
    forwarded_to_admin: 0,
    approved: 0,
    rejected: 0
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [receiptMsg, setReceiptMsg] = useState('');

  // ── Progress modal state ───────────────────────────────────────────────────
  const [progressModal, setProgressModal] = useState<{ open: boolean; requestId: string; requestNumber: string } | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');

  const navigate = useNavigate();
  const { user: currentUser } = useSession();

  useEffect(() => {
    if (currentUser?.user_id) {
      loadMyRequests();
    }
  }, [currentUser, refreshTrigger]);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.user_id) {
        console.error('No current user found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter requests to show only current user's requests
          const userRequests = data.data.filter((request: any) => {
            const requesterUserId = (request.requester?.user_id || request.requester_user_id || '').toLowerCase();
            const currentUserId = (currentUser.user_id || '').toLowerCase();
            return requesterUserId === currentUserId;
          });
          
          const mappedRequests = await Promise.all(
            userRequests.map(async (request: any) => {
              let approvalItems = [];
              let approvalStatus = '';
              try {
                const approvalResponse = await fetch(
                  `http://localhost:3001/api/approvals/request/${request.id}/items`,
                  { credentials: 'include' }
                );
                if (approvalResponse.ok) {
                  const approvalData = await approvalResponse.json();
                  if (approvalData.success && approvalData.data) {
                    approvalItems = approvalData.data;
                  }
                  // Get the approval status from request_approvals
                  if (approvalData.approval_status) {
                    approvalStatus = approvalData.approval_status;
                  }
                }
              } catch (err) {
                console.log('Could not fetch approval items for request:', request.id);
              }

              // Also try to get the request_approvals status directly
              let currentApproverName = '';
              if (!approvalStatus) {
                try {
                  const raResponse = await fetch(
                    `http://localhost:3001/api/approvals/request/${request.id}/status`,
                    { credentials: 'include' }
                  );
                  if (raResponse.ok) {
                    const raData = await raResponse.json();
                    if (raData.success) {
                      approvalStatus = raData.current_status || '';
                      currentApproverName = raData.current_approver_name || '';
                    }
                  }
                } catch (err) {
                  // fallback to stock_issuance_requests status
                }
              }

              // Determine the effective display status
              // PRIORITY: raw approval_status from stock_issuance_requests takes precedence
              // for terminal delivery statuses — these must always show correctly to the requester.
              const rawStatus = (request.approval_status || '').toLowerCase();
              const TERMINAL_STATUSES = ['issued', 'dispatched', 'delivered', 'completed'];

              let effectiveStatus: string;

              if (TERMINAL_STATUSES.includes(rawStatus)) {
                // Already in a post-approval delivery stage — use raw status directly
                effectiveStatus = rawStatus;
              } else {
                // Still in workflow — derive from request_approvals current_status
                effectiveStatus = request.request_status?.toLowerCase() || 'pending';
                if (approvalStatus) {
                  if (approvalStatus === 'forwarded_to_admin') effectiveStatus = 'forwarded_to_admin';
                  else if (approvalStatus === 'forwarded_to_supervisor') effectiveStatus = 'forwarded_to_supervisor';
                  else if (approvalStatus === 'approved' || approvalStatus === 'completed') effectiveStatus = 'approved';
                  else if (approvalStatus === 'rejected') effectiveStatus = 'rejected';
                  else if (approvalStatus === 'returned') effectiveStatus = 'returned';
                  else if (approvalStatus === 'pending') effectiveStatus = 'pending';
                }
                // Enrich from raw sir status for forwarded/approved stages
                const sirStatus = rawStatus;
                if (sirStatus.includes('forwarded to admin')) effectiveStatus = 'forwarded_to_admin';
                else if (sirStatus.includes('forwarded to supervisor')) effectiveStatus = 'forwarded_to_supervisor';
                else if (sirStatus.includes('approved')) effectiveStatus = 'approved';
              }

              return {
                id: request.id,
                request_type: request.request_type || 'Individual',
                title: request.purpose || 'Stock Issuance Request',
                description: request.justification || request.purpose || 'Request for inventory items',
                requested_date: request.created_at,
                submitted_date: request.submitted_at,
                current_status: effectiveStatus,
                current_approver_name: currentApproverName || 'N/A',
                approval_status: request.approval_status,
                dispatch_method: request.dispatch_method,
                dispatcher_name: request.dispatcher_name,
                dispatched_at: request.dispatched_at,
                delivery_proof_url: request.delivery_proof_url,
                delivery_confirmed_at: request.delivery_confirmed_at,
                items: request.items?.map((item: any) => ({
                  id: item.id,
                  item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
                  requested_quantity: item.requested_quantity || 1,
                  approved_quantity: item.approved_quantity,
                  unit: 'units'
                })) || [],
                approval_items: approvalItems,
                total_items: request.items?.length || 0,
                priority: request.urgency_level || 'Medium',
                office_name: request.office?.name,
                wing_name: request.wing?.name
              };
            })
          );
          
          setRequests(mappedRequests);
          
          // Calculate stats
          setDashboardStats({
            total: mappedRequests.length,
            pending: mappedRequests.filter(r => r.current_status === 'pending').length,
            forwarded_to_supervisor: mappedRequests.filter(r => r.current_status === 'forwarded_to_supervisor').length,
            forwarded_to_admin: mappedRequests.filter(r => r.current_status === 'forwarded_to_admin').length,
            approved: mappedRequests.filter(r => r.current_status === 'approved').length,
            rejected: mappedRequests.filter(r => r.current_status === 'rejected').length
          });
        } else {
          console.error('Failed to load requests:', data.error);
        }
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Open progress modal and fetch history ────────────────────────────────
  const openProgressModal = async (requestId: string, requestNumber: string) => {
    const safeId = String(requestId || '').trim();
    if (!safeId) {
      console.error('[MyRequestsPage] openProgressModal called with empty requestId');
      setProgressModal({ open: true, requestId: '', requestNumber });
      setProgressError('Invalid request ID');
      return;
    }

    setProgressModal({ open: true, requestId: safeId, requestNumber });
    setProgressHistory([]);
    setProgressError('');
    setProgressLoading(true);

    const url = `${getApiBaseUrl()}/stock-issuance/${encodeURIComponent(safeId)}`;
    console.log('[MyRequestsPage] Fetching progress from:', url);

    try {
      const res = await fetch(url, {
        credentials: 'include'
      });
      console.log('[MyRequestsPage] Progress response status:', res.status);

      if (!res.ok) {
        let errBody = '';
        try {
          errBody = await res.text();
          console.error('[MyRequestsPage] Progress error body:', errBody);
        } catch (_) {}
        throw new Error(`Failed to load request details (${res.status}): ${errBody || res.statusText}`);
      }

      const data = await res.json();
      const history: ProgressEntry[] = data.approval_history || [];
      setProgressHistory(history);
    } catch (e: any) {
      console.error('[MyRequestsPage] Progress fetch error:', e);
      setProgressError(e.message || 'Failed to load progress');
    } finally {
      setProgressLoading(false);
    }
  };

  const closeProgressModal = () => {
    setProgressModal(null);
    setProgressHistory([]);
    setProgressError('');
  };

  const confirmReceipt = async (requestId: string) => {
    setConfirmingId(requestId);
    try {
      const res = await fetch(`${getApiBaseUrl()}/stock-issuance/confirm-receipt/${requestId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setReceiptMsg('✅ Receipt confirmed! Your request is now complete.');
        setRefreshTrigger(t => t + 1);
      } else {
        setReceiptMsg('❌ ' + (data.error || 'Failed to confirm receipt'));
      }
    } catch (e: any) {
      setReceiptMsg('❌ Error: ' + e.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || request.current_status === activeFilter
      || (activeFilter === 'pending' && (request.current_status === 'pending' || request.current_status === 'submitted'));
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      {receiptMsg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
          receiptMsg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {receiptMsg.startsWith('✅') ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {receiptMsg}
          <button onClick={() => setReceiptMsg('')} className="ml-auto text-gray-500 hover:text-gray-700">×</button>
        </div>
      )}
      <Card className="border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">My Requests</h1>
              <p className="text-slate-600 mt-2">
                Track all your submitted requests and their approval progress in one place.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {dashboardStats.total} Total Requests
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Last Updated: {new Date().toLocaleTimeString()}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => navigate('/dashboard/stock-issuance-personal')}>
                New Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'all' 
              ? 'bg-white border border-slate-200 border-l-blue-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-blue-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <ClipboardList className="h-4 w-4" /> All Requests
              </CardDescription>
              <CardTitle className="text-3xl text-blue-700">{dashboardStats.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Total submitted</CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('pending')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'pending' 
              ? 'bg-white border border-slate-200 border-l-yellow-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-yellow-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" /> Pending
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-700">{dashboardStats.pending}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Awaiting action</CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded_to_supervisor')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded_to_supervisor' 
              ? 'bg-white border border-slate-200 border-l-purple-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-purple-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <ArrowUpRight className="h-4 w-4" /> To Supervisor
              </CardDescription>
              <CardTitle className="text-3xl text-purple-700">{dashboardStats.forwarded_to_supervisor}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">With supervisor</CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded_to_admin')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded_to_admin' 
              ? 'bg-white border border-slate-200 border-l-indigo-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-indigo-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <ArrowUpRight className="h-4 w-4" /> To Admin
              </CardDescription>
              <CardTitle className="text-3xl text-indigo-700">{dashboardStats.forwarded_to_admin}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">With admin</CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approved' 
              ? 'bg-white border border-slate-200 border-l-green-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-green-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="h-4 w-4" /> Approved
              </CardDescription>
              <CardTitle className="text-3xl text-green-700">{dashboardStats.approved}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Approved requests</CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'rejected' 
              ? 'bg-white border border-slate-200 border-l-red-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-red-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <XCircle className="h-4 w-4" /> Rejected
              </CardDescription>
              <CardTitle className="text-3xl text-red-700">{dashboardStats.rejected}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Rejected requests</CardContent>
          </Card>
        </button>
      </div>

      {/* Search Bar */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Search Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests
              <Badge className="ml-2 bg-gray-100 text-gray-800">{filteredRequests.length}</Badge>
            </CardTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No requests found</p>
              <p className="text-sm">{activeFilter === 'all' 
                ? "You haven't submitted any requests yet." 
                : `No ${activeFilter} requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  className="border border-slate-200 bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityClass(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge className={getStatusClass(request.current_status)}>
                        {getStatusLabel(request.current_status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="font-medium text-gray-600">Submitted</p>
                      <p>{formatDate(request.submitted_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Required</p>
                      <p>{formatDate(request.requested_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Items</p>
                      <p>{request.total_items}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Type</p>
                      <p>{request.request_type}</p>
                    </div>
                  </div>

                  {['pending', 'forwarded_to_supervisor', 'forwarded_to_admin'].includes(request.current_status) && request.current_approver_name && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
                      <span className="font-medium">With:</span> {request.current_approver_name}
                    </div>
                  )}

                  {/* Delivery status banner — show when storekeeper has sent/issued items */}
                  {(['issued', 'dispatched', 'delivered'].includes(request.current_status) ||
                    ['Issued', 'Dispatched', 'Delivered'].includes(request.approval_status || '')) && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-3 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                        <Truck className="h-4 w-4" />
                        {(request.current_status === 'issued' || request.approval_status === 'Issued')
                          ? '📦 Items have been issued by the storekeeper — confirm receipt below'
                          : (request.current_status === 'dispatched' || request.approval_status === 'Dispatched')
                          ? '🚚 Items are on their way to you'
                          : '✅ Items have been delivered'}
                      </div>
                      {request.dispatch_method && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          {request.dispatch_method === 'NQ' && <UserCheck className="h-3 w-3" />}
                          {request.dispatch_method === 'Driver' && <Car className="h-3 w-3" />}
                          {request.dispatch_method === 'Direct' && <ArrowRight className="h-3 w-3" />}
                          <span>Delivery method: <strong>{request.dispatch_method}</strong></span>
                          {request.dispatcher_name && <span>• <strong>{request.dispatcher_name}</strong></span>}
                        </div>
                      )}
                      {request.delivery_proof_url && (
                        <a href={`http://localhost:3001${request.delivery_proof_url}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 underline">
                          <ImageIcon className="h-3 w-3" /> View signed delivery document
                        </a>
                      )}
                    </div>
                  )}

                  {/* Completed banner */}
                  {request.current_status === 'completed' && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 mb-3 flex items-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" /> Receipt confirmed — request complete
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => navigate(`/dashboard/request-details/${request.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {/* Track Progress — opens inline modal for ALL non-terminal statuses */}
                    {!['completed', 'rejected'].includes(request.current_status) && (
                      <Button
                        onClick={() => openProgressModal(request.id, request.request_number || request.title)}
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Activity className="h-4 w-4 mr-1.5" />
                        Track Progress
                      </Button>
                    )}
                    {/* RECEIPT CONFIRMATION BUTTON — shown whenever storekeeper has sent items */}
                    {(['issued', 'dispatched', 'delivered'].includes(request.current_status) ||
                      ['Issued', 'Dispatched', 'Delivered'].includes(request.approval_status || '')) && (
                      <Button
                        onClick={() => confirmReceipt(request.id)}
                        disabled={confirmingId === request.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      >
                        {confirmingId === request.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        I Received My Items
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      {/* ── Progress Tracking Modal ─────────────────────────────────────────── */}
      {progressModal?.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeProgressModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Request Progress</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{progressModal.requestNumber}</p>
                </div>
              </div>
              <button
                onClick={closeProgressModal}
                className="p-2 rounded-full hover:bg-white/60 transition-colors text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {progressLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-gray-500">Loading progress…</p>
                </div>
              ) : progressError ? (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {progressError}
                </div>
              ) : progressHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                  <Clock className="h-12 w-12 opacity-40" />
                  <p className="text-sm font-medium">No progress recorded yet</p>
                  <p className="text-xs text-center">Your request is waiting to be reviewed.</p>
                </div>
              ) : (
                <ol className="relative border-l-2 border-blue-100 ml-3 space-y-0">
                  {progressHistory.map((entry, idx) => {
                    const isLast = idx === progressHistory.length - 1;
                    const action = (entry.action || '').toLowerCase();
                    const isApproved = ['approved', 'issued', 'dispatched', 'delivered', 'completed', 'sent_to_store_keeper'].includes(action);
                    const isRejected = action === 'rejected';
                    const isReturned = action === 'returned';
                    const isCurrent = entry.is_current_step;

                    const dotColor = isRejected
                      ? 'bg-red-500 border-red-200'
                      : isReturned
                      ? 'bg-orange-500 border-orange-200'
                      : isApproved
                      ? 'bg-green-500 border-green-200'
                      : isCurrent
                      ? 'bg-blue-500 border-blue-200 animate-pulse'
                      : 'bg-gray-300 border-gray-100';

                    const actionLabel: Record<string, string> = {
                      submitted: 'Submitted',
                      pending: 'Awaiting Review',
                      forwarded: 'Forwarded',
                      forwarded_to_admin: 'Forwarded to Admin',
                      forwarded_to_supervisor: 'Forwarded to Supervisor',
                      approved: 'Approved',
                      rejected: 'Rejected',
                      returned: 'Returned for Revision',
                      sent_to_store_keeper: 'Sent to Storekeeper',
                      issued: 'Items Issued',
                      dispatched: 'Items Dispatched',
                      delivered: 'Delivered',
                      completed: 'Completed',
                    };

                    return (
                      <li key={idx} className={`relative pl-7 ${isLast ? 'pb-0' : 'pb-6'}`}>
                        {/* Dot */}
                        <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${dotColor}`}>
                          {isApproved && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                          {isRejected && <XCircle className="h-2.5 w-2.5 text-white" />}
                          {isReturned && <AlertCircle className="h-2.5 w-2.5 text-white" />}
                        </span>

                        {/* Content */}
                        <div className={`rounded-xl border p-3.5 transition-all ${
                          isCurrent && !isApproved
                            ? 'border-blue-300 bg-blue-50 shadow-sm shadow-blue-100'
                            : isRejected
                            ? 'border-red-200 bg-red-50'
                            : isReturned
                            ? 'border-orange-200 bg-orange-50'
                            : isApproved
                            ? 'border-green-100 bg-green-50/60'
                            : 'border-gray-100 bg-gray-50'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className={`text-sm font-semibold ${
                                isRejected ? 'text-red-700'
                                : isReturned ? 'text-orange-700'
                                : isApproved ? 'text-green-700'
                                : isCurrent ? 'text-blue-700'
                                : 'text-gray-700'
                              }`}>
                                {actionLabel[action] || entry.action}
                              </span>
                              {isCurrent && !isApproved && !isRejected && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-none">Current</Badge>
                              )}
                            </div>
                            {entry.timestamp && (
                              <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                                {format(new Date(entry.timestamp), 'dd MMM, HH:mm')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-5">
                            <span className="font-medium text-gray-700">{entry.actor_name}</span>
                            {entry.forwarded_to_name && (
                              <span className="text-gray-400"> → <span className="font-medium text-gray-700">{entry.forwarded_to_name}</span></span>
                            )}
                          </p>
                          {entry.comments && (
                            <p className="text-xs text-gray-500 mt-1.5 ml-5 italic leading-relaxed">
                              "{entry.comments}"
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
              <Button onClick={closeProgressModal} size="sm" variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper functions
const getPriorityClass = (priority: string) => {
  const classes = {
    'Low': 'bg-gray-100 text-gray-800',
    'Medium': 'bg-blue-100 text-blue-800',
    'High': 'bg-orange-100 text-orange-800',
    'Urgent': 'bg-red-100 text-red-800'
  };
  return classes[priority as keyof typeof classes] || classes.Medium;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'submitted': 'Submitted',
    'pending': 'Pending',
    'forwarded_to_supervisor': 'With Supervisor',
    'forwarded_to_admin': 'With Admin',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'returned': 'Returned',
    'issued': '📦 Ready for Delivery',
    'dispatched': '🚚 On the Way',
    'delivered': '✅ Delivered',
    'completed': 'Completed',
    'finalized': 'Finalized'
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'submitted': 'bg-purple-100 text-purple-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'forwarded_to_supervisor': 'bg-purple-100 text-purple-800',
    'forwarded_to_admin': 'bg-indigo-100 text-indigo-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'returned': 'bg-orange-100 text-orange-800',
    'issued': 'bg-blue-100 text-blue-800',
    'dispatched': 'bg-violet-100 text-violet-800',
    'delivered': 'bg-teal-100 text-teal-800',
    'completed': 'bg-gray-100 text-gray-700',
    'finalized': 'bg-blue-100 text-blue-800'
  };
  return classes[status] || classes.pending;
};

export default MyRequestsPage;