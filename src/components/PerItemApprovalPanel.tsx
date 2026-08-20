import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Package } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import approvalService from '@/services/approvalService';
import { sessionService } from '@/services/sessionService';

// Get API URL from environment or default to localhost
const getApiUrl = () => import.meta.env.VITE_API_URL || '';

interface PerItemApprovalPanelProps {
  approvalId: string;
  onActionComplete?: () => void;
  activeFilter?: 'pending' | 'approved' | 'rejected' | 'returned' | 'forwarded' | 'all';
  viewMode?: 'supervisor' | 'admin';
}

interface ItemDecision {
  itemId: string;
  decision: 'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor' | null;
  approvedQuantity: number;
  reason?: string;
}

type DecisionValue = Exclude<ItemDecision['decision'], null>;

interface RequestLane {
  group_number: number;
  current_step_order: number;
  total_steps: number;
  lane_role_label?: string | null;
}

interface WorkflowStep {
  step_order: number;
  roles: string[];
}

interface RequestItem {
  id: string;
  item_id?: string;
  nomenclature?: string;
  item_name?: string;
  custom_item_name?: string;
  requested_quantity?: number;
  quantity?: number;
  required_quantity?: number;
  requestedQty?: number;
  stock_status?: string;
  current_stock?: number;
  wing_stock_available?: number;
  issued_quantity?: number;
  item_code?: string;
  item_description?: string;
  unit?: string;
  approved_quantity?: number;
  allocated_quantity?: number;
  request_purpose?: string;
  expected_return_date?: string;
  is_returnable?: boolean;
  item_status?: string;
  item_master_id?: string | null;
  procurement_status?: string | null;
  procurement_tender_id?: string | null;
  procurement_tender_reference?: string | null;
}

const resolveRequestedQuantity = (item: RequestItem): number => {
  const candidates = [
    item.allocated_quantity,
    item.requested_quantity,
    item.quantity,
    item.required_quantity,
    item.requestedQty
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate ?? 0);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return 0;
};

interface ApprovalRequest {
  id: string;
  request_id?: string;
  request_number: string;
  requester_wing_id?: number | null;
  requester_branch_id?: number | null;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  purpose?: string;
  urgency_level?: string;
  items?: RequestItem[];
  approval_items?: RequestItem[];
  request_items?: RequestItem[];
  inventory_items?: RequestItem[];
  custom_items?: RequestItem[];
  submitted_by_name?: string;
  request_type?: string;
  scope_type?: string;
  current_status?: string;
  workflow_id?: string;
  current_approver_id?: string;
  submitted_by?: string;
  submitted_date?: string;
  finalized_by?: string | null;
  finalized_date?: string | null;
  rejected_by?: string | null;
  rejected_date?: string | null;
  rejection_reason?: string | null;
  created_date?: string;
  updated_date?: string;
  current_approver_name?: string;
  workflow_name?: string;
}

