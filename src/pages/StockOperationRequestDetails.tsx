import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw, User, Calendar, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { sessionService } from '@/services/sessionService';
import { getApiBaseUrl } from '@/services/invmisApi';

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
  specifications?: string;
}

interface ApprovalHistoryItem {
  id: string;
  action: string;
  action_date: string;
  approver_name: string;
  comments: string;
  level: number;
}

interface RequestDetails {
  id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  current_status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  office_name?: string;
  wing_name?: string;
  requester_name: string;
  items: RequestItem[];
  approval_history: ApprovalHistoryItem[];
}

const StockOperationRequestDetails: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestId) {
      loadRequestDetails(requestId);
    }
  }, [requestId]);

  const loadRequestDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // Use the working stock issuance API and find the specific request
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
          // Find the specific request by ID
          const foundRequest = data.data.find((req: any) => req.id === id);
          
          if (foundRequest) {
            // Map to the expected format
            const mappedRequest: RequestDetails = {
              id: foundRequest.id,
              request_type: foundRequest.request_type || 'Individual',
              title: foundRequest.purpose || 'Stock Issuance Request',
              description: foundRequest.justification || foundRequest.purpose || 'Request for inventory items',
              requested_date: foundRequest.created_at,
              submitted_date: foundRequest.submitted_at,
              current_status: foundRequest.request_status?.toLowerCase() || 'submitted',
              priority: (foundRequest.urgency_level === 'Normal' ? 'Medium' : foundRequest.urgency_level) as 'Low' | 'Medium' | 'High' | 'Urgent' || 'Medium',
              office_name: foundRequest.office?.name,
              wing_name: foundRequest.wing?.name,
              requester_name: foundRequest.request_type === 'Individual' 
                ? (foundRequest.requester?.full_name || 'Unknown Individual User')
                : `${foundRequest.office?.name || 'Unknown Office'} (Organizational Request)`,
              items: foundRequest.items?.map((item: any) => ({
                id: item.id,
                item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
                requested_quantity: item.requested_quantity || 1,
                approved_quantity: item.approved_quantity,
                unit: 'units',
                specifications: ''
              })) || [],
              approval_history: [] // TODO: Add approval history when available
            };
            
            // Load approval history
            await loadApprovalHistory(foundRequest.id, mappedRequest);
            
            setRequest(mappedRequest);
          } else {
            console.error('Request not found with ID:', id);
            setRequest(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalHistory = async (requestId: string, request: RequestDetails) => {
    try {
      // Try to load real approval history from database
      try {
        const response = await fetch(`/api/approvals/history/${requestId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const historyData = await response.json();
          if (historyData && Array.isArray(historyData)) {
            // Map real approval history data
            const approvalHistory: ApprovalHistoryItem[] = historyData.map((item: any, index: number) => ({
              id: (index + 1).toString(),
              action: item.ActionType?.toLowerCase() || 'submitted',
              action_date: item.ActionDate,
              approver_name: item.UserName || 'Unknown',
              comments: item.Comments || 'No comments',
              level: item.Level || index
            }));
            
            request.approval_history = approvalHistory;
            return;
          }
        }
      } catch (error) {
        }

      // If no real data available, just show the basic submission info
      const approvalHistory: ApprovalHistoryItem[] = [];
      
      // Only add the actual submission
      approvalHistory.push({
        id: '1',
        action: 'submitted',
        action_date: request.submitted_date,
        approver_name: request.requester_name,
        comments: `Request submitted on ${format(new Date(request.submitted_date), 'MMM dd, yyyy')}`,
        level: 0
      });

      // Update the request with minimal approval history
      request.approval_history = approvalHistory;
      
    } catch (error) {
      console.error('Error loading approval history:', error);
      // Set minimal timeline on error
      request.approval_history = [{
        id: '1',
        action: 'submitted',
        action_date: request.submitted_date,
        approver_name: request.requester_name,
        comments: 'Request submitted for approval',
        level: 0
      }];
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'submitted': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      'finalized': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      'in_progress': { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: RefreshCw }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Not Found</h1>
          <p className="text-gray-600 mb-4">The requested details could not be loaded.</p>
          <Button onClick={() => navigate('/dashboard/stock-operations')} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Back to Stock Operations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => navigate('/dashboard/stock-operations')} 
          variant="outline" 
          size="sm"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-gray-600 mt-1">Request ID: {request.id.slice(0, 12)}...</p>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center gap-4">
        {getStatusBadge(request.current_status)}
        {getPriorityBadge(request.priority)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1">{request.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Type</label>
                  <p className="text-gray-900 mt-1 capitalize">
                    {request.request_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requester</label>
                  <p className="text-gray-900 mt-1">{request.requester_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Submitted Date</label>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(request.submitted_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Required Date</label>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(request.requested_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {(request.office_name || request.wing_name) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Office</label>
                    <p className="text-gray-900 mt-1">{request.office_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Wing</label>
                    <p className="text-gray-900 mt-1">{request.wing_name || 'N/A'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} />
                Requested Items ({request.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {request.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                      <div className="text-sm text-gray-600">
                        Requested: {item.requested_quantity} {item.unit}
                      </div>
                    </div>
                    
                    {item.approved_quantity !== undefined && (
                      <div className="text-sm text-green-600 mb-2">
                        Approved: {item.approved_quantity} {item.unit}
                      </div>
                    )}
                    
                    {item.specifications && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Specifications:</span> {item.specifications}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval History Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Approval Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.approval_history && request.approval_history.length > 0 ? (
                  request.approval_history.map((history, index) => (
                    <div key={index} className="relative">
                      {index < request.approval_history.length - 1 && (
                        <div className={`absolute left-4 top-8 bottom-0 w-px ${
                          history.action === 'pending' ? 'bg-gray-300 border-dashed border-l-2 border-gray-300' : 'bg-gray-200'
                        }`}></div>
                      )}
                      
                      <div className={`flex items-start space-x-3 ${
                        history.action === 'pending' && index > 0 ? 'opacity-70' : ''
                      }`}>
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            history.action === 'approved' 
                              ? 'bg-green-100' 
                              : history.action === 'rejected' 
                                ? 'bg-red-100' 
                                : history.action === 'submitted'
                                  ? 'bg-blue-100'
                                  : history.action === 'pending'
                                    ? 'bg-yellow-100'
                                    : 'bg-gray-100'
                          }`}>
                            {history.action === 'approved' ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : history.action === 'rejected' ? (
                              <XCircle size={16} className="text-red-600" />
                            ) : history.action === 'submitted' ? (
                              <FileText size={16} className="text-blue-600" />
                            ) : history.action === 'pending' ? (
                              <Clock size={16} className="text-yellow-600" />
                            ) : (
                              <User size={16} className="text-gray-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {history.approver_name}
                            </span>
                            <span className={`ml-2 capitalize ${
                              history.action === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {history.action === 'submitted' ? 'Submitted Request' :
                               history.action === 'pending' ? (index === 1 ? 'Next: Pending Approval' : 'Future: Pending Approval') :
                               history.action.replace('_', ' ') + 'ed'}
                            </span>
                            {history.action === 'pending' && index === 1 && (
                              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Current Step
                              </span>
                            )}
                          </div>
                          {history.action_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(history.action_date), 'MMM dd, yyyy HH:mm')}
                            </div>
                          )}
                          {!history.action_date && history.action === 'pending' && (
                            <div className="text-xs text-yellow-600 mt-1 font-medium">
                              Awaiting Action
                            </div>
                          )}
                          {history.comments && (
                            <div className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2">
                              {history.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Clock size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Request submitted - awaiting approval workflow setup</p>
                    <p className="text-xs text-gray-400 mt-1">Approval history will appear when the request enters the approval process</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StockOperationRequestDetails;



