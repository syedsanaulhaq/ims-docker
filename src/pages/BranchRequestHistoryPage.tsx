import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle, XCircle, RefreshCw, Search, User, Calendar, Package, History, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { sessionService } from '@/services/sessionService';
import { useNavigate } from 'react-router-dom';

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
}

interface BranchRequest {
  id: string;
  request_id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  requester_name: string;
  requester_office?: string;
  requester_branch?: string;
  requester_branch_id?: string;
  requester_branch_name?: string;
  current_approver_name?: string;
  current_approver_designation?: string;
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

const BranchRequestHistoryPage: React.FC = () => {
  const [requests, setRequests] = useState<BranchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<BranchRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [BranchName, setBranchName] = useState<string>('');
  const navigate = useNavigate();

  const currentUser = sessionService.getCurrentUser();

  const dateToBucket = (value?: string, bucketMinutes = 10) => {
    const time = new Date(value || 0).getTime();
    if (!Number.isFinite(time) || time <= 0) return 'no-date';
    const bucketMs = bucketMinutes * 60 * 1000;
    return String(Math.floor(time / bucketMs));
  };

  const normalizeRequests = (rawRequests: BranchRequest[] = []): BranchRequest[] => {
    const grouped = new Map<string, BranchRequest>();

    rawRequests.forEach((request) => {
      const strictKey = String(request.request_number || request.request_id || request.id || '');
      const fallbackKey = [
        request.requester_name || 'unknown',
        request.title || '',
        request.description || '',
        dateToBucket(request.submitted_date || request.requested_date, 10)
      ].join('|').toLowerCase();

      const key = strictKey || fallbackKey;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          ...request,
          request_id: String(request.request_id || request.id || ''),
          items: [...(request.items || [])],
          total_items: Number(request.total_items || (request.items || []).length || 0)
        });
        return;
      }

      const mergedItems = [...existing.items, ...(request.items || [])];
      const dedupedItems = mergedItems.filter((item, index, arr) => {
        const itemKey = String(item.id || `${item.item_name}-${item.unit}`);
        return arr.findIndex((x) => String(x.id || `${x.item_name}-${x.unit}`) === itemKey) === index;
      });

      grouped.set(key, {
        ...existing,
        items: dedupedItems,
        total_items: dedupedItems.length,
        request_id: String(existing.request_id || request.request_id || existing.id || request.id || ''),
        requester_branch_id: existing.requester_branch_id || request.requester_branch_id,
        requester_branch_name: existing.requester_branch_name || request.requester_branch_name,
        submitted_date: existing.submitted_date || request.submitted_date,
        requested_date: existing.requested_date || request.requested_date,
      });
    });

    return Array.from(grouped.values()).sort((a, b) => {
      return new Date(b.submitted_date || b.requested_date || 0).getTime() - new Date(a.submitted_date || a.requested_date || 0).getTime();
    });
  };

  useEffect(() => {
    loadBranchRequestHistory();
  }, []);

  const loadBranchRequestHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/branch-inventory/requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const normalized = normalizeRequests(data.requests || []);
          setRequests(normalized);
          setBranchName(data.branch_name || 'Your Branch');
        } else {
          console.error('❌ API returned success=false:', data.error);
        }
      } else {
        console.error('❌ HTTP Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading Branch request history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      'finalized': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      'in_progress': { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: RefreshCw }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Urgent': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || priorityColors.Medium}>
        {priority}
      </Badge>
    );
  };

  const handleViewDetails = (request: BranchRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleTracking = async (request: BranchRequest) => {
    setSelectedRequest(request);
    setTrackingLoading(true);
    setShowTracking(true);

    try {
      // Create a comprehensive timeline with submitted, current, and future steps
      const completeTimeline = [];

      // 1. Add the submission step
      completeTimeline.push({
        id: 'submission',
        action_type: 'submitted',
        action_date: request.submitted_date,
        action_by_name: request.requester_name,
        action_by_designation: 'Requester',
        comments: `Request submitted on ${format(new Date(request.submitted_date), 'MMM dd, yyyy HH:mm')}`,
        step_status: 'completed'
      });

      // 2. Try to get actual approval history from API
      let actualHistory = [];
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${request.id}/history`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          actualHistory = data.data || [];
        }
      } catch (apiError) {
        }

      // 3. Add actual approval actions that have happened
      actualHistory.forEach((action, index) => {
        completeTimeline.push({
          ...action,
          step_status: 'completed'
        });
      });

      // 4. Add current step (if not completed)
      if (request.current_status !== 'finalized' && request.current_status !== 'rejected') {
        // Use actual current approver information from the request data
        let currentApprover = request.current_approver_name || 'Pending Approval';
        let currentDesignation = request.current_approver_designation || 'Next Approver';
        const statusText = String(request.final_status || request.current_status || '').toLowerCase();

        // Prefer workflow-aware fallback titles if no specific approver info is available
        if (!request.current_approver_name) {
          if (statusText.includes('forwarded to admin') || statusText.includes('pending admin')) {
            currentApprover = 'DD Admin';
            currentDesignation = 'Admin Approval';
          } else if (statusText.includes('pending supervisor') || statusText.includes('forwarded to supervisor')) {
            currentApprover = 'Branch Supervisor';
            currentDesignation = 'Supervisor Approval';
          } else if (statusText.includes('storekeeper')) {
            currentApprover = 'Branch Storekeeper';
            currentDesignation = 'Store Review';
          } else {
            currentApprover = 'DD Admin';
            currentDesignation = 'Admin Approval';
          }
        }

        completeTimeline.push({
          id: 'current_step',
          action_type: 'pending',
          action_date: null,
          action_by_name: currentApprover,
          action_by_designation: currentDesignation,
          comments: 'Awaiting approval action',
          step_status: 'current'
        });
      }

      setTrackingData(completeTimeline);

    } catch (error) {
      console.error('❌ Error creating tracking timeline:', error);
      // Fallback to basic timeline
      setTrackingData([{
        id: 'submission',
        action_type: 'submitted',
        action_date: request.submitted_date,
        action_by_name: request.requester_name,
        action_by_designation: 'Requester',
        comments: 'Request submitted for approval',
        step_status: 'completed'
      }]);
    } finally {
      setTrackingLoading(false);
    }
  };

  const closeTracking = () => {
    setShowTracking(false);
    setSelectedRequest(null);
    setTrackingData([]);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || request.final_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">Loading Branch request history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Branch Request History</h1>
            <p className="text-gray-600">Track all requests from {BranchName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/dashboard/stock-issuance-branch')} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Package className="h-4 w-4 mr-2" />
            Create Request
          </Button>
          <Button onClick={loadBranchRequestHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requests, items, or requesters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No requests have been submitted in your branch yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                {(() => {
                  const branchDisplay = request.requester_branch_name
                    ? `${request.requester_branch_name}${request.requester_branch_id ? ` (${request.requester_branch_id})` : ''}`
                    : (request.requester_branch || '-');
                  return (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.final_status)}
                    </div>
                    <p className="text-gray-600 mb-3">{request.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{request.requester_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(request.submitted_date), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{request.total_items} items</span>
                      </div>
                    </div>

                    {request.requester_branch && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{branchDisplay}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Items ({request.total_items})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTracking(request)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Tracking
                    </Button>
                  </div>
                </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Request Details</h2>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Request Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Title</label>
                        <p className="text-gray-900">{selectedRequest.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <p className="text-gray-900">{selectedRequest.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Requester</label>
                        <p className="text-gray-900">{selectedRequest.requester_name}</p>
                      </div>
                      {selectedRequest.requester_branch && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Branch</label>
                          <p className="text-gray-900">{selectedRequest.requester_branch}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Submitted Date</label>
                        <p className="text-gray-900">
                          {format(new Date(selectedRequest.submitted_date), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">{getStatusBadge(selectedRequest.final_status)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Requested Items</h3>
                    <div className="space-y-3">
                      {selectedRequest.items.map((item, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{item.item_name}</p>
                              <p className="text-sm text-gray-600">
                                Requested: {item.requested_quantity} {item.unit}
                              </p>
                              {item.approved_quantity && (
                                <p className="text-sm text-green-600">
                                  Approved: {item.approved_quantity} {item.unit}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTracking && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Request Tracking Timeline</h2>
                <Button variant="ghost" size="sm" onClick={closeTracking}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              {trackingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading tracking data...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {trackingData.map((step, index) => (
                    <div key={step.id || index} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        step.step_status === 'completed' ? 'bg-green-100 text-green-600' :
                        step.step_status === 'current' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {step.step_status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : step.step_status === 'current' ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{step.action_by_name}</span>
                          <span className="text-sm text-gray-500">({step.action_by_designation})</span>
                          {step.action_date && (
                            <span className="text-sm text-gray-500">
                              {format(new Date(step.action_date), 'MMM dd, yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{step.comments}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchRequestHistoryPage;