export const PerItemApprovalPanel: React.FC<PerItemApprovalPanelProps> = ({
  approvalId,
  onActionComplete,
  activeFilter = 'pending',
  viewMode = 'supervisor'
}) => {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('Wing Supervisor');
  const [approvalComments, setApprovalComments] = useState('');
  const [itemDecisions, setItemDecisions] = useState<Map<string, ItemDecision>>(new Map());
  const [requestStatus, setRequestStatus] = useState<'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor' | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkDecision, setBulkDecision] = useState<DecisionValue | null>(null);
  const [itemGroupMap, setItemGroupMap] = useState<Record<string, number>>({});
  const [laneByGroup, setLaneByGroup] = useState<Record<number, RequestLane>>({});
  const [workflowByGroup, setWorkflowByGroup] = useState<Record<number, WorkflowStep[]>>({});
  
  // Check if current user is an admin
  const currentUser = sessionService.getCurrentUser();
  const normalizedRoleNames = (currentUser?.ims_roles || []).map((r: any) => String(r?.role_name || '').toUpperCase());
  const isAdmin = normalizedRoleNames.includes('IMS_ADMIN');
  const isAdminWorkflowRoleUser = normalizedRoleNames.some((role: string) =>
    role === 'DG ADMIN' ||
    role === 'DD ADMIN' ||
    role === 'AD ADMIN-I' ||
    role === 'AD ADMIN-II' ||
    role === 'STOREKEEPER' ||
    role === 'WING_STORE_KEEPER' ||
    role === 'CUSTOM_WING_STORE_KEEPER' ||
    role === 'IMS_ADMIN' ||
    role === 'ADMINISTRATOR'
  );

  const isAdminWorkflowContext = isAdminWorkflowRoleUser && (
    viewMode === 'admin' ||
    String(request?.current_status || '').toLowerCase() === 'forwarded_to_admin' ||
    Boolean((request as any)?.is_admin_workflow)
  );

  // Stock check state
  const [selectedItemForStock, setSelectedItemForStock] = useState<any>(null);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);
  const [stockAvailable, setStockAvailable] = useState<number>(0);
  const [stockScopeLabel, setStockScopeLabel] = useState<'Wing' | 'Branch' | 'Main Inventory'>('Wing');
  const [wingConfirmItem, setWingConfirmItem] = useState<any>(null);
  const [wingConfirmLoading, setWingConfirmLoading] = useState(false);
  const [wingStockAvailable, setWingStockAvailable] = useState<number>(0);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'sent' | 'error' | null>(null);

  // Helper function to check if request has any returned items
  const hasReturnedItems = () => {
    if (!request?.items) return false;
    return request.items.some((item: any) => 
      item.decision_type === 'RETURN' ||
      (item.decision_type === 'REJECT' && item.rejection_reason?.toLowerCase().includes('returned to requester'))
    );
  };

  const getTotalAvailableStock = (item: RequestItem) => {
    // Admin workflow always operates against central/main inventory.
    if (isAdminWorkflowContext) {
      const admin = Number((item as any)?.admin_stock_available ?? 0);
      return Number.isFinite(admin) ? admin : 0;
    }
    const wing = Number(item?.wing_stock_available ?? item?.current_stock ?? 0);
    const admin = Number((item as any)?.admin_stock_available ?? 0);
    const total = (Number.isFinite(wing) ? wing : 0) + (Number.isFinite(admin) ? admin : 0);
    return total;
  };

  const isOutOfStock = (item: RequestItem) => {
    return getTotalAvailableStock(item) <= 0;
  };

  const isProcurementLocked = (item: RequestItem) => {
    // Kept for legacy compatibility: real lock is based on actual stock availability.
    return isOutOfStock(item);
  };

  const getProcurementLockLabel = (item: RequestItem) => {
    return 'Out of Stock / Needs Procurement';
  };

  // Helper function to check if controls should be disabled
  const shouldDisableControls = () => {
    // Disable controls when the request is not in an actionable state for the current user.
    // The activeFilter only affects which items are listed; it must not lock the form.
    if (hasReturnedItems()) return true;

    const actionableStatuses = isAdminWorkflowContext
      ? ['pending', 'forwarded_to_admin', 'forwarded_to_supervisor']
      : ['pending'];

    const status = String(request?.current_status || '').toLowerCase();
    return !actionableStatuses.includes(status);
  };

  const isDecisionStage =
    request?.current_status === 'pending' ||
    (isAdminWorkflowContext && request?.current_status === 'forwarded_to_admin');

  useEffect(() => {
    loadApprovalRequest();
  }, [approvalId]);

  const loadApprovalRequest = async () => {
    try {
      setLoading(true);
      // Fetch the approval request details
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/approvals/${approvalId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load approval');
      const responseData = await response.json();
      
      // Extract data from wrapper if present
      let data = responseData.data || responseData;

      // Ensure items array exists - try multiple possible field names
      if (!data.items) {
        if (data.approval_items) {
          data.items = data.approval_items;
        } else if (data.request_items) {
          data.items = data.request_items;
        } else if (data.item_list) {
          data.items = data.item_list;
        } else {
          data.items = [];
        }
      }

      // If still no items but we have item_ids, we need to fetch them separately
      if (!data.items || (Array.isArray(data.items) && data.items.length === 0) || !Array.isArray(data.items)) {
        try {
          const apiUrl = getApiUrl();
          const itemsResponse = await fetch(`${apiUrl}/api/approval-items/${approvalId}`, {
            credentials: 'include'
          });
          if (itemsResponse.ok) {
            const itemsDataWrapper = await itemsResponse.json();
            const itemsData = itemsDataWrapper.data || itemsDataWrapper;

            // Handle if response is an array or object with items property
            if (Array.isArray(itemsData)) {
              data.items = itemsData;
            } else if (itemsData?.items && Array.isArray(itemsData.items)) {
              data.items = itemsData.items;
            } else if (itemsData?.approval_items && Array.isArray(itemsData.approval_items)) {
              data.items = itemsData.approval_items;
            } else if (itemsData?.request_items && Array.isArray(itemsData.request_items)) {
              data.items = itemsData.request_items;
            } else if (itemsData?.data && Array.isArray(itemsData.data)) {
              data.items = itemsData.data;
            } else {
              data.items = [];
            }
          }
        } catch (err) {
          console.error('Failed to fetch approval items:', err);
          data.items = [];
        }
      }

      // Ensure items is always an array
      if (!Array.isArray(data.items)) {
        data.items = [];
      }

      setRequest(data);

      if (data.request_id) {
        try {
          const apiUrl = getApiUrl();

          const requestDetailsResp = await fetch(`${apiUrl}/api/approvals/request/${data.request_id}`, {
            credentials: 'include'
          });
          if (requestDetailsResp.ok) {
            const requestDetailsData = await requestDetailsResp.json();
            const groupedItems = Array.isArray(requestDetailsData?.items) ? requestDetailsData.items : [];

            // Enrich approval items with stock availability from the request details endpoint
            // so the Out-of-Stock badge uses the same main inventory source as Check Stock.
            if (groupedItems.length > 0 && Array.isArray(data.items)) {
              const stockByItemMasterId = new Map<string, any>();
              groupedItems.forEach((it: any) => {
                const imId = String(it.item_master_id || '');
                if (imId) {
                  stockByItemMasterId.set(imId, it);
                }
              });

              data.items = data.items.map((it: any) => {
                const imId = String(it.item_master_id || '');
                const stockItem = imId ? stockByItemMasterId.get(imId) : null;
                if (stockItem) {
                  return {
                    ...it,
                    admin_stock_available: stockItem.admin_stock_available,
                    wing_stock_available: stockItem.wing_stock_available,
                    can_fulfill_from_admin: stockItem.can_fulfill_from_admin,
                    can_fulfill_from_wing: stockItem.can_fulfill_from_wing
                  };
                }
                return it;
              });
            }

            const groupMap: Record<string, number> = {};
            groupedItems.forEach((it: any) => {
              const key = String(it.id || '');
              if (key && Number.isInteger(Number(it.group_number))) {
                groupMap[key] = Number(it.group_number);
              }
            });
            setItemGroupMap(groupMap);
          }

          const laneResp = await fetch(`${apiUrl}/api/approvals/request/${data.request_id}/lanes`, {
            credentials: 'include'
          });
          if (laneResp.ok) {
            const laneData = await laneResp.json();
            const laneMap: Record<number, RequestLane> = {};
            const lanes = Array.isArray(laneData?.lanes) ? laneData.lanes : [];
            lanes.forEach((lane: any) => {
              const groupNum = Number(lane.group_number);
              if (Number.isInteger(groupNum) && groupNum > 0) {
                laneMap[groupNum] = {
                  group_number: groupNum,
                  current_step_order: Number(lane.current_step_order || 0),
                  total_steps: Number(lane.total_steps || 0),
                  lane_role_label: lane.lane_role_label || null
                };
              }
            });
            setLaneByGroup(laneMap);

            const uniqueGroups = Object.keys(laneMap).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
            const workflowEntries = await Promise.all(uniqueGroups.map(async (groupNumber) => {
              try {
                const cfgResp = await fetch(`${apiUrl}/api/approvals/workflow/configs?group_number=${groupNumber}`, {
                  credentials: 'include'
                });
                if (!cfgResp.ok) return [groupNumber, []] as const;
                const cfgData = await cfgResp.json();
                const groupCfg = Array.isArray(cfgData?.data) ? cfgData.data.find((entry: any) => Number(entry.group_number) === groupNumber) : null;
                const steps = Array.isArray(groupCfg?.steps)
                  ? groupCfg.steps.map((step: any) => ({
                      step_order: Number(step.step_order || 0),
                      roles: Array.isArray(step.designations) ? step.designations.map((d: any) => String(d.value || '').trim()).filter(Boolean) : []
                    })).filter((step: WorkflowStep) => step.step_order > 0)
                  : [];
                return [groupNumber, steps] as const;
              } catch {
                return [groupNumber, []] as const;
              }
            }));

            const workflowMap: Record<number, WorkflowStep[]> = {};
            workflowEntries.forEach(([groupNumber, steps]) => {
              workflowMap[groupNumber] = steps;
            });
            setWorkflowByGroup(workflowMap);
          }
        } catch (ctxErr) {
          }
      }
      
      // Initialize item decisions from database values for highlighting
      if (data.items && Array.isArray(data.items)) {
        const initialDecisions = new Map<string, ItemDecision>();
        data.items.forEach((item: any) => {
          if (item.decision_type) {
            let decision: 'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor' | null = null;
            let approvedQty = 0;
            
            switch (item.decision_type) {
              case 'APPROVE_FROM_STOCK':
                decision = 'approve_wing';
                approvedQty = resolveRequestedQuantity(item);
                break;
              case 'FORWARD_TO_ADMIN':
                decision = 'forward_admin';
                approvedQty = resolveRequestedQuantity(item);
                break;
              case 'FORWARD_TO_PROCUREMENT':
                decision = 'forward_procurement';
                approvedQty = 0;
                break;
              case 'FORWARD_TO_SUPERVISOR':
                decision = 'forward_supervisor';
                approvedQty = resolveRequestedQuantity(item);
                break;
                case 'REJECT':
                  if (item.rejection_reason?.toLowerCase().includes('returned to requester')) {
                    decision = 'return';
                  } else {
                    decision = 'reject';
                  }
                  break;
                case 'RETURN':
                  // New explicit return decision type (DB + backend will use this)
                  decision = 'return';
                  break;
            }

            
            if (decision) {
              initialDecisions.set(item.id, {
                itemId: item.id,
                decision,
                approvedQuantity: approvedQty,
                reason: item.rejection_reason || item.forwarding_reason || ''
              });
            }
          }
        });
        setItemDecisions(initialDecisions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load approval request');
      console.error('Error loading approval:', err);
    } finally {
      setLoading(false);
    }
  };

  const setItemDecision = (
    itemId: string,
    decision: 'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor',
    approvedQty: number
  ) => {
    const newDecisions = new Map(itemDecisions);
    const existingDecision = newDecisions.get(itemId);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason: existingDecision?.reason || ''
    });
    setItemDecisions(newDecisions);
  };

  const handleRequestStatusChange = (status: 'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor' | null) => {
    setRequestStatus(status);
    
    const newDecisions = new Map<string, ItemDecision>();
    
    if (request?.items && Array.isArray(request.items)) {
      if (status === 'reject') {
        // Reject all items
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'reject',
            approvedQuantity: 0,
            reason: 'Request rejected at request level'
          });
        });
      } else if (status === 'approve_wing') {
        // Approve all items
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'approve_wing',
            approvedQuantity: getItemQuantity(item),
            reason: 'Request approved at request level'
          });
        });
      } else if (status === 'forward_admin') {
        // Forward all items to admin
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'forward_admin',
            approvedQuantity: 0,
            reason: 'Request forwarded to admin at request level'
          });
        });
      } else if (status === 'forward_procurement') {
        // Forward all items to procurement
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'forward_procurement',
            approvedQuantity: 0,
            reason: 'Request forwarded to procurement at request level'
          });
        });
      } else if (status === 'forward_supervisor') {
        // Forward all items to supervisor
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'forward_supervisor',
            approvedQuantity: 0,
            reason: 'Request forwarded to supervisor at request level'
          });
        });
      } else if (status === 'return') {
        // Return all items to requester
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'return',
            approvedQuantity: 0,
            reason: 'Request returned to requester at request level'
          });
        });
      } else if (status === 'return_supervisor') {
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'return_supervisor',
            approvedQuantity: 0,
            reason: 'Returned to supervisor for review'
          });
        });
      }
      
      if (newDecisions.size > 0) {
        setItemDecisions(newDecisions);
      }
    }
  };

  const handleItemDecisionChange = (itemId: string, decision: 'approve_wing' | 'forward_admin' | 'forward_procurement' | 'forward_supervisor' | 'reject' | 'return' | 'return_supervisor', approvedQty: number) => {
    setItemDecision(itemId, decision, approvedQty);
    
    // Update request status based on item decisions
    const newDecisions = new Map(itemDecisions);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason: newDecisions.get(itemId)?.reason || ''
    });
    
    // Priority-based auto-sync logic:
    // 1. If ANY item is returned → request = return (highest priority)
    // 2. If ALL items have the SAME status → request = that status
    // 3. Otherwise → don't auto-sync (allow mixed states)
    const anyItemReturned = Array.from(newDecisions.values()).some(d => d.decision === 'return' || d.decision === 'return_supervisor');
    
    // Auto-update request status based on item decisions
    if (anyItemReturned) {
      // If ANY item is returned → set request status to return
      setRequestStatus('return');
    } else if (newDecisions.size > 0) {
      // Check if all items have the same status
      const firstDecision = Array.from(newDecisions.values())[0]?.decision;
      const allItemsSameStatus = Array.from(newDecisions.values()).every(d => d.decision === firstDecision);
      
      if (allItemsSameStatus) {
        // If ALL items have the same status → set request to that status
        setRequestStatus(firstDecision);
      }
    }
  };

  const getItemName = (item: RequestItem) => {
    return item.nomenclature || item.item_name || item.custom_item_name || 'Unknown Item';
  };

  const getItemQuantity = (item: RequestItem) => {
    return resolveRequestedQuantity(item);
  };

  const getEditableQuantity = (item: RequestItem) => {
    const itemId = getItemId(item);
    const decision = getItemDecision(itemId);
    const decisionQty = Number(decision?.approvedQuantity);
    if (
      decision &&
      (decision.decision === 'approve_wing' ||
        decision.decision === 'forward_admin' ||
        decision?.decision === 'forward_procurement' ||
        decision.decision === 'forward_supervisor')
    ) {
      if (Number.isFinite(decisionQty) && decisionQty > 0) {
        return decisionQty;
      }
      return getItemQuantity(item);
    }

    if (Number.isFinite(decisionQty) && decisionQty >= 0) {
      return decisionQty;
    }

    return getItemQuantity(item);
  };

  const updateItemQuantity = (item: RequestItem, nextValue: string) => {
    const itemId = getItemId(item);
    if (!itemId) return;

    const parsedQty = Math.max(0, parseInt(nextValue || '0', 10) || 0);
    const existingDecision = getItemDecision(itemId);
    const newDecisions = new Map(itemDecisions);

    newDecisions.set(itemId, {
      itemId,
      decision: existingDecision?.decision || null,
      approvedQuantity: parsedQty,
      reason: existingDecision?.reason || ''
    });

    setItemDecisions(newDecisions);
  };

  const getItemId = (item: RequestItem) => {
    return item.id || item.item_id || '';
  };

  const getItemDecision = (itemId: string): ItemDecision | undefined => {
    return itemDecisions.get(itemId);
  };

  // Helper function to filter items by current approval status
  const getFilteredItems = () => {
    if (!request?.items || !Array.isArray(request.items)) return [];

    const normalizeDecisionType = (value: any) => String(value || '').trim().toUpperCase();
    
    // Filter based on which card the user clicked (activeFilter)
    // not based on the approval's overall status
    
    // If user clicked pending, show items with PENDING decision type
    // Also include forwarded states because these are still pending decisions for current approver stage.
    if (activeFilter === 'pending') {
      return request.items.filter((item: any) => 
        ['', 'PENDING', 'FORWARD_TO_ADMIN', 'FORWARD_TO_SUPERVISOR', 'FORWARD_TO_PROCUREMENT'].includes(
          normalizeDecisionType(item.decision_type)
        )
      );
    }
    
    // If user clicked approved, show only approved items
    if (activeFilter === 'approved') {
      return request.items.filter((item: any) => 
        ['APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT'].includes(
          normalizeDecisionType(item.decision_type)
        )
      );
    }
    
    // If user clicked rejected, show only rejected items
    if (activeFilter === 'rejected') {
      return request.items.filter((item: any) => 
        normalizeDecisionType(item.decision_type) === 'REJECT' && 
        !item.rejection_reason?.toLowerCase().includes('returned to requester')
      );
    }
    
    // If user clicked returned, show only returned items
    if (activeFilter === 'returned') {
      return request.items.filter((item: any) => 
        normalizeDecisionType(item.decision_type) === 'RETURN' || 
        (normalizeDecisionType(item.decision_type) === 'REJECT' && 
         item.rejection_reason?.toLowerCase().includes('returned to requester'))
      );
    }
    
    // If user clicked forwarded, show only forwarded items
    if (activeFilter === 'forwarded') {
      return request.items.filter((item: any) => 
        ['FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN', 'FORWARD_TO_PROCUREMENT'].includes(
          normalizeDecisionType(item.decision_type)
        )
      );
    }
    
    // Default or "all": show all items
    return request.items;
  };

  const hasDecisionForAllItems = (): boolean => {
    if (!request || !request.items || !Array.isArray(request.items) || request.items.length === 0) return false;
    return request.items.every(item => getItemDecision(getItemId(item))?.decision !== null);
  };

  const getDecisionSummary = () => {
    if (!request || !request.items) return { approveWing: 0, forwardAdmin: 0, forwardSupervisor: 0, reject: 0, undecided: 0 };
    const decisions = request.items.map(item => getItemDecision(getItemId(item)));
      return {
      approveWing: decisions.filter(d => d?.decision === 'approve_wing').length,
      forwardAdmin: decisions.filter(d => d?.decision === 'forward_admin').length,
      forwardProcurement: decisions.filter(d => d?.decision === 'forward_procurement').length,
        forwardSupervisor: decisions.filter(d => d?.decision === 'forward_supervisor' || d?.decision === 'return_supervisor').length,
      reject: decisions.filter(d => d?.decision === 'reject').length,
      undecided: decisions.filter(d => !d || !d.decision).length
    };
  };

  const getItemGroupNumber = (item: RequestItem): number | null => {
    const key = String(getItemId(item));
    const group = itemGroupMap[key];
    return Number.isInteger(group) && group > 0 ? group : null;
  };

  const isFinalStep = (item: RequestItem): boolean => {
    const groupNumber = getItemGroupNumber(item);
    if (!groupNumber) return true;

    const lane = laneByGroup[groupNumber];
    if (lane) {
      return lane.current_step_order >= lane.total_steps;
    }
    return true;
  };

  const getNextForwardRoleLabel = (item: RequestItem): string => {
    const groupNumber = getItemGroupNumber(item);
    if (!groupNumber) return 'To Next Workflow Role';

    const lane = laneByGroup[groupNumber];
    const steps = workflowByGroup[groupNumber] || [];
    if (lane && steps.length > 0) {
      const nextStep = steps.find((step) => step.step_order === (lane.current_step_order + 1));
      if (nextStep && nextStep.roles.length > 0) {
        return `To ${nextStep.roles.join(' / ')}`;
      }
    }

    return 'To Next Workflow Role';
  };

  const shouldShowProcurementForward = () => {
    const normalizedRequestType = String(request?.request_type || '').trim().toLowerCase();
    const normalizedScopeType = String(request?.scope_type || (request as any)?.approval?.scope_type || '').trim().toLowerCase();
    const isProcurementManagedRequest = ['branch', 'individual', 'personal'].includes(normalizedRequestType) || ['branch', 'individual', 'personal'].includes(normalizedScopeType);
    const hasOutOfStockItem = request?.items?.some((item: any) => isOutOfStock(item)) ?? false;
    return viewMode === 'admin' && isProcurementManagedRequest && hasOutOfStockItem;
  };

  const getForwardAdminLabel = (suffix = '') => suffix ? `Forward to Admin${suffix}` : 'Forward to Admin';

  const getForwardProcurementLabel = (suffix = '') => suffix ? `Forward to Procurement${suffix}` : 'Forward to Procurement';

  const submitDecisions = async () => {
    if (!request) {
      setError('Approval request not loaded');
      return;
    }

    if (!hasDecisionForAllItems()) {
      setError('Please make a decision for each item before submitting');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const items = request.items || [];
      const itemAllocations = items.map(item => {
        const itemId = getItemId(item);
        const decision = getItemDecision(itemId);
      let decisionType: 'APPROVE_FROM_STOCK' | 'FORWARD_TO_ADMIN' | 'FORWARD_TO_PROCUREMENT' | 'FORWARD_TO_SUPERVISOR' | 'REJECT' | 'RETURN' = 'REJECT';
        let allocatedQty = 0;
        const revisedQty = Math.max(0, Number((decision?.approvedQuantity ?? getItemQuantity(item)) || 0));

        if (decision?.decision === 'approve_wing') {
          decisionType = 'APPROVE_FROM_STOCK';
          allocatedQty = revisedQty;
        } else if (decision?.decision === 'forward_admin') {
          decisionType = 'FORWARD_TO_ADMIN';
          allocatedQty = revisedQty;
        } else if (decision?.decision === 'forward_procurement') {
          decisionType = 'FORWARD_TO_PROCUREMENT';
          allocatedQty = 0;
        } else if (decision?.decision === 'forward_supervisor') {
          decisionType = 'FORWARD_TO_SUPERVISOR';
          allocatedQty = revisedQty;
        } else if (decision?.decision === 'return') {
          decisionType = 'RETURN'; // Use explicit RETURN decision type
          allocatedQty = 0;
        } else if (decision?.decision === 'return_supervisor') {
          decisionType = 'FORWARD_TO_SUPERVISOR';
          allocatedQty = 0;
        } else {
          decisionType = 'REJECT';
          allocatedQty = 0;
        }

        return {
          requested_item_id: itemId,
          requested_quantity: revisedQty,
          allocated_quantity: allocatedQty,
          decision_type: decisionType,
          rejection_reason: decision?.decision === 'reject' 
            ? (decision.reason || 'Request rejected by supervisor') 
            : decision?.decision === 'return'
            ? (decision.reason || 'Request returned to requester for editing')
            : undefined,
          forwarding_reason: (decision?.decision === 'forward_admin' || decision?.decision === 'forward_procurement' || decision?.decision === 'forward_supervisor' || decision?.decision === 'return_supervisor')
            ? (decision.reason || 'Forwarded for further approval')
            : undefined
        };
      });

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approver_name: approverName || 'System',
          approver_designation: approverDesignation || 'Wing Supervisor',
          approval_comments: approvalComments,
          item_allocations: itemAllocations
        })
      });

      if (!response.ok) throw new Error('Failed to submit approval');
      
      setSuccess('Per-item approval decisions submitted successfully!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading approval details...</p>
        </div>
      </div>
    );
  }

  const checkStockAvailability = async (item: any) => {
    setSelectedItemForStock(item);
    setStockCheckLoading(true);
    try {
      const itemMasterId = item.item_master_id || item.id;
      const requestedQty = getItemQuantity(item);
      // Admin workflow context (admin dashboard / forwarded-to-admin) always uses central/main inventory.
      // Non-admin contexts continue to use wing/branch/personal scoped inventory as before.
      const normalizedRequestType = String(request?.request_type || '').trim().toLowerCase();
      const shouldUseAdminInventory = isAdminWorkflowContext;
      const inventoryScope = shouldUseAdminInventory ? 'admin' : (normalizedRequestType === 'branch' || normalizedRequestType === 'individual' || normalizedRequestType === 'personal' ? 'branch' : 'wing');
      const wingId = Number(request?.requester_wing_id || currentUser?.wing_id || 0) || null;
      const branchId = Number(request?.requester_branch_id || currentUser?.intBranchID || currentUser?.branch_id || 0) || null;

      setStockScopeLabel(shouldUseAdminInventory ? 'Main Inventory' : (inventoryScope === 'branch' ? 'Branch' : 'Wing'));

      const response = await fetch(`${getApiUrl()}/api/inventory/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemMasterId,
          requestedQuantity: requestedQty,
          wingId,
          branchId,
          inventoryScope
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const available = Number(data?.data?.available_quantity ?? data?.available_quantity ?? 0);
        setStockAvailable(available);
        } else {
        setStockAvailable(0);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
      setStockAvailable(0);
    } finally {
      setStockCheckLoading(false);
    }
  };

  const forwardToStoreKeeper = async (item: any) => {
    setWingConfirmItem(item);
    setWingConfirmLoading(true);
    setConfirmationStatus('pending');
    setError('');
    
    try {
      // Create and forward a verification request to the wing store keeper
      const itemId = item.item_id || item.item_master_id || item.id;
      const currentUser = sessionService.getCurrentUser();
      const requestedByUserId = currentUser?.user_id || 'unknown';
      const requestedByName = currentUser?.user_name || approverName || 'System';
      
      // Get wing ID - use current user's wing or fallback to 19
      let wingId = currentUser?.wing_id;
      if (!wingId) {
        wingId = 19;  // Fallback to wing 19
      }
      
      const apiUrl = getApiUrl();
      const endpoint = `${apiUrl}/api/inventory/request-verification`;
      
      // Build payload with camelCase field names as expected by backend
      const payload = {
        stockIssuanceId: approvalId,
        itemMasterId: itemId,
        itemNomenclature: getItemName(item),
        requestedQuantity: getItemQuantity(item),
        requestedByUserId: requestedByUserId,
        requestedByName: requestedByName,
        wingId: wingId
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('❌ Failed to parse JSON response:', parseErr);
        setError('Server returned invalid response: ' + responseText.substring(0, 100));
        setConfirmationStatus('error');
        setWingConfirmLoading(false);
        return;
      }
      
      if (response.status === 200 || response.ok || data?.success) {
        setConfirmationStatus('sent');
        setSuccess('✓ Verification request forwarded to Store Keeper - they will verify and respond');
      } else {
        const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        setError(errorMsg);
        setConfirmationStatus('error');
        console.error('❌ Request failed:', { status: response.status, statusOk: response.ok, data });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Error forwarding to store keeper:', err);
      setError('Error: ' + errorMsg);
      setConfirmationStatus('error');
    } finally {
      setWingConfirmLoading(false);
    }
  };

  const confirmWingStock = async (item: any) => {
    setWingConfirmItem(item);
    setWingConfirmLoading(true);
    setConfirmationStatus('pending');
    setError('');
    
    try {
      // Send stock confirmation request to wing stock supervisor
      // Use item_id, item_master_id, or id whichever is available
      const itemId = item.item_id || item.item_master_id || item.id;
      const apiUrl = getApiUrl();
      const endpoint = `${apiUrl}/api/approvals/${approvalId}/request-wing-stock-confirmation`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          item_id: itemId,
          item_name: getItemName(item),
          requested_quantity: getItemQuantity(item),
          approval_id: approvalId,
          request_type: 'wing_stock_confirmation'
        })
      });
      
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('❌ Failed to parse JSON response:', parseErr);
        setError('Server returned invalid response: ' + responseText.substring(0, 100));
        setConfirmationStatus('error');
        setWingConfirmLoading(false);
        return;
      }
      
      // Consider it successful if response.ok OR data.success OR status 200
      if (response.status === 200 || response.ok || data?.success) {
        setConfirmationStatus('sent');
        setSuccess('✓ Confirmation request sent to Wing Stock Supervisor');
      } else {
        const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        setError(errorMsg);
        setConfirmationStatus('error');
        console.error('❌ Request failed:', { status: response.status, statusOk: response.ok, data });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Error sending wing stock confirmation request:', err);
      setError('Error: ' + errorMsg);
      setConfirmationStatus('error');
    } finally {
      setWingConfirmLoading(false);
    }
  };

  const handleConfirmWing = () => {
    // This will be called by the wing stock supervisor from their dashboard
    setConfirmationStatus('confirmed');
    };

  const handleRejectWing = () => {
    setConfirmationStatus('rejected');
    };

  if (!request) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">Failed to load approval request</AlertDescription>
      </Alert>
    );
  }

  const summary = getDecisionSummary();
  const filteredItems = getFilteredItems();

  const toRomanNumeral = (num: number): string => {
    const values: Array<[number, string]> = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let n = num;
    let out = '';
    values.forEach(([v, s]) => {
      while (n >= v) {
        out += s;
        n -= v;
      }
    });
    return out || String(num);
  };

  const groupedFilteredItems = filteredItems.reduce((acc: Array<{ groupNumber: number | null; label: string; items: RequestItem[] }>, item) => {
    const groupNumber = getItemGroupNumber(item);
    const label = groupNumber ? `Group-${toRomanNumeral(groupNumber)} (${groupNumber})` : 'Ungrouped';
    const existing = acc.find((entry) => entry.groupNumber === groupNumber);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ groupNumber, label, items: [item] });
    }
    return acc;
  }, []).sort((a, b) => {
    if (a.groupNumber === null) return 1;
    if (b.groupNumber === null) return -1;
    return a.groupNumber - b.groupNumber;
  });

  const filteredItemIds = filteredItems.map((item) => getItemId(item)).filter(Boolean);
  const selectedFilteredCount = filteredItemIds.filter((id) => selectedItemIds.has(id)).length;
  const isAllFilteredSelected = filteredItemIds.length > 0 && selectedFilteredCount === filteredItemIds.length;

  const toggleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const toggleGroupSelection = (groupItems: RequestItem[], checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      groupItems.forEach((item) => {
        const id = getItemId(item);
        if (!id) return;
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const toggleAllFilteredSelection = (checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      filteredItemIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const applyBulkDecisionToSelection = () => {
    if (!bulkDecision || selectedFilteredCount === 0) return;

    selectedItemIds.forEach((itemId) => {
      const item = filteredItems.find((it) => getItemId(it) === itemId);
      if (!item) return;
      const approvedQty = (
        bulkDecision === 'approve_wing' ||
        bulkDecision === 'forward_admin' ||
        bulkDecision === 'forward_procurement' ||
        bulkDecision === 'forward_supervisor'
      ) ? getItemQuantity(item) : 0;
      handleItemDecisionChange(itemId, bulkDecision, approvedQty);
    });
  };

  const renderGroupedTableView = () => {
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No items in this request</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-h-[36rem] overflow-y-auto">
        <div className="p-3 border rounded-lg bg-slate-50 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={(e) => toggleAllFilteredSelection(e.target.checked)}
              disabled={shouldDisableControls()}
            />
            Select all items ({selectedFilteredCount}/{filteredItems.length})
          </label>

          {isDecisionStage && (
            <>
              <Select
                value={bulkDecision || undefined}
                onValueChange={(value) => setBulkDecision(value as DecisionValue)}
                disabled={shouldDisableControls() || selectedFilteredCount === 0}
              >
                <SelectTrigger className="w-[240px] h-9 bg-white">
                  <SelectValue placeholder="Bulk decision for selected..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_wing">Approve selected</SelectItem>
                  {(!isAdmin || isAdminWorkflowContext) && (
                    <SelectItem value="forward_admin">{getForwardAdminLabel(' selected')}</SelectItem>
                  )}
                  {shouldShowProcurementForward() && (
                    <SelectItem value="forward_procurement">{getForwardProcurementLabel(' selected')}</SelectItem>
                  )}
                  {!isAdminWorkflowContext && (
                    <SelectItem value="forward_supervisor">Forward to supervisor</SelectItem>
                  )}
                  {isAdminWorkflowContext && (
                    <SelectItem value="return_supervisor">Return to supervisor</SelectItem>
                  )}
                  <SelectItem value="return">Return to requester</SelectItem>
                  <SelectItem value="reject">Reject selected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={applyBulkDecisionToSelection}
                disabled={shouldDisableControls() || selectedFilteredCount === 0 || !bulkDecision}
              >
                Apply to Selected
              </Button>
            </>
          )}
        </div>

        {groupedFilteredItems.map((group) => {
          const groupIds = group.items.map((item) => getItemId(item)).filter(Boolean);
          const selectedInGroup = groupIds.filter((id) => selectedItemIds.has(id)).length;
          const groupAllSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;

          return (
            <div key={group.label} className="border rounded-lg overflow-hidden bg-white">
              <div className="px-3 py-2 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-900">{group.label}</h4>
                  <Badge variant="outline" className="text-xs">{group.items.length} item{group.items.length > 1 ? 's' : ''}</Badge>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    checked={groupAllSelected}
                    onChange={(e) => toggleGroupSelection(group.items, e.target.checked)}
                    disabled={shouldDisableControls()}
                  />
                  Select all in this group ({selectedInGroup}/{group.items.length})
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 w-12">Sel</th>
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-left px-3 py-2 w-24">Qty</th>
                      <th className="text-left px-3 py-2 w-56">Decision</th>
                      <th className="text-left px-3 py-2 w-72">Comments</th>
                      <th className="text-left px-3 py-2 w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const itemId = getItemId(item);
                      const decision = getItemDecision(itemId);

                      return (
                        <tr key={itemId} className="border-t align-top hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(itemId)}
                              onChange={(e) => toggleItemSelection(itemId, e.target.checked)}
                              disabled={shouldDisableControls()}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{getItemName(item)}</div>
                            <div className="text-xs text-gray-500">Code: {item.item_code || 'N/A'}</div>
                            {isOutOfStock(item) && (
                              <Badge variant="outline" className="mt-1 text-[11px] bg-amber-50 text-amber-800 border-amber-300">
                                {getProcurementLockLabel(item)}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isDecisionStage ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={getEditableQuantity(item)}
                                  onChange={(e) => updateItemQuantity(item, e.target.value)}
                                  disabled={shouldDisableControls() || (!isAdminWorkflowContext && isOutOfStock(item))}
                                  className="h-8 w-20"
                                />
                                <span className="text-xs text-gray-600">No(s)</span>
                              </div>
                            ) : (
                              <span>{getEditableQuantity(item)} No(s)</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isDecisionStage ? (
                              <Select
                                value={decision?.decision || undefined}
                                onValueChange={(value) => {
                                  const decisionValue = value as DecisionValue;
                                  const approvedQuantity = (
                                    decisionValue === 'approve_wing' ||
                                    decisionValue === 'forward_admin' ||
                                    decisionValue === 'forward_supervisor'
                                  ) ? getEditableQuantity(item) : 0;
                                  handleItemDecisionChange(itemId, decisionValue, approvedQuantity);
                                }}
                                disabled={shouldDisableControls()}
                              >
                                <SelectTrigger className="h-8 bg-white">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approve_wing">Approve</SelectItem>
                                  {(!isAdmin || isAdminWorkflowContext) && (
                                    <SelectItem value="forward_admin">{getForwardAdminLabel()}</SelectItem>
                                  )}
                                  {shouldShowProcurementForward() && (
                                    <SelectItem value="forward_procurement">{getForwardProcurementLabel()}</SelectItem>
                                  )}
                                  {!isAdminWorkflowContext && (
                                    <SelectItem value="forward_supervisor">Forward to supervisor</SelectItem>
                                  )}
                                  {isAdminWorkflowContext && (
                                    <SelectItem value="return_supervisor">Return to supervisor</SelectItem>
                                  )}
                                  <SelectItem value="return">Return to requester</SelectItem>
                                  <SelectItem value="reject">Reject</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-gray-500">Read-only</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              placeholder="Optional comments"
                              value={decision?.reason || ''}
                              onChange={(e) => {
                                const newDecisions = new Map(itemDecisions);
                                const currentDecision = newDecisions.get(itemId) || {
                                  itemId,
                                  decision: null,
                                  approvedQuantity: 0,
                                  reason: ''
                                };
                                newDecisions.set(itemId, {
                                  ...currentDecision,
                                  reason: e.target.value
                                });
                                setItemDecisions(newDecisions);
                              }}
                              disabled={shouldDisableControls()}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => checkStockAvailability(item)}>
                                Check Stock
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => forwardToStoreKeeper(item)}>
                                Forward to Store Keeper
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const isInWing = (item: RequestItem) => {
    // Check various indicators that item is available in wing
    // For now, assume items in the approval request are available unless explicitly marked otherwise
    return !item.issued_quantity || item.issued_quantity === 0;
  };

  return (
    <div className="space-y-6">
      {/* Approval Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasReturnedItems() && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                This request contains items that have been returned to the requester for revision. 
                All approval controls are disabled until the returned items are resubmitted.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-600 font-medium">Request Number</div>
              <div className="font-semibold">{request?.request_number || request?.id || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Requester</div>
              <div className="font-semibold">{request?.submitted_by_name || request?.requester_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Request Type</div>
              <div className="font-semibold">{request?.request_type || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Status</div>
              <Badge className="text-xs" variant="outline">{request?.current_status || 'N/A'}</Badge>
            </div>
          </div>

          {/* Request-Level Status Selection */}
          {!shouldDisableControls() && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-semibold mb-2 block">Request Decision</Label>
              <Select 
                value={requestStatus || ''} 
                onValueChange={(value) => handleRequestStatusChange(value as any)}
              >
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Select request decision..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_wing">
                    <span className="flex items-center gap-2">
                      ✓ {isAdminWorkflowContext ? 'Approve' : (isAdmin ? 'Approve from Admin Stock' : 'Approve from Wing')}
                    </span>
                  </SelectItem>
                  {(!isAdmin || isAdminWorkflowContext) && (
                  <SelectItem value="forward_admin">
                    <span className="flex items-center gap-2">
                      ⏭ {isAdminWorkflowContext ? `Forward to ${getNextForwardRoleLabel(request.items[0])}` : getForwardAdminLabel()}
                    </span>
                  </SelectItem>
                  )}
                  {shouldShowProcurementForward() && (
                  <SelectItem value="forward_procurement">
                    <span className="flex items-center gap-2">
                      ⏭ {getForwardProcurementLabel()}
                    </span>
                  </SelectItem>
                  )}
                  {!isAdminWorkflowContext && (
                  <SelectItem value="forward_supervisor">
                    <span className="flex items-center gap-2">
                      ↗ Forward to Supervisor
                    </span>
                  </SelectItem>
                  )}
                  {isAdminWorkflowContext && (
                  <SelectItem value="return_supervisor">
                    <span className="flex items-center gap-2">
                      ↩ Return to Supervisor
                    </span>
                  </SelectItem>
                  )}
                  <SelectItem value="return">
                    <span className="flex items-center gap-2">
                      ↩ Return All to Requester
                    </span>
                  </SelectItem>
                  <SelectItem value="reject">
                    <span className="flex items-center gap-2">
                      ✗ Reject All
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {requestStatus && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={`${
                    requestStatus === 'approve_wing' ? 'bg-green-100 text-green-800' :
                    requestStatus === 'forward_admin' ? 'bg-amber-100 text-amber-800' :
                    requestStatus === 'return_supervisor' ? 'bg-blue-100 text-blue-800' :
                    requestStatus === 'forward_supervisor' ? 'bg-blue-100 text-blue-800' :
                    requestStatus === 'return' ? 'bg-orange-100 text-orange-800' :
                    requestStatus === 'reject' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {requestStatus === 'approve_wing' ? (isAdminWorkflowContext && !isFinalStep(request.items[0]) ? `✓ Approve & Move to ${getNextForwardRoleLabel(request.items[0])}` : '✓ Approve') :
                     requestStatus === 'forward_admin' ? (isAdminWorkflowContext ? `⏭ Forward to ${getNextForwardRoleLabel(request.items[0])}` : `⏭ ${getForwardAdminLabel()}`) :
                     requestStatus === 'forward_procurement' ? `⏭ ${getForwardProcurementLabel()}` :
                    requestStatus === 'forward_supervisor' ? '↗ Forward to Supervisor' :
                    requestStatus === 'return_supervisor' ? '↩ Return to Supervisor' :
                     requestStatus === 'return' ? '↩ Return' :
                     requestStatus === 'reject' ? '✗ Reject' : 'Selected'}
                  </Badge>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-2">
                💡 Selecting any request-level action marks all items with that decision. You can also make individual item decisions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items with Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isDecisionStage ? 'Items for Decision' : `Items (${request?.current_status?.toUpperCase()})`}
            ({getFilteredItems().length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderGroupedTableView()}

        </CardContent>
      </Card>

      {/* Stock Details Modal */}
      <Dialog open={!!selectedItemForStock} onOpenChange={(open) => !open && setSelectedItemForStock(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stock Availability Details</DialogTitle>
          </DialogHeader>
          
          {selectedItemForStock && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Name</div>
                  <div className="font-semibold">{getItemName(selectedItemForStock)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Code</div>
                  <div className="font-semibold">{selectedItemForStock.item_code || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Requested Qty</div>
                  <div className="font-semibold">{getItemQuantity(selectedItemForStock)} No(s)</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">{stockScopeLabel} Stock Available</div>
                  {stockCheckLoading ? (
                    <div className="text-xs"><LoadingSpinner size="sm" className="inline" /> Loading...</div>
                  ) : (
                    <div className={`font-bold ${stockAvailable >= getItemQuantity(selectedItemForStock) ? 'text-green-600' : 'text-red-600'}`}>
                      {stockAvailable} No(s)
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Approved Qty</div>
                  <div className="font-semibold">{selectedItemForStock.approved_quantity || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Issued Qty</div>
                  <div className="font-semibold">{selectedItemForStock.issued_quantity || '0'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Status</div>
                  <div className="font-semibold">{selectedItemForStock.item_status || 'pending'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Returnable</div>
                  <div className="font-semibold">{selectedItemForStock.is_returnable ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 font-medium mb-1">Description</div>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedItemForStock.item_description || 'No description'}</p>
              </div>

              {/* Stock Status Badge */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                {stockAvailable >= getItemQuantity(selectedItemForStock) ? (
                  <div className="text-sm text-green-700">
                    <strong>✓ Stock Available</strong> - {stockAvailable} No(s) in stock (Requested: {getItemQuantity(selectedItemForStock)} No(s))
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    <strong>✗ Insufficient Stock</strong> - Only {stockAvailable} No(s) in stock (Requested: {getItemQuantity(selectedItemForStock)} No(s))
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => setSelectedItemForStock(null)} 
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Keeper Verification Modal */}
      <Dialog open={!!wingConfirmItem} onOpenChange={(open) => !open && setWingConfirmItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forward to Store Keeper for Verification</DialogTitle>
          </DialogHeader>
          
          {wingConfirmItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Name</div>
                  <div className="font-semibold">{getItemName(wingConfirmItem)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Code</div>
                  <div className="font-semibold">{wingConfirmItem.item_code || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Requested Qty</div>
                  <div className="font-semibold">{getItemQuantity(wingConfirmItem)} No(s)</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Current Stock</div>
                  {wingConfirmLoading ? (
                    <div className="text-xs"><LoadingSpinner size="sm" className="inline" /> Loading...</div>
                  ) : (
                    <div className={`font-bold ${wingStockAvailable >= getItemQuantity(wingConfirmItem) ? 'text-green-600' : 'text-amber-600'}`}>
                      {wingStockAvailable} No(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Request Info */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                {confirmationStatus === 'pending' && (
                  <div className="text-sm text-blue-700">
                    <strong>👤 Store Keeper Verification Request</strong><br/>
                    A verification request will be created and forwarded to the Store Keeper of this wing. They will physically verify the item availability and respond.
                  </div>
                )}
                {confirmationStatus === 'sent' && (
                  <div className="text-sm text-green-700">
                    <strong>✓ Request Sent Successfully</strong><br/>
                    The verification request has been forwarded to the Store Keeper. You can check the approval status once they respond.
                  </div>
                )}
                {confirmationStatus === 'error' && (
                  <div className="text-sm text-red-700">
                    <strong>❌ Error Sending Request</strong><br/>
                    Please try again or contact your administrator.
                  </div>
                )}
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {confirmationStatus === 'pending' && (
              <Button 
                onClick={() => forwardToStoreKeeper(wingConfirmItem)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={wingConfirmLoading}
              >
                {wingConfirmLoading ? 'Sending...' : '👤 Forward to Store Keeper'}
              </Button>
            )}
            {confirmationStatus === 'sent' && (
              <Button 
                onClick={() => setWingConfirmItem(null)} 
                className="flex-1"
              >
                Close
              </Button>
            )}
            {(confirmationStatus === 'confirmed' || confirmationStatus === 'rejected' || confirmationStatus === 'error') && (
              <Button 
                onClick={() => setWingConfirmItem(null)} 
                className="flex-1"
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex gap-2">
        <Button
          onClick={submitDecisions}
          disabled={submitting || !hasDecisionForAllItems() || shouldDisableControls()}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {submitting ? <LoadingSpinner /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Submit All Decisions
        </Button>
      </div>
    </div>
  );
};

export default PerItemApprovalPanel;

