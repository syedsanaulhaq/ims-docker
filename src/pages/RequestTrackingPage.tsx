import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, ArrowRight, CheckCircle, XCircle, Forward, FileText, Calendar, MessageSquare } from 'lucide-react';
import { getRequestTypeLabel } from '@/utils/requestTypeLabel';

interface ApprovalTrackingEntry {
  step_number: number;
  action_type: string;
  action_by: string;
  action_by_name: string;
  forwarded_from?: string;
  forwarded_from_name?: string;
  forwarded_to?: string;
  forwarded_to_name?: string;
  comments?: string;
  action_date: string;
  is_current_step: boolean;
}

interface RequestDetails {
  id: string;
  request_id: string;
  request_type: string;
  current_status: string;
  submitted_by_name: string;
  current_approver_name: string;
  submitted_date: string;
  workflow_name: string;
}

const RequestTrackingPage: React.FC = () => {
  const { approvalId } = useParams<{ approvalId: string }>();
  const navigate = useNavigate();
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [trackingData, setTrackingData] = useState<ApprovalTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (approvalId) {
      loadTrackingData();
    }
  }, [approvalId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const [detailsResponse, historyResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${approvalId}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${approvalId}/history`)
      ]);
      
      if (!detailsResponse.ok || !historyResponse.ok) {
        throw new Error('Failed to load tracking data');
      }
      
      const detailsData = await detailsResponse.json();
      const historyData = await historyResponse.json();
      
      setRequestDetails(detailsData.data);
      setTrackingData(historyData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getActionIcon = (actionType: string, isCurrentStep: boolean) => {
    const iconProps = {
      className: `w-6 h-6 ${isCurrentStep ? 'text-blue-600' : getActionIconColor(actionType)}`
    };

    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return <Forward {...iconProps} />;
      case 'approved':
        return <CheckCircle {...iconProps} />;
      case 'rejected':
        return <XCircle {...iconProps} />;
      case 'submitted':
        return <FileText {...iconProps} />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  const getActionIconColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return 'text-blue-600';
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'submitted':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStepBackgroundColor = (actionType: string, isCurrentStep: boolean) => {
    if (isCurrentStep) {
      return 'bg-blue-50 border-blue-200 ring-2 ring-blue-300';
    }
    
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return 'bg-blue-50 border-blue-200';
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'submitted':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !requestDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Request not found'}</p>
          <button
            onClick={() => navigate('/approvals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/approvals')}
            className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Request Tracking</h1>
        </div>

        {/* Request Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Request Details</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Request ID:</span>
                  <p className="font-mono text-sm text-gray-900">{requestDetails.request_id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Type:</span>
                  <p className="text-gray-900">{getRequestTypeLabel(requestDetails.request_type)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Workflow:</span>
                  <p className="text-gray-900">{requestDetails.workflow_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Submitted By:</span>
                  <p className="text-gray-900">{requestDetails.submitted_by_name}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ml-2 ${
                    requestDetails.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    requestDetails.current_status === 'approved' ? 'bg-green-100 text-green-800' :
                    requestDetails.current_status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {requestDetails.current_status.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Current Approver:</span>
                  <p className="text-gray-900">{requestDetails.current_approver_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Submitted:</span>
                  <p className="text-gray-900">{formatDate(requestDetails.submitted_date).date} at {formatDate(requestDetails.submitted_date).time}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Steps:</span>
                  <p className="text-gray-900">{trackingData.length} workflow actions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Complete Workflow Timeline</h2>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              📅 Latest Actions First
            </span>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            <div className="space-y-8">
              {/* Sort by actual date/time descending (latest first) */}
              {trackingData
                .slice()
                .sort((a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime())
                .map((entry, index) => {
                const formattedDate = formatDate(entry.action_date);
                
                return (
                  <div key={index} className="relative">
                    {/* Timeline node */}
                    <div className={`absolute left-3 w-6 h-6 rounded-full border-4 border-white ${
                      entry.is_current_step ? 'bg-blue-600 ring-4 ring-blue-200' : 'bg-gray-400'
                    }`}>
                    </div>

                    {/* Step content */}
                    <div className={`ml-16 border rounded-lg p-6 ${getStepBackgroundColor(entry.action_type, entry.is_current_step)}`}>
                      {/* Step header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getActionIcon(entry.action_type, entry.is_current_step)}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Step {entry.step_number}: {entry.action_type.charAt(0).toUpperCase() + entry.action_type.slice(1)}
                            </h3>
                            <p className="text-sm text-gray-600">by {entry.action_by_name}</p>
                          </div>
                          {entry.is_current_step && (
                            <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                              CURRENT STEP
                            </span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formattedDate.date}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {formattedDate.time}
                          </div>
                        </div>
                      </div>

                      {/* Action details */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            <span className="font-medium">
                              {entry.action_type === 'submitted' ? 'Submitted by: ' :
                               entry.action_type === 'forwarded' ? 'Forwarded by: ' :
                               entry.action_type === 'approved' ? 'Approved by: ' :
                               entry.action_type === 'rejected' ? 'Rejected by: ' :
                               entry.action_type === 'finalized' ? 'Finalized by: ' :
                               'Action performed by: '}
                            </span>
                            {entry.action_by_name}
                          </span>
                        </div>

                        {/* Forward-specific tracking */}
                        {entry.action_type === 'forwarded' && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center mb-2">
                              <ArrowRight className="w-5 h-5 text-blue-600 mr-2" />
                              <span className="font-medium text-gray-900">Forwarding Details</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">From:</span>
                                <p className="font-medium text-gray-900">
                                  {entry.forwarded_from_name || entry.action_by_name || 'System'}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">To:</span>
                                <p className="font-medium text-gray-900">
                                  {entry.forwarded_to_name || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comments */}
                        {entry.comments && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="w-4 h-4 text-gray-500 mt-1" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Comments:</span>
                                <p className="text-sm text-gray-700 mt-1">{entry.comments}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {trackingData.filter(entry => entry.action_type === 'forwarded').length}
                </div>
                <div className="text-gray-600">Forwards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {trackingData.filter(entry => entry.action_type === 'approved').length}
                </div>
                <div className="text-gray-600">Approvals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {trackingData.filter(entry => entry.action_type === 'rejected').length}
                </div>
                <div className="text-gray-600">Rejections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {trackingData.length}
                </div>
                <div className="text-gray-600">Total Steps</div>
              </div>
            </div>
          </div>

          {/* Timeline Duration */}
          {requestDetails && trackingData.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">
                  <span className="font-medium">Request submitted:</span> {formatDate(requestDetails.submitted_date).date} at {formatDate(requestDetails.submitted_date).time}
                </span>
                <span className="text-gray-700">
                  <span className="font-medium">Last action:</span> {formatDate(trackingData[trackingData.length - 1].action_date).date} at {formatDate(trackingData[trackingData.length - 1].action_date).time}
                </span>
              </div>
              <div className="mt-2 text-center">
                <span className="text-sm text-gray-600">
                  Current approver: <span className="font-medium text-blue-700">{requestDetails.current_approver_name}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestTrackingPage;