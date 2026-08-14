import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, Filter, ArrowRight, User, Calendar, Package, MapPin, History } from 'lucide-react';
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
  my_action: string; // 'pending', 'approved', 'rejected', 'forwarded'
  my_action_date?: string;
  my_comments?: string;
  forwarded_to?: string;
  current_status: string;
  final_status: string; // Overall request status
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

const RequestHistoryPage: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const navigate = useNavigate();

  const currentUser = sessionService.getCurrentUser();

  useEffect(() => {
    loadApprovalHistory();
  }, []);

  const loadApprovalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-approval-history`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequests(data.requests || []);
        } else {
          console.error('❌ API returned success=false:', data.error);
        }
      } else {
        console.error('❌ HTTP Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, text: 'Pending Action' },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, text: 'Approved' },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, text: 'Rejected' },
      'forwarded': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: ArrowRight, text: 'Forwarded' }
    };

    const config = actionConfig[action as keyof typeof actionConfig] || actionConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {config.text}
      </Badge>
    );
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

  const handleViewDetails = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleTracking = async (request: ApprovalRequest) => {
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
        // Determine who the current approver should be based on the workflow
        let currentApprover = 'Pending Approval';
        let currentDesignation = 'Next Approver';
        
        // Basic workflow logic - this can be enhanced based on your actual workflow
        if (actualHistory.length === 0) {
          currentApprover = 'HR Supervisor';
          currentDesignation = 'Human Resources';
        } else if (actualHistory.length === 1) {
          currentApprover = 'Inventory Manager';
          currentDesignation = 'Inventory Management';
        } else {
          currentApprover = 'Department Head';
          currentDesignation = 'Final Approval';
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

        // 5. Add future steps
        if (actualHistory.length === 0) {
          completeTimeline.push({
            id: 'future_step_1',
            action_type: 'pending',
            action_date: null,
            action_by_name: 'Inventory Manager',
            action_by_designation: 'Inventory Management',
            comments: 'Future approval step',
            step_status: 'future'
          });
        }
        
        if (actualHistory.length <= 1) {
          completeTimeline.push({
            id: 'final_step',
            action_type: 'pending',
            action_date: null,
            action_by_name: 'Department Head',
            action_by_designation: 'Final Approval',
            comments: 'Final approval step',
            step_status: 'future'
          });
        }
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
    
    const matchesAction = actionFilter === 'all' || request.my_action === actionFilter;
    const matchesStatus = statusFilter === 'all' || request.final_status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  // Group requests by final_status
  const groupRequestsByStatus = (reqs: ApprovalRequest[]) => {
    const grouped = {
      'approved': [] as ApprovalRequest[],
      'rejected': [] as ApprovalRequest[],
      'pending': [] as ApprovalRequest[],
      'other': [] as ApprovalRequest[]
    };

    reqs.forEach(request => {
      if (request.final_status === 'approved') {
        grouped.approved.push(request);
      } else if (request.final_status === 'rejected') {
        grouped.rejected.push(request);
      } else if (request.final_status === 'pending') {
        grouped.pending.push(request);
      } else {
        grouped.other.push(request);
      }
    });

    return grouped;
  };

  const groupedRequests = groupRequestsByStatus(filteredRequests);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your approval history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request History</h1>
          <p className="text-gray-600 mt-2">
            Track all requests that came to you for approval and their current status
          </p>
        </div>
        <Button onClick={loadApprovalHistory} variant="outline" className="flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'approved', 'rejected', 'forwarded'].map(action => {
          const count = requests.filter(r => r.my_action === action).length;
          return (
            <Card key={action}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">
                      {action === 'forwarded' ? 'Forwarded' : action === 'pending' ? 'Pending' : action}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  {getActionBadge(action)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">My Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval History List - Grouped by Status */}
      <div className="space-y-8">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Clock size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {requests.length === 0 
                  ? "No requests have been assigned to you for approval yet."
                  : "No requests match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Future Request (Approved) Section */}
            {groupedRequests.approved.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-gray-900">→</span>
                  <h2 className="text-2xl font-bold text-green-700">Future Request (approved request)</h2>
                </div>
                <div className="space-y-4">
                  {groupedRequests.approved.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <User size={14} />
                      <span>Requested by: {request.requester_name}</span>
                      {request.requester_office && (
                        <>
                          <span>•</span>
                          <span>{request.requester_office}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</span>
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Action</span>
                      {getActionBadge(request.my_action)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
                      {getStatusBadge(request.final_status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Request ID</p>
                    <p className="font-mono text-xs">{request.request_id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Submitted Date</p>
                    <p>{safeFormat(request.submitted_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Required Date</p>
                    <p>{safeFormat(request.requested_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Total Items</p>
                    <p>{request.total_items} items</p>
                  </div>
                </div>

                {/* My Action Details */}
                {request.my_action !== 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Your Action: {request.my_action.charAt(0).toUpperCase() + request.my_action.slice(1)}
                        </p>
                        {request.my_action_date && (
                          <p className="text-xs text-gray-600">
                            {safeFormat(request.my_action_date, 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                      {request.forwarded_to && (
                        <div className="text-sm">
                          <span className="font-medium">Forwarded to:</span> {request.forwarded_to}
                        </div>
                      )}
                    </div>
                    {request.my_comments && (
                      <div className="text-sm text-gray-700 mt-2 bg-white rounded p-2">
                        <span className="font-medium">Comments:</span> {request.my_comments}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items Requested:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.items.slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-600">
                            {item.requested_quantity} {item.unit}
                          </span>
                        </div>
                        {item.approved_quantity !== undefined && (
                          <div className="text-xs text-green-600 mt-1">
                            Approved: {item.approved_quantity} {item.unit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {request.items.length > 4 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{request.items.length - 4} more items
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={() => handleViewDetails(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  <Button
                    onClick={() => handleTracking(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <History size={14} />
                    Tracking
                  </Button>
                  
                  {request.my_action === 'pending' && (
                    <Button
                      onClick={() => navigate(`/dashboard/approval-forwarding/${request.id}`)}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Take Action
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Request Section */}
            {groupedRequests.rejected.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-gray-900">→</span>
                  <h2 className="text-2xl font-bold text-red-700">Rejected Request</h2>
                </div>
                <div className="space-y-4">
                  {groupedRequests.rejected.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <User size={14} />
                      <span>Requested by: {request.requester_name}</span>
                      {request.requester_office && (
                        <>
                          <span>•</span>
                          <span>{request.requester_office}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</span>
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Action</span>
                      {getActionBadge(request.my_action)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
                      {getStatusBadge(request.final_status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Request ID</p>
                    <p className="font-mono text-xs">{request.request_id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Submitted Date</p>
                    <p>{safeFormat(request.submitted_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Required Date</p>
                    <p>{safeFormat(request.requested_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Total Items</p>
                    <p>{request.total_items} items</p>
                  </div>
                </div>

                {/* My Action Details */}
                {request.my_action !== 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Your Action: {request.my_action.charAt(0).toUpperCase() + request.my_action.slice(1)}
                        </p>
                        {request.my_action_date && (
                          <p className="text-xs text-gray-600">
                            {safeFormat(request.my_action_date, 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                      {request.forwarded_to && (
                        <div className="text-sm">
                          <span className="font-medium">Forwarded to:</span> {request.forwarded_to}
                        </div>
                      )}
                    </div>
                    {request.my_comments && (
                      <div className="text-sm text-gray-700 mt-2 bg-white rounded p-2">
                        <span className="font-medium">Comments:</span> {request.my_comments}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items Requested:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.items.slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-600">
                            {item.requested_quantity} {item.unit}
                          </span>
                        </div>
                        {item.approved_quantity !== undefined && (
                          <div className="text-xs text-green-600 mt-1">
                            Approved: {item.approved_quantity} {item.unit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {request.items.length > 4 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{request.items.length - 4} more items
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={() => handleViewDetails(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  <Button
                    onClick={() => handleTracking(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <History size={14} />
                    Tracking
                  </Button>
                  
                  {request.my_action === 'pending' && (
                    <Button
                      onClick={() => navigate(`/dashboard/approval-forwarding/${request.id}`)}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Take Action
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Request Section */}
            {groupedRequests.pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-gray-900">→</span>
                  <h2 className="text-2xl font-bold text-yellow-700">Pending Request</h2>
                </div>
                <div className="space-y-4">
                  {groupedRequests.pending.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <User size={14} />
                      <span>Requested by: {request.requester_name}</span>
                      {request.requester_office && (
                        <>
                          <span>•</span>
                          <span>{request.requester_office}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</span>
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Action</span>
                      {getActionBadge(request.my_action)}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
                      {getStatusBadge(request.final_status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Request ID</p>
                    <p className="font-mono text-xs">{request.request_id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Submitted Date</p>
                    <p>{safeFormat(request.submitted_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Required Date</p>
                    <p>{safeFormat(request.requested_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Total Items</p>
                    <p>{request.total_items} items</p>
                  </div>
                </div>

                {/* My Action Details */}
                {request.my_action !== 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Your Action: {request.my_action.charAt(0).toUpperCase() + request.my_action.slice(1)}
                        </p>
                        {request.my_action_date && (
                          <p className="text-xs text-gray-600">
                            {safeFormat(request.my_action_date, 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                      {request.forwarded_to && (
                        <div className="text-sm">
                          <span className="font-medium">Forwarded to:</span> {request.forwarded_to}
                        </div>
                      )}
                    </div>
                    {request.my_comments && (
                      <div className="text-sm text-gray-700 mt-2 bg-white rounded p-2">
                        <span className="font-medium">Comments:</span> {request.my_comments}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items Requested:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.items.slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-600">
                            {item.requested_quantity} {item.unit}
                          </span>
                        </div>
                        {item.approved_quantity !== undefined && (
                          <div className="text-xs text-green-600 mt-1">
                            Approved: {item.approved_quantity} {item.unit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {request.items.length > 4 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{request.items.length - 4} more items
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={() => handleViewDetails(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  <Button
                    onClick={() => handleTracking(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <History size={14} />
                    Tracking
                  </Button>
                  
                  {request.my_action === 'pending' && (
                    <Button
                      onClick={() => navigate(`/dashboard/approval-forwarding/${request.id}`)}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Take Action
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Footer */}
      {requests.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredRequests.length} of {requests.length} requests
              </div>
              <div className="flex items-center gap-4">
                <span>Approver: {currentUser?.user_name}</span>
                <span>•</span>
                <span>Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedRequest.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">Request ID: {selectedRequest.request_id}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Request Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="h-5 w-5 mr-2 text-blue-600" />
                      Requester Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedRequest.requester_name}</span>
                      </div>
                      {selectedRequest.requester_office && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Office:</span>
                          <span className="font-medium">{selectedRequest.requester_office}</span>
                        </div>
                      )}
                      {selectedRequest.requester_wing && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Wing:</span>
                          <span className="font-medium">{selectedRequest.requester_wing}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-600" />
                      Timeline & Status
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Submitted:</span>
                        <span className="font-medium">{safeFormat(selectedRequest.submitted_date, 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Status:</span>
                        <Badge className={
                          selectedRequest.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedRequest.current_status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedRequest.current_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {selectedRequest.current_status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">My Action:</span>
                        <Badge className={
                          selectedRequest.my_action === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedRequest.my_action === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedRequest.my_action === 'rejected' ? 'bg-red-100 text-red-800' :
                          selectedRequest.my_action === 'forwarded' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {selectedRequest.my_action}
                        </Badge>
                      </div>
                      {selectedRequest.my_action_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Action Date:</span>
                          <span className="font-medium">{safeFormat(selectedRequest.my_action_date, 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{selectedRequest.description}</p>
              </div>

              {/* My Comments */}
              {selectedRequest.my_comments && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">My Comments</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedRequest.my_comments}</p>
                </div>
              )}

              {/* Forwarded To */}
              {selectedRequest.forwarded_to && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Forwarded To</h3>
                  <p className="text-gray-700">{selectedRequest.forwarded_to}</p>
                </div>
              )}

              {/* Items List */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-purple-600" />
                  Requested Items ({selectedRequest.total_items})
                </h3>
                <div className="grid gap-3">
                  {selectedRequest.items.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">{item.item_name}</span>
                        <span className="text-gray-500 text-sm ml-2">({item.unit})</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">
                          Qty: {item.requested_quantity}
                        </div>
                        {item.approved_quantity !== undefined && (
                          <div className="text-sm text-gray-600">
                            Approved: {item.approved_quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button 
                onClick={() => navigate(`/dashboard/request-details/${selectedRequest.request_id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Full Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTracking && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Approval Tracking
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">{selectedRequest.title}</p>
                </div>
                <button
                  onClick={closeTracking}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {trackingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-3" />
                  <span>Loading tracking information...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Request Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Request ID:</span> {selectedRequest.request_id}
                      </div>
                      <div>
                        <span className="font-medium">Requester:</span> {selectedRequest.requester_name}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {safeFormat(selectedRequest.submitted_date, 'MMM dd, yyyy HH:mm')}
                      </div>
                      <div>
                        <span className="font-medium">Current Status:</span> {selectedRequest.current_status}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Approval Timeline
                    </h3>
                    
                    {trackingData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Unable to load approval workflow.</p>
                        <p className="text-sm">Please try again or contact system administrator.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {trackingData.map((step, index) => (
                          <div key={index} className="flex items-start gap-4 relative">
                            {/* Timeline connector */}
                            {index < trackingData.length - 1 && (
                              <div className={`absolute left-5 top-10 w-0.5 h-8 ${
                                step.step_status === 'future' ? 'border-l-2 border-dashed border-gray-300' : 'bg-gray-300'
                              }`}></div>
                            )}
                            
                            {/* Status icon */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              step.step_status === 'completed' && step.action_type === 'approved' ? 'bg-green-100 text-green-600' :
                              step.step_status === 'completed' && step.action_type === 'rejected' ? 'bg-red-100 text-red-600' :
                              step.step_status === 'completed' && step.action_type === 'forwarded' ? 'bg-blue-100 text-blue-600' :
                              step.step_status === 'completed' && step.action_type === 'submitted' ? 'bg-blue-100 text-blue-600' :
                              step.step_status === 'current' ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300' :
                              step.step_status === 'future' ? 'bg-gray-100 text-gray-400' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {step.action_type === 'approved' ? <CheckCircle className="h-5 w-5" /> :
                               step.action_type === 'rejected' ? <XCircle className="h-5 w-5" /> :
                               step.action_type === 'forwarded' ? <ArrowRight className="h-5 w-5" /> :
                               step.action_type === 'submitted' ? <User className="h-5 w-5" /> :
                               <Clock className="h-5 w-5" />}
                            </div>
                            
                            {/* Step details */}
                            <div className={`flex-grow rounded-lg border p-4 ${
                              step.step_status === 'completed' ? 'bg-white border-gray-200' :
                              step.step_status === 'current' ? 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-300' :
                              step.step_status === 'future' ? 'bg-gray-50 border-gray-200 opacity-70' :
                              'bg-white border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className={`font-medium ${
                                  step.step_status === 'current' ? 'text-yellow-900' :
                                  step.step_status === 'future' ? 'text-gray-500' :
                                  'text-gray-900'
                                } capitalize`}>
                                  {step.action_type === 'submitted' ? 'Submitted Request' :
                                   step.action_type === 'forwarded' ? 'Forwarded' :
                                   step.action_type === 'pending' && step.step_status === 'current' ? 'Pending Approval' :
                                   step.action_type === 'pending' && step.step_status === 'future' ? 'Future Step' :
                                   step.action_type}
                                </h4>
                                {step.step_status === 'current' && (
                                  <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded-full font-medium">
                                    Current Step
                                  </span>
                                )}
                                {step.step_status === 'future' && (
                                  <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                                    Future
                                  </span>
                                )}
                                {step.action_date && (
                                  <span className="text-sm text-gray-500">
                                    {safeFormat(step.action_date, 'MMM dd, yyyy HH:mm')}
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="font-medium text-gray-600">
                                    {step.step_status === 'current' ? 'Assigned to:' : 
                                     step.step_status === 'future' ? 'Will be assigned to:' : 'By:'}
                                  </span> 
                                  <span className={`ml-1 ${step.step_status === 'future' ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {step.action_by_name || 'Unknown'}
                                  </span>
                                </div>
                                
                                {step.action_by_designation && (
                                  <div>
                                    <span className="font-medium text-gray-600">Role:</span>
                                    <span className={`ml-1 ${step.step_status === 'future' ? 'text-gray-500' : 'text-gray-700'}`}>
                                      {step.action_by_designation}
                                    </span>
                                  </div>
                                )}
                                
                                {step.action_type === 'forwarded' && step.forwarded_to_name && (
                                  <div>
                                    <span className="font-medium text-gray-600">Forwarded to:</span> {step.forwarded_to_name}
                                  </div>
                                )}
                                
                                {step.step_status === 'current' && !step.action_date && (
                                  <div className="bg-yellow-100 rounded p-2 mt-2">
                                    <span className="font-medium text-yellow-800">Status:</span>
                                    <p className="text-yellow-700 mt-1">⏳ Awaiting approval action</p>
                                  </div>
                                )}
                                
                                {step.comments && step.step_status !== 'future' && (
                                  <div className={`rounded p-2 mt-2 ${
                                    step.step_status === 'current' ? 'bg-yellow-100' : 'bg-gray-50'
                                  }`}>
                                    <span className="font-medium text-gray-600">Comments:</span>
                                    <p className="text-gray-700 mt-1">{step.comments}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
              <Button variant="outline" onClick={closeTracking}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestHistoryPage;
