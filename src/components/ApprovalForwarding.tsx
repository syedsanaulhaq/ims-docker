import React, { useState, useEffect } from 'react';
import { Clock, User, ArrowRight, CheckCircle, XCircle, Forward, FileText } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';
import { 
  approvalForwardingService, 
  RequestApproval, 
  ApprovalHistory, 
  WorkflowApprover,
  ApprovalAction,
  RequestLaneSummary
} from '../services/approvalForwardingService';
import { sessionService } from '../services/sessionService';
import InventoryCheckModal from './InventoryCheckModal';

interface ApprovalForwardingProps {
  approvalId: string;
  onActionComplete?: () => void;
}

export const ApprovalForwarding: React.FC<ApprovalForwardingProps> = ({ 
  approvalId, 
  onActionComplete 
}) => {
  const [approval, setApproval] = useState<RequestApproval | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [availableForwarders, setAvailableForwarders] = useState<WorkflowApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Session-based state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState({
    canApprove: false,
    canForward: false,
    canFinalize: false
  });
  
  // Form state
  const [selectedForwarder, setSelectedForwarder] = useState('');
  const [comments, setComments] = useState('');
  const [forwardingType, setForwardingType] = useState<'approval' | 'action'>('approval');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [workflowUsers, setWorkflowUsers] = useState<any[]>([]);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [laneSummary, setLaneSummary] = useState<RequestLaneSummary | null>(null);
  
  // Inventory check state
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);

  // Helper functions for timeline display
  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return <Forward className="w-5 h-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'submitted':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string, isCurrentStep: boolean) => {
    if (isCurrentStep) {
      return 'border-blue-500 bg-blue-50 ring-2 ring-blue-200';
    }
    
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return 'border-blue-500 bg-blue-50';
      case 'approved':
        return 'border-green-500 bg-green-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      case 'submitted':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    loadApprovalData();
    loadWorkflows();
  }, [approvalId]);

  const loadWorkflows = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/workflows`);
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.data);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const loadWorkflowUsers = async (workflowId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/workflows/${workflowId}/approvers`);
      const data = await response.json();
      if (data.success) {
        setWorkflowUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading workflow users:', error);
    }
  };

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      
      // Refresh session to get latest user data
      const user = await sessionService.refreshSession();
      setCurrentUser(user);
      const [approvalData, historyData, forwardersData] = await Promise.all([
        approvalForwardingService.getApprovalDetails(approvalId),
        approvalForwardingService.getApprovalHistory(approvalId),
        approvalForwardingService.getAvailableForwarders(approvalId)
      ]);

      const lanesData = approvalData?.request_id
        ? await approvalForwardingService.getRequestLanes(approvalData.request_id).catch(() => null)
        : null;
      
      setApproval(approvalData);
      setHistory(historyData);
      setLaneSummary(lanesData);
      
      // Filter forwarders to only include other users in the workflow (not current user)
      const filteredForwarders = forwardersData.filter(f => f.user_id !== user?.user_id);
      setAvailableForwarders(filteredForwarders);
      
      // Check current user permissions in this workflow
      if (user) {
        const userInWorkflow = forwardersData.find(f => f.user_id === user.user_id);
        
        // User can only take actions if they are:
        // 1. In the workflow AND
        // 2. The current approver (not someone who already acted and forwarded) AND
        // 3. The request status is still 'pending' (not approved/rejected/finalized)
        const isCurrentApprover = approvalData.current_approver_id === user.user_id;
        const isPending = approvalData.current_status === 'pending';
        
        if (userInWorkflow && isCurrentApprover && isPending) {
          setUserPermissions({
            canApprove: userInWorkflow.can_approve,
            canForward: userInWorkflow.can_forward,
            canFinalize: userInWorkflow.can_finalize
          });
          } else {
          if (!isPending) {
            } else if (!isCurrentApprover) {
            } else {
            }
          setUserPermissions({ canApprove: false, canForward: false, canFinalize: false });
        }
      }
    } catch (error) {
      console.error('Error loading approval data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: 'forwarded' | 'approved' | 'rejected' | 'finalized') => {
    if (!approval || !currentUser) return;
    
    // Check permissions before proceeding
    const hasPermission = 
      (actionType === 'approved' && userPermissions.canApprove) ||
      (actionType === 'rejected' && userPermissions.canApprove) ||
      (actionType === 'forwarded' && userPermissions.canForward) ||
      (actionType === 'finalized' && userPermissions.canFinalize);
    
    if (!hasPermission) {
      alert(`You don't have permission to ${actionType} this request`);
      return;
    }
    
    try {
      setActionLoading(true);
      
      // For approval type forwarding, we need to get the logged-in user's supervisor
      let forwardToUserId = selectedForwarder;
      
      if (actionType === 'forwarded' && forwardingType === 'approval') {
        // Get currently logged-in user's supervisor from backend
        try {
          const response = await fetch(`${getApiBaseUrl()}/user/${currentUser.user_id}/supervisor`);
          const data = await response.json();
          if (data.success && data.supervisor_id) {
            forwardToUserId = data.supervisor_id;
            } else {
            setActionLoading(false);
            alert('Could not find your supervisor. Please select Action (Admin) forwarding instead.');
            return;
          }
        } catch (error) {
          console.error('Error getting supervisor:', error);
          setActionLoading(false);
          alert('Error finding supervisor. Please try again or restart the backend server.');
          return;
        }
      } else if (actionType === 'forwarded' && forwardingType === 'action') {
        // For action type, user must select from workflow
        if (!selectedForwarder) {
          setActionLoading(false);
          alert('Please select a workflow and user to forward to');
          return;
        }
      }
      
      // Final validation - ensure we have someone to forward to
      if (actionType === 'forwarded' && !forwardToUserId) {
        setActionLoading(false);
        alert('Please select a person to forward to');
        return;
      }
      
      const action: ApprovalAction = {
        action_type: actionType,
        comments: comments || undefined,
        forwarded_to: actionType === 'forwarded' ? forwardToUserId : undefined,
        forwarding_type: actionType === 'forwarded' ? forwardingType : undefined
      };

      let result: RequestApproval;
      
      switch (actionType) {
        case 'forwarded':
          result = await approvalForwardingService.forwardRequest(approvalId, action);
          break;
        case 'approved':
          result = await approvalForwardingService.approveRequest(approvalId, action);
          
          // After approval, trigger issuance workflow if this is a stock issuance request
          if (approval.request_type === 'stock_issuance') {
            try {
              // Step 1: Determine issuance source for each approved item
              const itemsResponse = await fetch(`${getApiBaseUrl()}/stock-issuance/requests/${approval.request_id}`);
              const itemsData = await itemsResponse.json();
              
              if (itemsData.success && itemsData.data && itemsData.data.length > 0) {
                const requestData = itemsData.data[0];
                const items = requestData.items || [];
                
                for (const item of items) {
                  if (item.item_status !== 'Approved') continue; // Only issue approved items
                  
                  // Determine source for this item
                  const sourceResponse = await fetch(`${getApiBaseUrl()}/issuance/determine-source`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      stock_issuance_item_id: item.id,
                      item_master_id: item.item_master_id,
                      required_quantity: item.approved_quantity || item.requested_quantity,
                      wing_id: requestData.wing?.wing_id || 1
                    })
                  });
                  
                  const sourceData = await sourceResponse.json();
                  
                  if (sourceData.success) {
                    const issuanceSource = sourceData.issuance_source;
                    const qtyToIssue = item.approved_quantity || item.requested_quantity;
                    
                    // Issue from determined source
                    if (issuanceSource === 'wing_store') {
                      await fetch(`${getApiBaseUrl()}/issuance/issue-from-wing`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          stock_issuance_item_id: item.id,
                          stock_issuance_request_id: approval.request_id,
                          item_master_id: item.item_master_id,
                          quantity: qtyToIssue,
                          wing_id: requestData.wing?.wing_id || 1,
                          issued_by: currentUser?.user_name || 'System'
                        })
                      });
                    } else if (issuanceSource === 'admin_store') {
                      await fetch(`${getApiBaseUrl()}/issuance/issue-from-admin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          stock_issuance_item_id: item.id,
                          stock_issuance_request_id: approval.request_id,
                          item_master_id: item.item_master_id,
                          quantity: qtyToIssue,
                          issued_by: currentUser?.user_name || 'System'
                        })
                      });
                    }
                  }
                }
                
                // Step 2: Finalize issuance
                await fetch(`${getApiBaseUrl()}/issuance/finalize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    stock_issuance_request_id: approval.request_id,
                    finalized_by: currentUser?.user_name || 'System'
                  })
                });
                
                }
            } catch (issuanceError) {
              console.error('⚠️ Issuance workflow error (non-blocking):', issuanceError);
              // Don't fail the approval if issuance fails - it can be processed manually
            }
          }
          break;
        case 'rejected':
          if (!comments?.trim()) {
            alert('Please provide a reason for rejection');
            return;
          }
          result = await approvalForwardingService.rejectRequest(approvalId, action);
          break;
        case 'finalized':
          result = await approvalForwardingService.finalizeRequest(approvalId, action);
          break;
        default:
          throw new Error('Invalid action type');
      }

      // Refresh data
      await loadApprovalData();
      
      // Reset form
      setComments('');
      setSelectedForwarder('');
      setShowActionPanel(false);
      
      // Notify parent
      if (onActionComplete) {
        onActionComplete();
      }
      
      alert(`Request ${actionType} successfully!`);
      
    } catch (error: any) {
      console.error(`Error ${actionType} request:`, error);
      alert(`Failed to ${actionType} request: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading approval details...</div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="text-red-600 p-4">
        Failed to load approval details
      </div>
    );
  }

  const canTakeAction = approval.current_status === 'pending';
  const currentUserCanFinalize = availableForwarders.some(f => f.can_finalize);
  const parentStatusBadgeClass =
    laneSummary?.parent_status === 'approved'
      ? 'bg-green-100 text-green-800'
      : laneSummary?.parent_status === 'partially_approved'
        ? 'bg-blue-100 text-blue-800'
        : laneSummary?.parent_status === 'rejected'
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="space-y-6">
      {/* Approval Status Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Approval Status
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            approval.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            approval.current_status === 'approved' ? 'bg-green-100 text-green-800' :
            approval.current_status === 'rejected' ? 'bg-red-100 text-red-800' :
            approval.current_status === 'finalized' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {approval.current_status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Request Type:</span>
            <div className="text-gray-900">{approval.request_type}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Request ID:</span>
            <div className="text-gray-900 font-mono">{approval.request_id}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted By:</span>
            <div className="text-gray-900">{approval.submitted_by_name}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted Date:</span>
            <div className="text-gray-900">
              {(() => {
                const date = new Date(approval.submitted_date);
                return date.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
              })()}
            </div>
          </div>
          {approval.current_status === 'pending' && (
            <>
              <div>
                <span className="font-medium text-gray-700">Selected Approver:</span>
                <div className="text-gray-900">{approval.current_approver_name}</div>
              </div>
            </>
          )}
        </div>

        {laneSummary && laneSummary.lane_count > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Group Workflow Lanes</h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${parentStatusBadgeClass}`}>
                Parent: {String(laneSummary.parent_status || 'pending').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {laneSummary.lanes.map((lane) => {
                const laneBadgeClass =
                  lane.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : lane.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800';

                return (
                  <div key={`lane-${lane.group_number}`} className="rounded-md border border-gray-200 p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">Group {lane.group_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${laneBadgeClass}`}>
                        {String(lane.status || 'pending').toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-700 space-y-1">
                      <div>Step: {lane.current_step_order || 0} of {lane.total_steps || 0}</div>
                      <div>Approver: {lane.lane_approver_name || 'Unassigned'}</div>
                      <div>Items: {lane.lane_item_count || 0}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Items Requested Section */}
      {approval.request_type === 'stock_issuance' && (
        <>
          <ItemsList 
            approvalId={approvalId} 
            canApprove={userPermissions.canApprove}
            onCheckInventory={(item) => {
              setSelectedItemForCheck(item);
              setShowInventoryCheck(true);
            }}
          />
          
          {/* Inventory Check Modal */}
          {showInventoryCheck && selectedItemForCheck && approval && (
            <InventoryCheckModal
              isOpen={showInventoryCheck}
              onClose={() => {
                setShowInventoryCheck(false);
                setSelectedItemForCheck(null);
              }}
              itemDetails={{
                item_master_id: selectedItemForCheck.item_id || selectedItemForCheck.item_master_id,
                item_name: selectedItemForCheck.nomenclature || selectedItemForCheck.item_name,
                nomenclature: selectedItemForCheck.nomenclature,
                requested_quantity: selectedItemForCheck.requested_quantity,
                unit: selectedItemForCheck.unit || 'units'
              }}
              stockIssuanceId={approval.request_id}
              wingId={selectedItemForCheck.wing_id || 1}
              wingName={selectedItemForCheck.wing_name || 'Wing 1'}
              currentUser={currentUser}
              onVerificationRequested={() => {
                // Verification request sent - keep modal open to show success state
                // Don't reload approval data - user can manually refresh if needed
                }}
              onConfirmAvailable={() => {
                // Item confirmed available - supervisor can proceed with approval
                }}
            />
          )}
        </>
      )}

      {/* Action Panel */}
      {canTakeAction && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">
              Take Action
            </h4>
            <button
              onClick={() => setShowActionPanel(!showActionPanel)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={actionLoading}
            >
              {showActionPanel ? 'Hide Actions' : 'Show Actions'}
            </button>
          </div>

          {showActionPanel && (
            <div className="space-y-4">
              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments / Notes
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add your comments here..."
                />
              </div>

              {/* Forward To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forward To
                </label>
                
                {/* Forwarding Type Selection */}
                <div className="mb-3 p-3 bg-gray-50 rounded-md">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Forwarding Type:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="forwardingType"
                        value="approval"
                        checked={forwardingType === 'approval'}
                        onChange={(e) => {
                          setForwardingType(e.target.value as 'approval' | 'action');
                          setSelectedForwarder('');
                          setSelectedWorkflow('');
                          setWorkflowUsers([]);
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Approval (Supervisor)</span>
                        <span className="text-xs text-gray-500 ml-1">- Auto-forward to supervisor</span>
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="forwardingType"
                        value="action"
                        checked={forwardingType === 'action'}
                        onChange={(e) => {
                          setForwardingType(e.target.value as 'approval' | 'action');
                          setSelectedForwarder('');
                          setSelectedWorkflow('');
                          setWorkflowUsers([]);
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Action (Admin)</span>
                        <span className="text-xs text-gray-500 ml-1">- Forward via workflow</span>
                      </span>
                    </label>
                  </div>
                </div>
                
                {/* Show different UI based on forwarding type */}
                {forwardingType === 'approval' ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Auto-forwarding enabled:</span> Request will be automatically sent to your supervisor for approval.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Workflow Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Select Workflow:
                      </label>
                      <select
                        value={selectedWorkflow}
                        onChange={(e) => {
                          setSelectedWorkflow(e.target.value);
                          setSelectedForwarder('');
                          if (e.target.value) {
                            loadWorkflowUsers(e.target.value);
                          } else {
                            setWorkflowUsers([]);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a workflow...</option>
                        {workflows.map((workflow) => (
                          <option key={workflow.id} value={workflow.id}>
                            {workflow.workflow_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* User Selection */}
                    {selectedWorkflow && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Select User from Workflow:
                        </label>
                        <select
                          value={selectedForwarder}
                          onChange={(e) => setSelectedForwarder(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a user...</option>
                          {workflowUsers.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.user_name} - {user.user_designation || 'No designation'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current User Info */}
              {currentUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-1">Acting as:</h5>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{currentUser.user_name}</span>
                    <span className="text-blue-600 ml-2">({currentUser.role})</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Permissions: 
                    {userPermissions.canApprove && <span className="ml-1 bg-green-100 text-green-800 px-1 rounded">Approve</span>}
                    {userPermissions.canForward && <span className="ml-1 bg-blue-100 text-blue-800 px-1 rounded">Forward</span>}
                    {userPermissions.canFinalize && <span className="ml-1 bg-purple-100 text-purple-800 px-1 rounded">Finalize</span>}
                  </div>
                </div>
              )}

              {/* Action Buttons - Based on Current User Permissions */}
              <div className="flex space-x-3 pt-4">
                {/* Forward Button - Only show if user can forward */}
                {userPermissions.canForward && (
                  <button
                    onClick={() => handleAction('forwarded')}
                    disabled={actionLoading || (forwardingType === 'action' && !selectedForwarder)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Processing...' : 'Forward'}
                  </button>
                )}

                {/* Approve Button - Only show if user can approve */}
                {userPermissions.canApprove && (
                  <button
                    onClick={() => handleAction('approved')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                )}

                {/* Reject Button - Only show if user can approve (approve permission includes reject) */}
                {userPermissions.canApprove && (
                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                )}

                {/* Finalize Button - Only show if user can finalize */}
                {userPermissions.canFinalize && (
                  <button
                    onClick={() => handleAction('finalized')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Processing...' : 'Finalize'}
                  </button>
                )}
                
                {/* Show message if user has no permissions */}
                {!userPermissions.canApprove && !userPermissions.canForward && !userPermissions.canFinalize && currentUser && (
                  <div className="text-gray-600 py-2">
                    You don't have permission to take actions on this request.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval History & Tracking Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">Approval History & Tracking</h3>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Latest First
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tracking information available</p>
        ) : (
          <div className="space-y-4">
            {/* Data already sorted by backend in descending order (latest first) */}
            {history
              .slice()
              .sort((a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime())
              .map((entry, index) => (
              <div
                key={entry.id || index}
                className={`relative border-l-4 pl-6 pb-4 ${getActionColor(entry.action_type, entry.is_current_step)}`}
              >
                {/* Timeline dot */}
                <div className="absolute -left-3 top-2 bg-white border-4 border-gray-300 rounded-full p-1">
                  {getActionIcon(entry.action_type)}
                </div>

                {/* Current step indicator */}
                {entry.is_current_step && (
                  <div className="absolute -left-6 -top-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    Current
                  </div>
                )}

                {/* Step content */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        Step {entry.step_number}: {entry.action_type.charAt(0).toUpperCase() + entry.action_type.slice(1)}
                      </span>
                      {entry.is_current_step && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          entry.action_type === 'approved' ? 'bg-green-100 text-green-800' :
                          entry.action_type === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.action_type === 'approved' || entry.action_type === 'rejected' ? 'Completed' : 'Pending Action'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.action_date)}
                    </span>
                  </div>

                  {/* Action details */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">
                          {entry.action_type === 'submitted' ? 'Submitted by: ' :
                           entry.action_type === 'forwarded' ? 'Forwarded by: ' :
                           entry.action_type === 'approved' ? 'Approved by: ' :
                           entry.action_type === 'rejected' ? 'Rejected by: ' :
                           entry.action_type === 'finalized' ? 'Finalized by: ' :
                           'Action by: '}
                        </span>
                        <span className="font-medium text-gray-900">
                          {entry.action_by_name || 'System User'}
                        </span>
                        {entry.action_by_designation && (
                          <span className="text-gray-500"> ({entry.action_by_designation})</span>
                        )}
                      </span>
                    </div>

                    {/* Forward-specific details */}
                    {entry.action_type === 'forwarded' && entry.forwarded_to_name && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span>
                          <span className="font-medium">Forwarded to: </span>
                          <span className="font-medium text-gray-900">{entry.forwarded_to_name}</span>
                        </span>
                      </div>
                    )}

                    {/* Comments */}
                    {entry.comments && (
                      <div className="bg-gray-50 rounded p-2 mt-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Comments:</span> {entry.comments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Total Steps: <span className="font-medium">{history.length}</span>
            </span>
            <span className="text-gray-600">
              Current Status: <span className="font-medium">
                {(() => {
                  const currentStep = history.find(entry => entry.is_current_step);
                  if (!currentStep) return history[history.length - 1]?.action_type || 'Unknown';
                  
                  if (currentStep.action_type === 'approved') return 'Completed (Approved)';
                  if (currentStep.action_type === 'rejected') return 'Completed (Rejected)';
                  if (currentStep.action_type === 'forwarded') return 'Pending Action';
                  return currentStep.action_type.charAt(0).toUpperCase() + currentStep.action_type.slice(1);
                })()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Items List Component
const ItemsList: React.FC<{ 
  approvalId: string; 
  canApprove: boolean;
  onCheckInventory?: (item: any) => void;
}> = ({ approvalId, canApprove, onCheckInventory }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDecisions, setItemDecisions] = useState<{ [key: string]: { status: 'approved' | 'rejected' | null; comment: string } }>({});

  useEffect(() => {
    loadItems();
  }, [approvalId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      // Fetch items from the backend API
      const response = await fetch(`${getApiBaseUrl()}/approval-items/${approvalId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setItems(data.data);
      } else {
        setItems([]);
      }
      
    } catch (error) {
      console.error('❌ Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Requested</h3>
        <div className="text-gray-500">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Items Requested ({items.length})
      </h3>
      
      {items.length === 0 ? (
        <div className="text-gray-500">No items found for this request.</div>
      ) : (
        <div className="w-full overflow-x-auto -mx-6 px-6">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                {canApprove && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Inventory
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Comment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Action
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => {
                const itemKey = item.item_id || index;
                const decision = itemDecisions[itemKey] || { status: null, comment: '' };
                
                return (
                  <tr key={itemKey} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.nomenclature}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {item.item_description || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.requested_quantity}
                      {item.approved_quantity && (
                        <span className="text-green-600 ml-1 text-xs">
                          (✓ {item.approved_quantity})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.unit || 'units'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        decision.status === 'approved' ? 'bg-green-100 text-green-800' :
                        decision.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {decision.status ? decision.status.charAt(0).toUpperCase() + decision.status.slice(1) : 'Pending'}
                      </span>
                    </td>
                    {canApprove && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => onCheckInventory && onCheckInventory(item)}
                            className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 whitespace-nowrap"
                          >
                            Check
                          </button>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <input
                            type="text"
                            value={decision.comment}
                            onChange={(e) => {
                              const value = e.target.value;
                              setItemDecisions(prev => ({
                                ...prev,
                                [itemKey]: { ...prev[itemKey], comment: value, status: prev[itemKey]?.status || null }
                              }));
                            }}
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs w-24"
                            placeholder="Note"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setItemDecisions(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey], status: 'approved', comment: prev[itemKey]?.comment || '' }
                                }));
                              }}
                              disabled={decision.status === 'approved'}
                              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                decision.status === 'approved'
                                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setItemDecisions(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey], status: 'rejected', comment: prev[itemKey]?.comment || '' }
                                }));
                              }}
                              disabled={decision.status === 'rejected'}
                              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                decision.status === 'rejected'
                                  ? 'bg-red-100 text-red-800 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              ✗
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Item Decisions Summary */}
      {Object.keys(itemDecisions).length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Item Decisions Summary</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(itemDecisions).map(([itemKey, decision]) => {
              const item = items.find(i => (i.item_id || items.indexOf(i).toString()) === itemKey);
              if (!item || !decision.status) return null;
              
              return (
                <div key={itemKey} className="flex items-center justify-between py-2 border-b border-blue-100 last:border-0">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.nomenclature}</span>
                    {decision.comment && (
                      <span className="ml-2 text-gray-600">- {decision.comment}</span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    decision.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {decision.status === 'approved' ? '✓ Accepted' : '✗ Rejected'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-gray-600">
            Note: These item-level decisions will be saved when you take action on the overall request below.
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalForwarding;