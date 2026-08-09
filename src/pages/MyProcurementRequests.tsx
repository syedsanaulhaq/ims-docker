import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';

interface ProcurementRequest {
  id: string;
  request_number: string;
  wing_name: string;
  status: string;
  priority: string;
  justification: string;
  requested_at: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  item_count: number;
  total_items: number;
}

const MyProcurementRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = `${getApiBaseUrl()}/procurement/requests/my-requests${
        statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      }`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      partially_approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      allocated: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-teal-100 text-teal-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-600'
    };

    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-600'
    };

    return badges[priority] || 'bg-gray-100 text-gray-800';
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

  const cancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/procurement/requests/${id}/cancel`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        fetchRequests(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Failed to cancel request');
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved' || r.status === 'partially_approved').length,
    delivered: requests.filter(r => r.status === 'delivered' || r.status === 'completed').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Procurement Requests</h1>
            <p className="text-gray-600 mt-1">Track your stock requests to Central Admin</p>
          </div>
          <button
            onClick={() => navigate('/procurement/new-request')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Request
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Requests</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-teal-600">{stats.delivered}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="partially_approved">Partially Approved</option>
            <option value="rejected">Rejected</option>
            <option value="allocated">Allocated</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No procurement requests found</p>
            <button
              onClick={() => navigate('/procurement/new-request')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{request.request_number}</div>
                        <div className="text-sm text-gray-500">{request.wing_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(request.status)}`}>
                        {request.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.item_count} items ({request.total_items} total qty)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.requested_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => navigate(`/procurement/requests/${request.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {request.status === 'pending' && (
                        <button
                          onClick={() => cancelRequest(request.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProcurementRequests;
