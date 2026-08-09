import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Clock,
  Package,
  AlertCircle,
  User,
  MessageSquare,
  Calendar,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermission } from '@/hooks/usePermission';

interface RequestItem {
  id: string;
  item_master_id: string;
  nomenclature: string;
  category_name: string;
  requested_quantity: number;
  unit_of_measurement: string;
  is_custom_item: boolean;
  custom_item_description?: string;
  wing_stock_available: number;
  admin_stock_available: number;
  can_fulfill_from_wing: boolean;
  can_fulfill_from_admin: boolean;
}

interface PendingRequest {
  id?: string;
  request_id: string;
  request_number: string;
  request_type: string;
  requester_name: string;
  requester_office_name: string;
  requester_wing_name: string;
  purpose: string;
  urgency_level: string;
  is_urgent: boolean;
  is_returnable: boolean;
  submitted_at: string;
  pending_hours: number;
  total_items: number;
}

interface RequestDetails {
  request: any;
  items: RequestItem[];
  history: any[];
}

const SupervisorApprovals: React.FC = () => {
  const { user } = useSession();
  const { hasPermission: canApproveSupervisor } = usePermission('stock_request.approve_supervisor');
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'forward' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [forwardingReason, setForwardingReason] = useState('');

  const getRequestIdentifier = (request: PendingRequest): string => {
    const candidate =
      request.request_id ||
      request.id ||
      (request as any).stock_issuance_request_id ||
      (request as any).requestId ||
      (request as any).id;

    return candidate ? String(candidate) : '';
  };

  useEffect(() => {
    if (user?.wing_id) {
      fetchPendingRequests();
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/approvals/supervisor/pending?wing_id=${user?.wing_id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setPendingRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId: string) => {
    const fallbackRequest = pendingRequests.find((r) => getRequestIdentifier(r) === requestId);
    try {
      const response = await fetch(`http://localhost:3001/api/approvals/request/${requestId}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok || !data?.request) {
        setSelectedRequest({
          request: {
            id: requestId,
            request_id: requestId,
            request_number: fallbackRequest?.request_number,
            requester_name: fallbackRequest?.requester_name,
            submitted_at: fallbackRequest?.submitted_at,
            urgency_level: fallbackRequest?.urgency_level,
            purpose: fallbackRequest?.purpose,
          },
          items: [],
          history: [],
        });
        setShowModal(true);
        return;
      }

      setSelectedRequest(data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      setSelectedRequest({
        request: {
          id: requestId,
          request_id: requestId,
          request_number: fallbackRequest?.request_number,
          requester_name: fallbackRequest?.requester_name,
          submitted_at: fallbackRequest?.submitted_at,
          urgency_level: fallbackRequest?.urgency_level,
          purpose: fallbackRequest?.purpose,
        },
        items: [],
        history: [],
      });
      setShowModal(true);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setActionLoading(true);
    try {
      let endpoint = '';
      const effectiveRequestId =
        selectedRequest.request?.id ||
        selectedRequest.request?.request_id;

      let body: any = {
        requestId: effectiveRequestId,
        supervisorId: user?.user_id,
        comments
      };

      switch (actionType) {
        case 'approve':
          endpoint = '/api/approvals/supervisor/approve';
          break;
        case 'forward':
          endpoint = '/api/approvals/supervisor/forward';
          body.forwardingReason = forwardingReason;
          break;
        case 'reject':
          endpoint = '/api/approvals/supervisor/reject';
          break;
      }

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Request ${actionType}d successfully!`);
        setShowModal(false);
        setSelectedRequest(null);
        setComments('');
        setForwardingReason('');
        fetchPendingRequests();
      } else {
        alert(`Failed to ${actionType} request: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error);
      alert(`Error ${actionType}ing request`);
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (type: 'approve' | 'forward' | 'reject') => {
    setActionType(type);
    setComments('');
    setForwardingReason('');
  };

  const filteredRequests = pendingRequests.filter(req => {
    const matchesSearch = 
      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !filterUrgent || req.is_urgent;
    
    return matchesSearch && matchesFilter;
  });

  const getUrgencyBadge = (level: string, isUrgent: boolean) => {
    if (isUrgent) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">🔥 URGENT</span>;
    }
    switch (level) {
      case 'High':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">High</span>;
      case 'Medium':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Medium</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Normal</span>;
    }
  };

  const getStockStatusBadge = (item: RequestItem) => {
    if (item.is_custom_item) {
      return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Custom Item</span>;
    }
    if (item.can_fulfill_from_wing) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Wing Stock</span>;
    }
    if (item.can_fulfill_from_admin) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">→ Admin Stock</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ Unavailable</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="text-blue-600" />
          Supervisor Approvals
        </h1>
        <p className="text-gray-600 mt-1">Review and approve stock issuance requests for {user?.wing_name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
            </div>
            <Clock className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.filter(r => r.is_urgent).length}
              </p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Oldest Request</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.length > 0 
                  ? `${Math.max(...pendingRequests.map(r => r.pending_hours))}h`
                  : '0h'}
              </p>
            </div>
            <TrendingUp className="text-orange-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.reduce((sum, r) => sum + (Number(r.total_items) || 0), 0)}
              </p>
            </div>
            <Package className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by request number, requester, or purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setFilterUrgent(!filterUrgent)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filterUrgent 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Filter size={20} />
            {filterUrgent ? 'Urgent Only' : 'All Requests'}
          </button>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending approval requests at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <div
              key={getRequestIdentifier(request) || request.request_number}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer border-l-4 border-blue-500"
              onClick={() => {
                const requestId = getRequestIdentifier(request);
                if (!requestId) {
                  console.error('Missing request identifier for selected request:', request);
                  alert('Unable to open this request because its identifier is missing.');
                  return;
                }
                fetchRequestDetails(requestId);
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.request_number}</h3>
                    {getUrgencyBadge(request.urgency_level, request.is_urgent)}
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {request.request_type}
                    </span>
                    {request.is_returnable && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Returnable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User size={16} />
                      {request.requester_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(request.submitted_at).toLocaleDateString()} ({request.pending_hours}h ago)
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={16} />
                      {request.total_items} items
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-700">
                  <strong>Purpose:</strong> {request.purpose}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Office: {request.requester_office_name} | Wing: {request.requester_wing_name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Request Details: {selectedRequest.request?.request_number || 'N/A'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Request Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Requester</p>
                    <p className="font-semibold">{selectedRequest.request?.requester_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-semibold">
                      {selectedRequest.request?.submitted_at
                        ? new Date(selectedRequest.request.submitted_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Urgency</p>
                    <p className="font-semibold">{selectedRequest.request?.urgency_level || 'N/A'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-sm text-gray-600">Purpose</p>
                    <p className="font-semibold">{selectedRequest.request?.purpose || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Requested Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-[30%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="w-[10%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="w-[12%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Wing Stock</th>
                        <th className="w-[12%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Admin Stock</th>
                        <th className="w-[18%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(selectedRequest.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-3 align-top">
                            <p className="font-medium text-gray-900 text-sm leading-5 line-clamp-2 break-words" title={item.is_custom_item ? item.custom_item_description : item.nomenclature}>
                              {item.is_custom_item ? item.custom_item_description : item.nomenclature}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700 align-top break-words">
                            {item.is_custom_item ? 'Custom' : (item.category_name || 'Uncategorized')}
                          </td>
                          <td className="px-3 py-3 text-center align-top">
                            <span className="font-semibold">{item.requested_quantity}</span>
                            <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">{item.unit_of_measurement}</span>
                          </td>
                          <td className="px-3 py-3 text-center align-top">
                            {item.is_custom_item ? (
                              <span className="text-gray-400">N/A</span>
                            ) : (
                              <span className={item.can_fulfill_from_wing ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                {item.wing_stock_available}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center align-top">
                            {item.is_custom_item ? (
                              <span className="text-gray-400">N/A</span>
                            ) : (
                              <span className={item.can_fulfill_from_admin ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                {item.admin_stock_available}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center align-top whitespace-nowrap">
                            {getStockStatusBadge(item)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Section */}
              {!actionType ? (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Take Action</h3>
                  <PermissionGate 
                    permission="stock_request.approve_supervisor"
                    fallback={
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Access Restricted:</strong> You don't have permission to approve supervisor-level requests.
                        </p>
                      </div>
                    }
                  >
                    <div className="flex gap-4">
                      <button
                        onClick={() => openActionModal('approve')}
                        disabled={(selectedRequest.items || []).some(i => !i.can_fulfill_from_wing && !i.is_custom_item)}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} />
                        Approve & Issue from Wing Stock
                      </button>
                      <button
                        onClick={() => openActionModal('forward')}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <ArrowUpCircle size={20} />
                        Forward to Admin
                      </button>
                      <button
                        onClick={() => openActionModal('reject')}
                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Reject Request
                      </button>
                    </div>
                  </PermissionGate>
                </div>
              ) : (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {actionType === 'approve' && '✓ Approve Request'}
                    {actionType === 'forward' && '→ Forward to Admin'}
                    {actionType === 'reject' && '✗ Reject Request'}
                  </h3>
                  
                  {actionType === 'forward' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Forwarding Reason *
                      </label>
                      <textarea
                        value={forwardingReason}
                        onChange={(e) => setForwardingReason(e.target.value)}
                        placeholder="Explain why this request needs admin approval..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments {actionType === 'reject' && '*'}
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add any comments or notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      required={actionType === 'reject'}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleAction}
                      disabled={actionLoading || (actionType === 'reject' && !comments) || (actionType === 'forward' && !forwardingReason)}
                      className={`flex-1 px-6 py-3 rounded-lg text-white flex items-center justify-center gap-2 ${
                        actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                        actionType === 'forward' ? 'bg-blue-600 hover:bg-blue-700' :
                        'bg-red-600 hover:bg-red-700'
                      } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                    >
                      {actionLoading ? 'Processing...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
                    </button>
                    <button
                      onClick={() => setActionType(null)}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Approval History */}
              {(selectedRequest.history || []).length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Approval History</h3>
                  <div className="space-y-3">
                    {(selectedRequest.history || []).map((entry, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <MessageSquare className="text-gray-400 mt-1" size={20} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{entry.actor_name}</span>
                            <span className="text-xs text-gray-500">({entry.actor_role})</span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {entry.action}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{entry.comments || entry.forwarding_reason}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(entry.action_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorApprovals;
