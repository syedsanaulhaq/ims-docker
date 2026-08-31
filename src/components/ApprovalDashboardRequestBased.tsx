import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  approvalForwardingService, 
  RequestApproval 
} from '../services/approvalForwardingService';
import PerItemApprovalPanel from './PerItemApprovalPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CheckCircle, Clock, RefreshCw, Search, ChevronDown, ChevronUp } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

interface RequestSummary {
  id: string;
  request_id: string;
  request_type: string;
  submitted_by_name: string;
  submitted_date: string;
  current_approver_name?: string;
  request_status: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'return' | 'reject' | 'pending' | 'completed';
  total_items: number;
  approved_items: number;
  rejected_items: number;
  returned_items: number;
  forwarded_items: number;
  pending_items: number;
  lane_count: number;
  completed_lane_count: number;
  rejected_lane_count: number;
  pending_lane_count: number;
  lane_parent_status: string;
  lane_tooltip: string;
  issuance_transfer_status: 'pending_issue' | 'issued_to_requester' | 'unknown';
  issued_at?: string | null;
  approval: RequestApproval;
}

interface ApprovalDashboardRequestBasedProps {
  viewMode?: 'supervisor' | 'admin';
}

const ApprovalDashboardRequestBased: React.FC<ApprovalDashboardRequestBasedProps> = ({ viewMode = 'supervisor' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approve_wing_count: 0,
    reject_count: 0,
    forward_admin_count: 0,
    forward_supervisor_count: 0,
    return_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approve_wing' | 'reject' | 'forward_admin' | 'forward_supervisor' | 'return'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<'date' | 'requester'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [allScopedRequests, setAllScopedRequests] = useState<RequestSummary[]>([]);
  const selectedScope = new URLSearchParams(location.search).get('scope') || 'all';
  const [activeScopeTab, setActiveScopeTab] = useState<'individual' | 'branch' | 'wing'>(() => {
    if (selectedScope === 'branch' || selectedScope === 'wing') {
      return selectedScope;
    }
    return 'individual';
  });


  const statusPriority: Record<string, number> = {
    pending: 1,
    approved: 2,
    rejected: 3,
    returned: 3,
    forwarded: 4
  };

  const isAdminWorkflowRequest = (request: RequestSummary) => {
    const explicitFlag = (request.approval as any)?.is_admin_workflow;
    if (explicitFlag === true || explicitFlag === 1) {
      return true;
    }

    // Backward-compatible fallback for records created before explicit flag rollout.
    const items = Array.isArray((request.approval as any)?.items) ? (request.approval as any).items : [];
    const hasForwardToAdminItem = items.some((item: any) =>
      String(item?.decision_type || '').trim().toUpperCase() === 'FORWARD_TO_ADMIN'
    );
    const status = String((request.approval as any)?.current_status || '').toLowerCase();
    const forwardedByHistory = Boolean((request.approval as any)?.has_forwarded_to_admin_history);
    return hasForwardToAdminItem || status === 'forwarded_to_admin' || forwardedByHistory;
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        })
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, user]);

  useEffect(() => {
    let filteredRequests = allScopedRequests;

    if (activeFilter === 'pending') {
      filteredRequests = filteredRequests.filter(r => r.request_status === 'pending');
    } else {
      filteredRequests = filteredRequests.filter(r => r.request_status === activeFilter);
    }

    setRequests(filteredRequests);
  }, [allScopedRequests, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeScopeTab, searchTerm, activeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userId = (user as any)?.user_id || (user as any)?.Id;
      const lanePending = await withTimeout(
        approvalForwardingService.getMyLanePending().catch(() => null),
        30000,
        null
      );
      const pendingRequestIdSet = new Set(
        (lanePending || []).map((lane: any) => String(lane.request_id)).filter(Boolean)
      );
      const lanePendingAvailable = Array.isArray(lanePending);
      
      // Get all approvals for this user from all statuses
      const allStatuses = ['pending', 'approved', 'rejected', 'forwarded', 'returned'] as const;
      const allApprovals: RequestApproval[] = [];
      // Track which backend status each approval came from using precedence
      // so forwarded/rejected/returned is not downgraded to pending.
      const approvalSourceStatus = new Map<string, string>();
 
      const statusResults = await Promise.all(
        allStatuses.map(async (status) => {
          try {
            const approvals = await withTimeout(
              approvalForwardingService.getMyApprovalsByStatus(userId, status as any),
              30000,
              [] as RequestApproval[]
            );
            return { status, approvals };
          } catch (statusError) {
            console.warn(`Skipping approvals status '${status}' due to fetch error:`, statusError);
            return { status, approvals: [] as RequestApproval[] };
          }
        })
      );

      for (const { status, approvals } of statusResults) {
        for (const a of approvals) {
          const existingStatus = approvalSourceStatus.get(a.request_id);
          const existingPriority = existingStatus ? (statusPriority[existingStatus] || 0) : 0;
          const newPriority = statusPriority[status] || 0;

          if (!existingStatus || newPriority >= existingPriority) {
            approvalSourceStatus.set(a.request_id, status);
          }
        }
        allApprovals.push(...approvals);
      }

      // Fetch full details for each approval (which includes items)
      const requestMap = new Map<string, RequestSummary>();
      const statusCounts = {
        pending_count: 0,
        approve_wing_count: 0,
        reject_count: 0,
        forward_admin_count: 0,
        forward_supervisor_count: 0,
        return_count: 0
      };

      const uniqueApprovals = allApprovals.filter((approval) => {
        const requestId = approval.request_id;
        if (requestMap.has(requestId)) {
          return false;
        }
        requestMap.set(requestId, null as any);
        return true;
      });

      const apiUrl = `${import.meta.env.VITE_API_URL}`;
      const buildSummary = async (approval: RequestApproval): Promise<RequestSummary | null> => {
        const requestId = approval.request_id;

        try {
          let fullApproval = approval as any;
          const sourceStatus = approvalSourceStatus.get(requestId) || 'pending';
          const requestStatus = getRequestStatusFromApproval(approval, sourceStatus);

          const summary: RequestSummary = {
            id: approval.id,
            request_id: requestId,
            request_type: approval.request_type,
            submitted_by_name: approval.submitted_by_name || approval.submitted_by || 'Unknown',
            submitted_date: approval.submitted_date,
            current_approver_name: approval.current_approver_name,
            request_status: requestStatus,
            total_items: 0,
            approved_items: 0,
            rejected_items: 0,
            returned_items: 0,
            forwarded_items: 0,
            pending_items: 0,
            lane_count: 0,
            completed_lane_count: 0,
            rejected_lane_count: 0,
            pending_lane_count: 0,
            lane_parent_status: 'pending',
            lane_tooltip: '',
            issuance_transfer_status: 'unknown',
            issued_at: null,
            approval: null
          };

          if (fullApproval.items && fullApproval.request_number) {
            // OPTIMIZATION PATH: Use direct payload from list API
            summary.approval = { ...fullApproval, items: fullApproval.items } as any;
            
            const items = fullApproval.items || [];
            summary.total_items = items.length;
            items.forEach((item: any) => {
              const itemStatus = item.decision_type || 'PENDING';
              if (itemStatus === 'APPROVE_FROM_STOCK') {
                summary.approved_items++;
              } else if (itemStatus === 'REJECT') {
                summary.rejected_items++;
              } else if (itemStatus === 'RETURN') {
                summary.returned_items++;
              } else if (itemStatus === 'FORWARD' || itemStatus === 'FORWARD_TO_ADMIN' || itemStatus === 'FORWARD_TO_SUPERVISOR') {
                summary.forwarded_items++;
              } else {
                summary.pending_items++;
              }
            });
            
            // Set defaults for lanes/issuance to avoid parallel database calls on page load
            summary.lane_count = 0;
            summary.completed_lane_count = 0;
            summary.pending_lane_count = 0;
            summary.lane_parent_status = 'pending';
            summary.lane_tooltip = '';
            summary.issuance_transfer_status = 'unknown';
            
            return summary;
          }

          // FALLBACK PATH: Call detail endpoints if items/request_number are missing
          const detailResponse = await fetch(`${apiUrl}/api/approvals/${approval.id}`, {
            credentials: 'include'
          });

          if (!detailResponse.ok) {
            console.warn(`Failed to fetch details for approval ${approval.id}`);
            return null;
          }

          const detailData = await detailResponse.json();
          fullApproval = detailData.data || detailData;
          summary.approval = { ...fullApproval, items: fullApproval.items || [] } as any;

          const [issuanceResponse, laneSummary] = await Promise.all([
            fetch(`${apiUrl}/api/stock-issuance/${requestId}`, {
              credentials: 'include'
            }).catch(() => null),
            approvalForwardingService.getRequestLanes(requestId).catch(() => null)
          ]);

          if (issuanceResponse?.ok) {
            const issuancePayload = await issuanceResponse.json().catch(() => ({} as any));
            const issuanceRequest = issuancePayload?.request || {};
            const approvalStatusRaw = String(issuanceRequest?.approval_status || '').toLowerCase();
            const requestStatusRaw = String(issuanceRequest?.request_status || '').toLowerCase();
            const issued = approvalStatusRaw === 'issued' || approvalStatusRaw === 'completed' || requestStatusRaw === 'issued' || requestStatusRaw === 'completed';
            summary.issuance_transfer_status = issued ? 'issued_to_requester' : 'pending_issue';
            summary.issued_at = issuanceRequest?.issued_at || null;
          } else {
            summary.issuance_transfer_status = 'unknown';
          }

          const items = fullApproval.items || [];
          summary.total_items = items.length;

          items.forEach((item: any) => {
            const itemStatus = item.decision_type || 'PENDING';
            if (itemStatus === 'APPROVE_FROM_STOCK') {
              summary.approved_items++;
            } else if (itemStatus === 'REJECT') {
              summary.rejected_items++;
            } else if (itemStatus === 'RETURN') {
              summary.returned_items++;
            } else if (itemStatus === 'FORWARD' || itemStatus === 'FORWARD_TO_ADMIN' || itemStatus === 'FORWARD_TO_SUPERVISOR') {
              summary.forwarded_items++;
            } else {
              summary.pending_items++;
            }
          });

          if (laneSummary) {
            summary.lane_count = laneSummary.lane_count || 0;
            summary.lane_parent_status = laneSummary.parent_status || 'pending';
            summary.completed_lane_count = laneSummary.lanes.filter((lane) => lane.status === 'completed').length;
            summary.rejected_lane_count = laneSummary.lanes.filter((lane) => lane.status === 'rejected').length;
            summary.pending_lane_count = laneSummary.lanes.filter((lane) => lane.status !== 'completed' && lane.status !== 'rejected').length;
            const pendingGroups = laneSummary.lanes
              .filter((lane) => lane.status !== 'completed' && lane.status !== 'rejected')
              .map((lane) => lane.group_number)
              .join(', ');
            const completedGroups = laneSummary.lanes
              .filter((lane) => lane.status === 'completed')
              .map((lane) => lane.group_number)
              .join(', ');
            const rejectedGroups = laneSummary.lanes
              .filter((lane) => lane.status === 'rejected')
              .map((lane) => lane.group_number)
              .join(', ');
            summary.lane_tooltip = [
              `Parent: ${String(summary.lane_parent_status || 'pending').toUpperCase()}`,
              `Completed: ${completedGroups || '-'}`,
              `Pending: ${pendingGroups || '-'}`,
              `Rejected: ${rejectedGroups || '-'}`
            ].join(' | ');
          }

          return summary;
        } catch (error) {
          console.error(`Error fetching details for approval ${approval.id}:`, error);
          return null;
        }
      };

      const runWithConcurrency = async <T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) => {
        const results: R[] = [];
        let index = 0;

        const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
          while (index < items.length) {
            const currentIndex = index++;
            results[currentIndex] = await worker(items[currentIndex]);
          }
        });

        await Promise.all(runners);
        return results;
      };

      const summaries = await runWithConcurrency(uniqueApprovals, 6, buildSummary);

      for (const summary of summaries) {
        if (!summary) continue;
        requestMap.set(summary.request_id, summary);

        if (summary.request_status === 'pending') statusCounts.pending_count++;
        else if (summary.request_status === 'approve_wing') statusCounts.approve_wing_count++;
        else if (summary.request_status === 'reject') statusCounts.reject_count++;
        else if (summary.request_status === 'forward_admin') statusCounts.forward_admin_count++;
        else if (summary.request_status === 'forward_supervisor') statusCounts.forward_supervisor_count++;
        else if (summary.request_status === 'return') statusCounts.return_count++;
      }

      // Split flows by page mode to keep supervisor and admin experiences isolated.
      const scopedRequests = Array.from(requestMap.values()).filter(Boolean).filter((request) => {
        const adminWorkflow = isAdminWorkflowRequest(request);

        if (viewMode === 'admin') {
          return adminWorkflow;
        }

        // Keep supervisor ownership of "To Admin" history cards while still
        // hiding admin-workflow inbox items from the supervisor page.
        if (request.request_status === 'forward_admin') {
          return true;
        }

        return !adminWorkflow;
      });

      const scopedStatusCounts = {
        pending_count: scopedRequests.filter(r => r.request_status === 'pending').length,
        approve_wing_count: scopedRequests.filter(r => r.request_status === 'approve_wing').length,
        reject_count: scopedRequests.filter(r => r.request_status === 'reject').length,
        forward_admin_count: scopedRequests.filter(r => r.request_status === 'forward_admin').length,
        forward_supervisor_count: scopedRequests.filter(r => r.request_status === 'forward_supervisor').length,
        return_count: scopedRequests.filter(r => r.request_status === 'return').length,
      };

      const pendingFilteredScopedRequests = scopedRequests.filter((r) => {
        if (r.request_status !== 'pending') return true;

        const approvalData = r.approval as any;
        if (approvalData?.has_forwarded_to_admin_history) {
          return false;
        }

        const approvalStatus = String(approvalData?.approval_status || '').toLowerCase();
        if (approvalStatus.includes('forwarded to admin') || approvalStatus.includes('forwarded')) {
          return false;
        }

        if (!lanePendingAvailable) return true;
        if (pendingRequestIdSet.size === 0) return true;

        return pendingRequestIdSet.has(String(r.request_id)) || (r.lane_count || 0) === 0;
      });

      console.log(`[DEBUG] loadDashboardData - uniqueApprovals: ${uniqueApprovals.length}, summaries: ${summaries.filter(Boolean).length}, scopedRequests: ${scopedRequests.length}, pendingFilteredScopedRequests: ${pendingFilteredScopedRequests.length}`);
      setAllScopedRequests(pendingFilteredScopedRequests);
      setDashboardStats(scopedStatusCounts);
    } catch (error) {
      console.error('Error loading request-based dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRequestStatusFromApproval = (approval: RequestApproval, sourceStatus: string): RequestSummary['request_status'] => {
    // sourceStatus = which backend query returned this ('pending', 'approved', 'forwarded', 'rejected', 'returned')
    // For 'pending' source: these are things assigned to me that I need to act on -> show as pending
    if (sourceStatus === 'pending') {
      const approvalData = approval as any;
      const approvalStatus = String(approvalData?.approval_status || '').toLowerCase();

      if (approvalData?.has_forwarded_to_admin_history || approvalStatus.includes('forwarded to admin') || approvalStatus.includes('forwarded')) {
        return 'forward_admin';
      }

      return 'pending';
    }
    
    // For 'approved' source: things I was involved in that are now approved
    if (sourceStatus === 'approved') return 'approve_wing';
    
    // For 'rejected' source: things I rejected
    if (sourceStatus === 'rejected') return 'reject';
    
    // For 'returned' source: things I returned
    if (sourceStatus === 'returned') return 'return';
    
    // For 'forwarded' source: things I forwarded - split by direction
    if (sourceStatus === 'forwarded') {
      const status = approval.current_status;
      if (status === 'forwarded_to_supervisor') return 'forward_supervisor';
      return 'forward_admin'; // default for forwarded
    }
    
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approve_wing':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'forward_admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'forward_supervisor':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'return':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'completed':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approve_wing':
        return '✓ Approved';
      case 'reject':
        return '✗ Rejected';
      case 'forward_admin':
        return '⏭ Forward to Admin';
      case 'forward_supervisor':
        return '↗ Forward to Supervisor';
      case 'return':
        return '↩ Returned';
      case 'completed':
        return '✓ Completed';
      default:
        return 'New Request';
    }
  };

  const handleActionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setExpandedRequest(null);
  };

  const getLaneBadgeClass = (parentStatus: string) => {
    if (parentStatus === 'approved') return 'bg-green-100 text-green-800 border-green-300';
    if (parentStatus === 'partially_approved') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (parentStatus === 'rejected') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const renderTransferBadge = (request: RequestSummary) => {
    // Only show transfer badge if the request has been approved or completed
    if (request.request_status !== 'approve_wing' && request.request_status !== 'completed') {
      return null;
    }

    if (request.issuance_transfer_status === 'issued_to_requester') {
      return (
        <Badge
          variant="outline"
          className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300"
          title={request.issued_at ? `Issued at ${new Date(request.issued_at).toLocaleString()}` : 'Physically issued to requester'}
        >
          Inventory Transfer: Completed
        </Badge>
      );
    }

    // Default fallback for approved requests is 'Pending Issue'
    return (
      <Badge
        variant="outline"
        className="text-xs bg-amber-100 text-amber-800 border-amber-300"
        title="Approved but not yet physically issued by store"
      >
        Inventory Transfer: Pending Issue
      </Badge>
    );
  };

  const getFilteredRequests = () => {
    if (!searchTerm.trim()) {
      return requests;
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    return requests.filter((request) => 
      request.request_id.toLowerCase().includes(lowerSearch) ||
      request.submitted_by_name?.toLowerCase().includes(lowerSearch) ||
      request.request_type.toLowerCase().includes(lowerSearch) ||
      request.current_approver_name?.toLowerCase().includes(lowerSearch)
    );
  };

  const getSortedAndPaginatedRequests = () => {
    const filtered = getFilteredRequests();
    
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = new Date(a.submitted_date).getTime() - new Date(b.submitted_date).getTime();
      } else if (sortBy === 'requester') {
        compareValue = (a.submitted_by_name || '').localeCompare(b.submitted_by_name || '');
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredRequests().length / itemsPerPage);
  };

  // Group requests by type (personal vs wing-wise)
  const getPersonalRequests = () => {
    const filtered = getFilteredRequests();
    const personal = filtered.filter(r => {
      const scopeType = (r.approval?.scope_type || '').toLowerCase();
      return scopeType === 'individual';
    });
    return personal;
  };

  const getWingRequests = () => {
    const filtered = getFilteredRequests();
    const wing = filtered.filter(r => {
      const scopeType = (r.approval?.scope_type || '').toLowerCase();
      return scopeType === 'organizational';
    });
    return wing;
  };

  const getBranchRequests = () => {
    const filtered = getFilteredRequests();
    return filtered.filter(r => {
      const scopeType = (r.approval?.scope_type || '').toLowerCase();
      const requestType = String(r.request_type || '').toLowerCase();
      return scopeType === 'branch' || requestType === 'branch';
    });
  };

  // Get paginated results for personal requests
  const getPersonalPaginated = () => {
    const filtered = getPersonalRequests();
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.submitted_date).getTime() - new Date(b.submitted_date).getTime();
      } else if (sortBy === 'requester') {
        compareValue = (a.submitted_by_name || '').localeCompare(b.submitted_by_name || '');
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  // Get paginated results for wing requests
  const getWingPaginated = () => {
    const filtered = getWingRequests();
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.submitted_date).getTime() - new Date(b.submitted_date).getTime();
      } else if (sortBy === 'requester') {
        compareValue = (a.submitted_by_name || '').localeCompare(b.submitted_by_name || '');
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPersonalTotalPages = () => {
    return Math.ceil(getPersonalRequests().length / itemsPerPage);
  };

  const getWingTotalPages = () => {
    return Math.ceil(getWingRequests().length / itemsPerPage);
  };

  const getBranchPaginated = () => {
    const filtered = getBranchRequests();
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.submitted_date).getTime() - new Date(b.submitted_date).getTime();
      } else if (sortBy === 'requester') {
        compareValue = (a.submitted_by_name || '').localeCompare(b.submitted_by_name || '');
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  const getBranchTotalPages = () => {
    return Math.ceil(getBranchRequests().length / itemsPerPage);
  };

  const shouldShowScope = (scope: 'personal' | 'branch' | 'wing') => {
    return selectedScope === 'all' || selectedScope === scope;
  };

  const handleConfigureWorkflows = () => {
    navigate('/dashboard/workflow-admin');
  };

  const handleManageApprovers = () => {
    navigate('/dashboard/workflow-admin');
  };

  // Chart data for admin dashboard view
  const SCOPE_COLORS = ['#3B82F6', '#10B981', '#8B5CF6'];
  const STATUS_COLORS = ['#EAB308', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#F97316'];
  const COMPLETION_COLORS = ['#22C55E', '#EAB308', '#EF4444', '#6B7280'];

  const scopeChartData = useMemo(() => {
    const personal = requests.filter(r => {
      const scopeType = String((r.approval as any)?.scope_type || '').toLowerCase();
      const requestType = String(r.request_type || '').toLowerCase();
      return scopeType === 'individual' || scopeType === 'personal' || requestType === 'personal' || requestType === 'individual';
    }).length;
    const branch = requests.filter(r => {
      const scopeType = String((r.approval as any)?.scope_type || '').toLowerCase();
      const requestType = String(r.request_type || '').toLowerCase();
      return scopeType === 'branch' || requestType === 'branch';
    }).length;
    const wing = requests.filter(r => {
      const scopeType = String((r.approval as any)?.scope_type || '').toLowerCase();
      const requestType = String(r.request_type || '').toLowerCase();
      return scopeType === 'organizational' || scopeType === 'wing' || requestType === 'wing' || requestType === 'organizational';
    }).length;
    return [
      { name: 'Personal', value: personal },
      { name: 'Branch', value: branch },
      { name: 'Wing', value: wing }
    ].filter(d => d.value > 0);
  }, [requests]);

  const statusChartData = useMemo(() => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: '#EAB308' },
      approve_wing: { label: 'Approved', color: '#22C55E' },
      reject: { label: 'Rejected', color: '#EF4444' },
      forward_admin: { label: 'To Admin', color: '#3B82F6' },
      forward_supervisor: { label: 'To Supervisor', color: '#A855F7' },
      return: { label: 'Returned', color: '#F97316' }
    };
    return Object.entries(statusMap).map(([key, meta]) => ({
      name: meta.label,
      value: requests.filter(r => r.request_status === key).length,
      color: meta.color
    }));
  }, [requests]);

  const completionChartData = useMemo(() => {
    const completed = requests.filter(r =>
      r.request_status === 'approve_wing' || r.request_status === 'completed'
    ).length;
    const pending = requests.filter(r => r.request_status === 'pending').length;
    const rejected = requests.filter(r => r.request_status === 'reject').length;
    const other = requests.length - completed - pending - rejected;
    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
      { name: 'Other', value: other > 0 ? other : 0 }
    ].filter(d => d.value > 0);
  }, [requests]);

  const timelineChartData = useMemo(() => {
    const grouped: Record<string, { date: string; personal: number; branch: number; wing: number }> = {};
    requests.forEach(r => {
      const date = new Date(r.submitted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) {
        grouped[date] = { date, personal: 0, branch: 0, wing: 0 };
      }
      const scopeType = String((r.approval as any)?.scope_type || '').toLowerCase();
      const requestType = String(r.request_type || '').toLowerCase();
      if (scopeType === 'individual' || scopeType === 'personal' || requestType === 'personal' || requestType === 'individual') {
        grouped[date].personal++;
      } else if (scopeType === 'branch' || requestType === 'branch') {
        grouped[date].branch++;
      } else if (scopeType === 'organizational' || scopeType === 'wing' || requestType === 'wing' || requestType === 'organizational') {
        grouped[date].wing++;
      } else {
        grouped[date].personal++;
      }
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);
  }, [requests]);

  const metricCards = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(r => r.request_status === 'approve_wing' || r.request_status === 'completed').length;
    const pending = requests.filter(r => r.request_status === 'pending').length;
    const rejected = requests.filter(r => r.request_status === 'reject').length;
    const totalItems = requests.reduce((sum, r) => sum + (r.total_items || 0), 0);
    return [
      { label: 'Total Requests', value: total, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Completed', value: completed, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Pending', value: pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { label: 'Rejected', value: rejected, color: 'text-red-600', bg: 'bg-red-50' },
      { label: 'Total Items', value: totalItems, color: 'text-purple-600', bg: 'bg-purple-50' }
    ];
  }, [requests]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading Supervisor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          {viewMode === 'admin' ? 'Admin Workflow Approvals' : 'Supervisor Dashboard'}
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          {viewMode === 'admin'
            ? 'Review requests forwarded to admin workflow and return/forward decisions'
            : 'All requests received from your subordinates — review and take action'}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {dashboardStats.pending_count} New Requests
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/personal-dashboard')}
          >
            Go to Personal Dashboard
          </Button>
        </div>
      </div>

      {/* Quick Stats - Request-Based */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'pending' 
              ? 'bg-white border border-slate-200 border-l-yellow-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-yellow-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-700 font-semibold text-sm">New Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{dashboardStats.pending_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approve_wing')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approve_wing' 
              ? 'bg-white border border-slate-200 border-l-green-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-green-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold text-sm">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboardStats.approve_wing_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('reject')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'reject' 
              ? 'bg-white border border-slate-200 border-l-red-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-red-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 font-semibold text-sm">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardStats.reject_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forward_admin')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forward_admin' 
              ? 'bg-white border border-slate-200 border-l-blue-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-blue-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 font-semibold text-sm">To Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.forward_admin_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forward_supervisor')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forward_supervisor' 
              ? 'bg-white border border-slate-200 border-l-purple-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-purple-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700 font-semibold text-sm">To Supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{dashboardStats.forward_supervisor_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('return')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'return' 
              ? 'bg-white border border-slate-200 border-l-orange-500 shadow-md' 
              : 'bg-white border border-slate-200 border-l-orange-500 hover:shadow-md'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 font-semibold text-sm">Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dashboardStats.return_count}</div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Admin Dashboard Metrics & Charts */}
      {viewMode === 'admin' && requests.length > 0 && (
        <div className="space-y-6 mb-6">
          {/* Summary metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {metricCards.map((metric, index) => (
              <Card key={index} className={`border border-slate-200 shadow-sm ${metric.bg}`}>
                <CardContent className="p-4 text-center">
                  <div className={`text-3xl font-bold ${metric.color}`}>{metric.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{metric.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row 1: scope and completion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Requests by Scope</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {scopeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SCOPE_COLORS[index % SCOPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Completed vs Pending vs Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {completionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COMPLETION_COLORS[index % COMPLETION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2: status bar and timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Requests by Scope Over Time (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="personal" name="Personal" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="branch" name="Branch" stroke="#10B981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="wing" name="Wing" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Scope Tabs */}
      {viewMode === 'admin' && (
        <div className="flex items-center gap-2 border-b border-gray-200 mb-4">
          {[
            { key: 'individual', label: 'Individual Working', count: getPersonalRequests().length },
            { key: 'branch', label: 'Branch', count: getBranchRequests().length },
            { key: 'wing', label: 'Wing', count: getWingRequests().length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveScopeTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeScopeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Personal Requests Table */}
      {(viewMode !== 'admin' ? shouldShowScope('personal') : activeScopeTab === 'individual') && (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-4xl font-bold flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 text-lg font-semibold px-4 py-2">Individual Working</Badge>
              <span className="text-gray-600 text-2xl">({getPersonalRequests().length})</span>
            </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by as 'date' | 'requester');
                    setSortOrder(order as 'asc' | 'desc');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="requester-asc">Requester A-Z</option>
                  <option value="requester-desc">Requester Z-A</option>
                </select>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={() => {/* Already filtering in real-time */}}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {getPersonalRequests().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No individual working requests'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getPersonalPaginated().map((request) => (
                <Card key={request.id} className="border border-slate-200 hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {(request.approval as any)?.request_number || request.request_id}
                          </h3>
                          <Badge className="text-xs">
                            {request.request_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(request.request_status)}`}
                          >
                            {getStatusLabel(request.request_status)}
                          </Badge>
                          {request.lane_count > 0 && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${getLaneBadgeClass(request.lane_parent_status)}`}
                              title={request.lane_tooltip}
                            >
                              Lanes {request.completed_lane_count}/{request.lane_count}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <div>Submitted by: <span className="font-medium text-gray-900">{request.submitted_by_name}</span></div>
                          <div>
                            Submitted: {new Date(request.submitted_date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                          <div>{renderTransferBadge(request)}</div>
                        </div>

                        {/* Item Summary */}
                        <div className="flex flex-wrap gap-3 text-xs mb-3">
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <span className="font-medium text-gray-700">Total:</span>
                            <span className="text-gray-900 font-bold">{request.total_items}</span>
                          </div>
                          {request.approved_items > 0 && (
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded text-green-800">
                              <span>✓</span>
                              <span className="font-bold">{request.approved_items}</span>
                            </div>
                          )}
                          {request.rejected_items > 0 && (
                            <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded text-red-800">
                              <span>✗</span>
                              <span className="font-bold">{request.rejected_items}</span>
                            </div>
                          )}
                          {request.returned_items > 0 && (
                            <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded text-orange-800">
                              <span>↩</span>
                              <span className="font-bold">{request.returned_items}</span>
                            </div>
                          )}
                          {request.pending_items > 0 && (
                            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded text-yellow-800">
                              <span>⏳</span>
                              <span className="font-bold">{request.pending_items}</span>
                            </div>
                          )}
                          {request.lane_count > 0 && (
                            <div className="flex items-center gap-1 bg-sky-100 px-2 py-1 rounded text-sky-800">
                              <span>Lanes:</span>
                              <span className="font-bold">{request.completed_lane_count}/{request.lane_count}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        className="ml-4 flex items-center gap-1"
                      >
                        {expandedRequest === request.id ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View Items
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Expanded Items View */}
                    {expandedRequest === request.id && (
                      <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                        <PerItemApprovalPanel
                          approvalId={request.id}
                          onActionComplete={handleActionComplete}
                          activeFilter={activeFilter === 'pending' ? 'pending' : 'all' as any}
                          viewMode={viewMode}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-gray-200 bg-gray-50 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {getPersonalRequests().length > 0 ? (
              <>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getPersonalRequests().length)} of {getPersonalRequests().length} requests
              </>
            ) : (
              'No requests to display'
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </Button>
            <div className="px-3 py-1 bg-white border border-gray-300 rounded-lg">
              <span className="text-sm font-medium">
                Page {currentPage} of {getPersonalTotalPages()}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(getPersonalTotalPages(), prev + 1))}
              disabled={currentPage === getPersonalTotalPages()}
            >
              Next →
            </Button>
          </div>
        </CardFooter>
      </Card>
      )}

      {/* Branch Requests Table */}
      {viewMode === 'admin' && activeScopeTab === 'branch' && (
      <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-4xl font-bold flex items-center gap-3">
                <Badge className="bg-green-100 text-green-800 text-lg font-semibold px-4 py-2">Branch Requests</Badge>
                <span className="text-gray-600 text-2xl">({getBranchRequests().length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by as 'date' | 'requester');
                    setSortOrder(order as 'asc' | 'desc');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="requester-asc">Requester A-Z</option>
                  <option value="requester-desc">Requester Z-A</option>
                </select>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={() => {/* Already filtering in real-time */}}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {getBranchRequests().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No branch requests'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getBranchPaginated().map((request) => (
                  <Card key={request.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {(request.approval as any)?.request_number || request.request_id}
                            </h3>
                            <Badge className="text-xs">
                              {request.request_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(request.request_status)}`}
                            >
                              {getStatusLabel(request.request_status)}
                            </Badge>
                            {request.lane_count > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getLaneBadgeClass(request.lane_parent_status)}`}
                                title={request.lane_tooltip}
                              >
                                Lanes {request.completed_lane_count}/{request.lane_count}
                              </Badge>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <div>Submitted by: <span className="font-medium text-gray-900">{request.submitted_by_name}</span></div>
                            <div>
                              Submitted: {new Date(request.submitted_date).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            <div>{renderTransferBadge(request)}</div>
                            {request.current_approver_name && (
                              <div>Current Approver: <span className="font-medium text-gray-900">{request.current_approver_name}</span></div>
                            )}
                          </div>

                          <div className="flex gap-4 text-xs text-gray-500 mt-3">
                            <div>Total: <span className="font-bold text-gray-900">{request.total_items}</span></div>
                            {request.approved_items > 0 && <div>✓ <span className="font-bold text-green-600">{request.approved_items}</span></div>}
                            {request.rejected_items > 0 && <div>✗ <span className="font-bold text-red-600">{request.rejected_items}</span></div>}
                            {request.returned_items > 0 && <div>↩ <span className="font-bold text-orange-600">{request.returned_items}</span></div>}
                            {request.pending_items > 0 && <div>⏳ <span className="font-bold">{request.pending_items}</span></div>}
                            {request.lane_count > 0 && <div>Lanes <span className="font-bold text-sky-700">{request.completed_lane_count}/{request.lane_count}</span></div>}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                          className="ml-4 flex items-center gap-1"
                        >
                          {expandedRequest === request.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View Items
                            </>
                          )}
                        </Button>
                      </div>

                      {expandedRequest === request.id && (
                        <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                          <PerItemApprovalPanel
                            approvalId={request.id}
                            onActionComplete={handleActionComplete}
                            activeFilter={activeFilter === 'pending' ? 'pending' : 'all' as any}
                            viewMode={viewMode}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-gray-200 bg-gray-50 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {getBranchRequests().length > 0 ? (
                <>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getBranchRequests().length)} of {getBranchRequests().length} requests
                </>
              ) : (
                'No requests to display'
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>← Previous</Button>
              <div className="px-3 py-1 bg-white border border-gray-300 rounded-lg">
                <span className="text-sm font-medium">Page {currentPage} of {getBranchTotalPages()}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(getBranchTotalPages(), prev + 1))} disabled={currentPage === getBranchTotalPages()}>Next →</Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Wing Requests Table */}
      {(viewMode !== 'admin' ? shouldShowScope('wing') : activeScopeTab === 'wing') && (
      <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-4xl font-bold flex items-center gap-3">
                <Badge className="bg-purple-100 text-purple-800 text-lg font-semibold px-4 py-2">Wing Requests</Badge>
                <span className="text-gray-600 text-2xl">({getWingRequests().length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by as 'date' | 'requester');
                    setSortOrder(order as 'asc' | 'desc');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="requester-asc">Requester A-Z</option>
                  <option value="requester-desc">Requester Z-A</option>
                </select>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={() => {/* Already filtering in real-time */}}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {getWingRequests().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No wing requests'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getWingPaginated().map((request) => (
                  <Card key={request.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {(request.approval as any)?.request_number || request.request_id}
                            </h3>
                            <Badge className="text-xs">
                              {request.request_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(request.request_status)}`}
                            >
                              {getStatusLabel(request.request_status)}
                            </Badge>
                            {request.lane_count > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getLaneBadgeClass(request.lane_parent_status)}`}
                                title={request.lane_tooltip}
                              >
                                Lanes {request.completed_lane_count}/{request.lane_count}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <div>Submitted by: <span className="font-medium text-gray-900">{request.submitted_by_name}</span></div>
                            <div>
                              Submitted: {(() => {
                                const date = new Date(request.submitted_date);
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
                            <div>{renderTransferBadge(request)}</div>
                            {request.current_approver_name && (
                              <div>Current Approver: <span className="font-medium text-gray-900">{request.current_approver_name}</span></div>
                            )}
                          </div>

                          {/* Summary Stats */}
                          <div className="flex gap-4 text-xs text-gray-500 mt-3">
                            <div>Total: <span className="font-bold text-gray-900">{request.total_items}</span></div>
                            {request.approved_items > 0 && (
                              <div>✓ <span className="font-bold text-green-600">{request.approved_items}</span></div>
                            )}
                            {request.rejected_items > 0 && (
                              <div>✗ <span className="font-bold text-red-600">{request.rejected_items}</span></div>
                            )}
                            {request.returned_items > 0 && (
                              <div>↩ <span className="font-bold text-orange-600">{request.returned_items}</span></div>
                            )}
                            {request.pending_items > 0 && (
                              <div>⏳ <span className="font-bold">{request.pending_items}</span></div>
                            )}
                            {request.lane_count > 0 && (
                              <div>Lanes <span className="font-bold text-sky-700">{request.completed_lane_count}/{request.lane_count}</span></div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                          className="ml-4 flex items-center gap-1"
                        >
                          {expandedRequest === request.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View Items
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Expanded Items View */}
                      {expandedRequest === request.id && (
                        <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                          <PerItemApprovalPanel
                            approvalId={request.id}
                            onActionComplete={handleActionComplete}
                            activeFilter={activeFilter === 'pending' ? 'pending' : 'all' as any}
                            viewMode={viewMode}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-gray-200 bg-gray-50 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {getWingRequests().length > 0 ? (
                <>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getWingRequests().length)} of {getWingRequests().length} requests
                </>
              ) : (
                'No requests to display'
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </Button>
              <div className="px-3 py-1 bg-white border border-gray-300 rounded-lg">
                <span className="text-sm font-medium">
                  Page {currentPage} of {getWingTotalPages()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(getWingTotalPages(), prev + 1))}
                disabled={currentPage === getWingTotalPages()}
              >
                Next →
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

    </div>
  );
};

export default ApprovalDashboardRequestBased;
