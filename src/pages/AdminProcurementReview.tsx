import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';

interface ProcurementRequest {
  id: string;
  request_number: string;
  wing_name: string;
  requested_by_name: string;
  status: string;
  priority: string;
  justification: string;
  requested_at: string;
  item_count: number;
  total_items: number;
}

interface RequestItem {
  id: string;
  item_nomenclature: string;
  item_code: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_of_measurement: string;
  notes?: string;
}

const AdminProcurementReview: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/procurement/requests/pending`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/procurement/requests/${requestId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data.request);
        setRequestItems(data.items.map((item: RequestItem) => ({
          ...item,
          approved_quantity: item.requested_quantity // Default approve full quantity
        })));
        setShowApprovalModal(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      alert('Failed to load request details');
    }
  };

  const updateApprovedQuantity = (itemId: string, quantity: number) => {
    setRequestItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, approved_quantity: quantity } : item
      )
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${getApiBaseUrl()}/procurement/requests/${selectedRequest.id}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_items: requestItems.map(item => ({
            id: item.id,
            requested_quantity: item.requested_quantity,
            approved_quantity: item.approved_quantity || 0
          })),
          review_notes: reviewNotes
        })
      });

      if (response.ok) {
        alert('Request approved successfully');
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setReviewNotes('');
        fetchPendingRequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!reviewNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${getApiBaseUrl()}/procurement/requests/${selectedRequest.id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: reviewNotes })
      });

      if (response.ok) {
        alert('Request rejected');
        setShowRejectModal(false);
        setSelectedRequest(null);
        setReviewNotes('');
        fetchPendingRequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      normal: 'text-blue-600 bg-blue-100',
      low: 'text-gray-600 bg-gray-100'
    };
    return colors[priority] || colors.normal;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Procurement Requests - Admin Review</h1>
        <p className="text-gray-600 mt-1">Review and approve stock requests from wings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Urgent Requests</p>
          <p className="text-2xl font-bold text-red-600">
            {requests.filter(r => r.priority === 'urgent').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">
            {requests.reduce((sum, r) => sum + (r.total_items || 0), 0)}
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Loading pending requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No pending requests to review</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{request.request_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.wing_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.requested_by_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.item_count} ({request.total_items} qty)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.requested_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => fetchRequestDetails(request.id)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Review Request: {selectedRequest.request_number}</h2>
              <p className="text-gray-600 mt-1">{selectedRequest.wing_name} - {selectedRequest.requested_by_name}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Justification:</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.justification}</p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">Items:</h3>
                <div className="space-y-3">
                  {requestItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-800">{item.item_nomenclature}</h4>
                          <p className="text-sm text-gray-500">Code: {item.item_code}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Requested</label>
                          <input
                            type="text"
                            value={`${item.requested_quantity} ${item.unit_of_measurement}`}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Approve Quantity *</label>
                          <input
                            type="number"
                            min="0"
                            max={item.requested_quantity}
                            value={item.approved_quantity || 0}
                            onChange={(e) => updateApprovedQuantity(item.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit_of_measurement}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                          />
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-2">Note: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this approval..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? 'Approving...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Reject Request</h2>
              <p className="text-gray-600 mt-1">{selectedRequest.request_number}</p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Please provide a clear reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !reviewNotes.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                {submitting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcurementReview;
