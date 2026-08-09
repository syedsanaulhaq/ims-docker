import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Clock, RefreshCw, Search, Filter, ArrowLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
  item_status?: string;
}

interface ApprovalRequest {
  id: string;
  request_id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  requester_name: string;
  requester_office?: string;
  requester_wing?: string;
  my_action: string;
  my_action_date?: string;
  my_comments?: string;
  forwarded_to?: string;
  current_status: string;
  final_status: string;
  items: RequestItem[];
  total_items: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
}

// Safe date formatting helper
const safeFormat = (dateValue: string | Date | null | undefined, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return '-';
  }
};

const FutureRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingItemStatuses, setEditingItemStatuses] = useState<{ [itemId: string]: string }>({});
  const [editingRequestStatus, setEditingRequestStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadApprovalHistory();
  }, [refreshTrigger]);

  const loadApprovalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/my-approval-history', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter only approved requests
          const approvedRequests = data.requests.filter(
            (req: ApprovalRequest) => req.final_status === 'approved'
          );
          setRequests(approvedRequests);
        }
      }
    } catch (error) {
      console.error('Error loading approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetails = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const getItemStatusBadge = (status?: string) => {
    const statusText = status || 'pending';
    const statusLower = statusText.toLowerCase();
    
    if (statusLower === 'approved') {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    } else if (statusLower === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    } else if (statusLower === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else if (statusLower === 'issued') {
      return <Badge className="bg-blue-100 text-blue-800">Issued</Badge>;
    } else if (statusLower === 'partial') {
      return <Badge className="bg-orange-100 text-orange-800">Partial</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">{statusText}</Badge>;
  };

  const getRequestWorkflowStatus = (request: ApprovalRequest) => {
    let status = 'Status: ';
    let color = 'bg-green-100 text-green-800';
    
    if (request.my_action === 'Approved') {
      status += 'Approved';
      color = 'bg-green-100 text-green-800';
    } else if (request.my_action === 'Rejected') {
      status += 'Rejected';
      color = 'bg-red-100 text-red-800';
    } else if (request.forwarded_to) {
      status += `Forwarded to ${request.forwarded_to}`;
      color = 'bg-blue-100 text-blue-800';
    } else if (request.current_status === 'pending') {
      status += 'Pending Action';
      color = 'bg-yellow-100 text-yellow-800';
    } else {
      status += request.final_status?.charAt(0).toUpperCase() + request.final_status?.slice(1).toLowerCase();
      color = 'bg-gray-100 text-gray-800';
    }
    
    return { status, color };
  };

  const handleItemStatusChange = (itemId: string, newStatus: string, request: ApprovalRequest) => {
    const newItemStatuses = { ...editingItemStatuses, [itemId]: newStatus };
    setEditingItemStatuses(newItemStatuses);
    
    // Check if any item has been marked as returned
    const requestItems = request.items;
    const allItemStatuses = requestItems.map(item => newItemStatuses[item.id] || item.item_status || 'pending');
    
    const anyItemReturned = allItemStatuses.some(s => s === 'return');
    const allItemsRejected = allItemStatuses.every(s => s === 'reject');
    const allItemsApproved = allItemStatuses.every(s => s === 'approved');
    
    if (anyItemReturned) {
      // If ANY item is returned → set request status to return
      setEditingRequestStatus('return');
    } else if (allItemsRejected) {
      // All items rejected → set request status to rejected
      setEditingRequestStatus('reject');
    } else if (allItemsApproved) {
      // All items approved → set request status to approved
      setEditingRequestStatus('approve');
    }
  };

  const handleRequestStatusChange = (request: ApprovalRequest, newStatus: string) => {
    setEditingRequestStatus(newStatus);
    
    const newItemStatuses: { [itemId: string]: string } = {};
    
    if (newStatus === 'approve') {
      request.items.forEach(item => {
        newItemStatuses[item.id] = 'approved';
      });
    } else if (newStatus === 'reject') {
      request.items.forEach(item => {
        newItemStatuses[item.id] = 'reject';
      });
    } else if (newStatus === 'forward_admin') {
      request.items.forEach(item => {
        newItemStatuses[item.id] = 'forward_admin';
      });
    } else if (newStatus === 'forward_supervisor') {
      request.items.forEach(item => {
        newItemStatuses[item.id] = 'forward_supervisor';
      });
    } else if (newStatus === 'return') {
      request.items.forEach(item => {
        newItemStatuses[item.id] = 'return';
      });
    }
    
    if (Object.keys(newItemStatuses).length > 0) {
      setEditingItemStatuses(newItemStatuses);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading future requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/requests-history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Future Request</h1>
        <p className="text-lg text-gray-600 mt-2">
          Approved requests waiting for fulfillment
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {requests.length} Approved Requests
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div
          className={`transition-all duration-300 rounded-lg border-l-4 bg-gradient-to-br from-green-50 to-green-100 border-l-green-500`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold">Total Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{requests.length}</div>
              <p className="text-xs text-gray-600 mt-2">Ready for fulfillment</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Search Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or requester..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Requests List Header */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Approved Requests
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
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="text-gray-300 mb-4">
                <CheckCircle className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approved requests</h3>
              <p className="text-gray-600">
                You don't have any approved requests at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                  <Badge className={getPriorityClass(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              </div>

              {/* Request Workflow Status */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">Request Workflow Status</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`${getRequestWorkflowStatus(request).color}`}>
                    {editingRequestStatus || getRequestWorkflowStatus(request).status}
                  </Badge>
                  {request.my_action_date && (
                    <span className="text-xs text-gray-600 flex items-center">
                      {safeFormat(request.my_action_date, 'MMM dd, yyyy')}
                    </span>
                  )}
                  {request.my_comments && (
                    <span className="text-xs text-gray-700 italic">
                      "{request.my_comments}"
                    </span>
                  )}
                </div>

                {/* Edit Request Status */}
                <Select 
                  value={editingRequestStatus || ''} 
                  onValueChange={(value) => handleRequestStatusChange(request, value)}
                >
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Select request decision..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">
                      ✓ Approve
                    </SelectItem>
                    <SelectItem value="forward_admin">
                      ⏭ Forward to Admin
                    </SelectItem>
                    <SelectItem value="forward_supervisor">
                      ↗ Forward to Supervisor
                    </SelectItem>
                    <SelectItem value="return">
                      ↩ Return All
                    </SelectItem>
                    <SelectItem value="reject">
                      ✗ Reject All
                    </SelectItem>
                  </SelectContent>
                </Select>
                {editingRequestStatus && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={`${
                      editingRequestStatus === 'approve' ? 'bg-green-100 text-green-800' :
                      editingRequestStatus === 'forward_admin' ? 'bg-amber-100 text-amber-800' :
                      editingRequestStatus === 'forward_supervisor' ? 'bg-blue-100 text-blue-800' :
                      editingRequestStatus === 'return' ? 'bg-orange-100 text-orange-800' :
                      editingRequestStatus === 'reject' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {editingRequestStatus === 'approve' ? '✓ Approve' :
                       editingRequestStatus === 'forward_admin' ? '⏭ Forward to Admin' :
                       editingRequestStatus === 'forward_supervisor' ? '↗ Forward to Supervisor' :
                       editingRequestStatus === 'return' ? '↩ Return' :
                       editingRequestStatus === 'reject' ? '✗ Reject' : 'Selected'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <p className="font-medium text-gray-600">Submitted</p>
                  <p>{safeFormat(request.submitted_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Required</p>
                  <p>{safeFormat(request.requested_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Items</p>
                  <p>{request.total_items}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Requester</p>
                  <p>{request.requester_name}</p>
                </div>
              </div>

              {/* Items Preview */}
              {request.items.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                  <p className="text-sm font-semibold text-gray-900 mb-4">Items ({request.items.length}):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-green-50 to-green-100 border-b-2 border-green-300">
                          <th className="text-left py-3 px-4 font-semibold text-green-900">Item Name</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-900">Quantity</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-900">Unit</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {request.items.slice(0, 5).map((item, index) => (
                          <tr 
                            key={index} 
                            className={`border-b border-gray-100 transition-colors ${
                              index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                            } hover:bg-green-50`}
                          >
                            <td className="py-3 px-4 text-gray-800 font-medium">{item.item_name}</td>
                            <td className="text-center py-3 px-4 text-gray-700">{item.requested_quantity}</td>
                            <td className="text-center py-3 px-4 text-gray-700">{item.unit}</td>
                            <td className="text-center py-3 px-4">
                              <div className="flex gap-1 justify-center flex-wrap">
                                <button
                                  onClick={() => handleItemStatusChange(item.id, 'approved', request)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    (editingItemStatuses[item.id] || item.item_status || 'pending') === 'approved'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleItemStatusChange(item.id, 'forward_admin', request)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    (editingItemStatuses[item.id] || item.item_status || 'pending') === 'forward_admin'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  }`}
                                  title="Forward to Admin"
                                >
                                  ⏭
                                </button>
                                <button
                                  onClick={() => handleItemStatusChange(item.id, 'forward_supervisor', request)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    (editingItemStatuses[item.id] || item.item_status || 'pending') === 'forward_supervisor'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  }`}
                                  title="Forward to Supervisor"
                                >
                                  ↗
                                </button>
                                <button
                                  onClick={() => handleItemStatusChange(item.id, 'return', request)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    (editingItemStatuses[item.id] || item.item_status || 'pending') === 'return'
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                  }`}
                                  title="Return"
                                >
                                  ↩
                                </button>
                                <button
                                  onClick={() => handleItemStatusChange(item.id, 'reject', request)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    (editingItemStatuses[item.id] || item.item_status || 'pending') === 'reject'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                  title="Reject"
                                >
                                  ✗
                                </button>
                                {(editingItemStatuses[item.id] || item.item_status || 'pending') === 'approved' && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                                )}
                                {(editingItemStatuses[item.id] || item.item_status || 'pending') === 'forward_admin' && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs">Forward Admin</Badge>
                                )}
                                {(editingItemStatuses[item.id] || item.item_status || 'pending') === 'forward_supervisor' && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">Forward Supervisor</Badge>
                                )}
                                {(editingItemStatuses[item.id] || item.item_status || 'pending') === 'return' && (
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">Return</Badge>
                                )}
                                {(editingItemStatuses[item.id] || item.item_status || 'pending') === 'reject' && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {request.items.length > 5 && (
                    <p className="text-xs text-gray-500 mt-3 text-center font-medium">+{request.items.length - 5} more items</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleViewDetails(request)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedRequest.title}</h2>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Request ID</p>
                  <p className="font-mono text-xs">{selectedRequest.request_id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Submitted</p>
                  <p>{safeFormat(selectedRequest.submitted_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Required Date</p>
                  <p>{safeFormat(selectedRequest.requested_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Total Items</p>
                  <p>{selectedRequest.total_items} items</p>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-600 mb-2">Description</p>
                <p className="text-gray-700">{selectedRequest.description}</p>
              </div>

              <div>
                <p className="font-medium text-gray-600 mb-2">Items Requested</p>
                <div className="space-y-2">
                  {selectedRequest.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-gray-600">{item.requested_quantity} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={closeModal} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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

export default FutureRequestsPage;
