import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw, User, Calendar, Package, FileText, Forward, Truck, PackageCheck, Pencil } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { sessionService } from '@/services/sessionService';
import { getApiBaseUrl } from '@/services/invmisApi';

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined, formatStr = 'MMM dd, yyyy', defaultText = 'N/A'): string => {
  if (!dateString) return defaultText;
  const date = new Date(dateString);
  if (!isValid(date) || date.getFullYear() < 2000) return defaultText;
  return format(date, formatStr);
};

interface RequestItem {
  id: string;
  item_master_id?: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  last_issued_quantity?: number;
  last_issue_date?: string | null;
  unit: string;
  specifications?: string;
  group_number?: number | null;
  category_name?: string;
}

interface RequestLane {
  request_id: string;
  group_number: number;
  current_step_order: number;
  total_steps: number;
  status: string;
  current_approver_id?: string | null;
  lane_approver_name?: string | null;
  lane_role_label?: string | null;
  lane_item_count?: number;
}

interface RequestLaneSummary {
  request_id: string;
  parent_status: string;
  lane_count: number;
  lanes: RequestLane[];
}

interface ApprovalHistoryItem {
  id: string;
  action: string;
  action_date: string;
  approver_name: string;
  comments: string;
  level: number;
  forwarded_to_name?: string | null;
  forwarded_from_name?: string | null;
  is_current_step?: boolean;
  submitted_to?: string | null;
  submitted_to_role?: string | null;
  approver_role?: string | null;
}

interface ItemTracking {
  id: string;
  nomenclature: string;
  decision_type?: string;
  history: {
    action: string;
    timestamp: string;
    actor_name?: string;
    comments?: string;
  }[];
}

interface ApprovalItem {
  id: string;
  nomenclature: string;
  decision_type?: string;
  requested_quantity?: number;
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
  approval_items: ApprovalItem[];
  approval_history: ApprovalHistoryItem[];
}

const RequestDetailsPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemTracking, setSelectedItemTracking] = useState<ItemTracking | null>(null);
  const [itemTrackingLoading, setItemTrackingLoading] = useState(false);
  const [laneSummary, setLaneSummary] = useState<RequestLaneSummary | null>(null);

  useEffect(() => {
    if (requestId) {
      loadRequestDetails(requestId);
    }
  }, [requestId]);

  const getLastIssuedMap = async (filters: { user_id?: string; wing_id?: string | number }) => {
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.wing_id !== undefined && filters.wing_id !== null && String(filters.wing_id) !== '') {
      params.append('wing_id', String(filters.wing_id));
    }

    const response = await fetch(
      `${getApiBaseUrl()}/stock-issuance/last-issued-summary${params.toString() ? `?${params.toString()}` : ''}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch last issued summary: ${response.status}`);
    }

    const data = await response.json();
    const map: Record<string, { qty: number; date: string | null }> = {};
    (data?.data || []).forEach((row: any) => {
      const key = String(row.item_master_id || '');
      if (!key) return;
      map[key] = {
        qty: Number(row.last_issued_quantity || 0),
        date: row.last_issue_date || null
      };
    });

    return map;
  };

  const loadRequestDetails = async (id: string) => {
    try {
      setLoading(true);
      setLaneSummary(null);
      let foundRequest: any = null;
      let directDetails: any = null;

      // First, try direct request lookup by ID (most reliable and not dependent on list filtering).
      const directResponse = await fetch(`${getApiBaseUrl()}/stock-issuance/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (directResponse.ok) {
        directDetails = await directResponse.json();
        if (directDetails?.request) {
          foundRequest = {
            ...directDetails.request,
            items: Array.isArray(directDetails.items) ? directDetails.items : []
          };
        }
      }

      // Fallback for compatibility: fetch request list and find by ID (case-insensitive).
      if (!foundRequest) {
        const response = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const requests = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.requests)
              ? data.requests
              : [];

          const normalizedId = String(id || '').toLowerCase();
          foundRequest = requests.find((req: any) => String(req.id || '').toLowerCase() === normalizedId) || null;
        }
      }

      if (foundRequest) {
            const normalizedRequestType = String(foundRequest.request_type || '').trim().toLowerCase();
            const isIndividualRequest = normalizedRequestType === 'individual' || normalizedRequestType === 'personal';
            const submitterName = foundRequest.requester?.full_name || foundRequest.requester_name || 'Unknown Requester';
            const wingDisplayName = foundRequest.wing?.name || foundRequest.wing_name || foundRequest.office?.name || foundRequest.office_name || 'Unknown Wing';
            const requesterDisplayName = isIndividualRequest
              ? submitterName
              : `${wingDisplayName} (${submitterName})`;

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
              requester_name: requesterDisplayName,
              items: foundRequest.items?.map((item: any) => ({
                id: item.id,
                item_master_id: item.item_master_id,
                item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
                requested_quantity: item.requested_quantity || 1,
                approved_quantity: item.approved_quantity,
                unit: item.unit || 'units',
                specifications: '',
                group_number: null,
                category_name: ''
              })) || [],
              approval_items: [],
              approval_history: Array.isArray(directDetails?.approval_history)
                ? directDetails.approval_history.map((h: any, i: number) => ({
                    id: (h.id || i + 1).toString(),
                    action: (h.action || '').toLowerCase() || 'submitted',
                    action_date: h.timestamp || h.action_date || null,
                    approver_name: h.actor_name || h.approver_name || 'Unknown',
                    comments: h.comments || 'No comments',
                    level: h.level || i,
                    submitted_to: h.submitted_to || null,
                    submitted_to_role: h.submitted_to_role || null,
                    is_current_step: h.is_current_step || false,
                    approver_role: h.approver_role || h.submitted_to_role || null,
                    forwarded_to_name: h.forwarded_to_name || null
                  }))
                : [] // Will be populated from API
            };
            
            try {
              const requestDetailsResp = await fetch(`${getApiBaseUrl()}/approvals/request/${foundRequest.id}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });

              if (requestDetailsResp.ok) {
                const requestDetailsData = await requestDetailsResp.json();
                if (Array.isArray(requestDetailsData?.items) && requestDetailsData.items.length > 0) {
                  mappedRequest.items = requestDetailsData.items.map((item: any) => ({
                    id: item.id,
                    item_master_id: item.item_master_id,
                    item_name: item.nomenclature || item.custom_item_name || item.item_name || 'Unknown Item',
                    requested_quantity: item.requested_quantity || 1,
                    approved_quantity: item.approved_quantity,
                    unit: item.unit || 'units',
                    specifications: '',
                    group_number: typeof item.group_number === 'number' ? item.group_number : null,
                    category_name: item.category_name || ''
                  }));
                }
              }
            } catch (err) {
              console.warn('Failed to fetch request group details:', err);
            }

            try {
              const filters: { user_id?: string; wing_id?: string | number } = {};
              if (foundRequest.request_type === 'Individual' && foundRequest.requester_user_id) {
                filters.user_id = String(foundRequest.requester_user_id);
              } else if (foundRequest.requester_wing_id) {
                filters.wing_id = foundRequest.requester_wing_id;
              }

              if (filters.user_id || filters.wing_id) {
                const lastIssuedMap = await getLastIssuedMap(filters);
                mappedRequest.items = mappedRequest.items.map((item) => {
                  const key = String(item.item_master_id || '');
                  const history = lastIssuedMap[key];
                  return {
                    ...item,
                    last_issued_quantity: history?.qty,
                    last_issue_date: history?.date || null
                  };
                });
              }
            } catch (err) {
              console.warn('Failed to fetch last issued summary for request details:', err);
            }

            // Try to load detailed request info (including approval history and supervisor) from stock-issuance/:id
            try {
              const stockIssuanceResp = await fetch(`${getApiBaseUrl()}/stock-issuance/${foundRequest.id}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });

              if (stockIssuanceResp.ok) {
                const stockIssuanceData = await stockIssuanceResp.json();
                // Use approval_history from stock-issuance endpoint if available
                if (Array.isArray(stockIssuanceData.approval_history)) {
                  mappedRequest.approval_history = stockIssuanceData.approval_history.map((h: any, i: number) => ({
                    id: (h.id || i + 1).toString(),
                    action: (h.action || '').toLowerCase() || 'submitted',
                    action_date: h.timestamp || h.action_date || null,
                    approver_name: h.actor_name || h.approver_name || 'Unknown',
                    comments: h.comments || 'No comments',
                    level: h.level || i,
                    submitted_to: h.submitted_to || null,
                    submitted_to_role: h.submitted_to_role || null,
                    is_current_step: h.is_current_step || false,
                    approver_role: h.approver_role || h.submitted_to_role || null,
                    forwarded_to_name: h.forwarded_to_name || null
                  }));
                }
              }
            } catch (err) {
              console.warn('Failed to fetch /api/stock-issuance/:id:', err);
            }
            
            // If no approval history yet, try the request-details endpoint
            if (!mappedRequest.approval_history || mappedRequest.approval_history.length === 0) {
              try {
                const detailsResp = await fetch(`${getApiBaseUrl()}/request-details/${foundRequest.id}`, {
                  method: 'GET',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' }
                });

                if (detailsResp.ok) {
                  const detailsData = await detailsResp.json();
                  if (detailsData?.success && detailsData.request) {
                    // Map approval history if present
                    if (Array.isArray(detailsData.request.approval_history)) {
                      mappedRequest.approval_history = detailsData.request.approval_history.map((h: any, i: number) => ({
                        id: (h.id || i + 1).toString(),
                        action: (h.action || h.action_type || h.ActionType || '').toLowerCase() || 'submitted',
                        action_date: h.action_date || h.ActionDate || h.ActionDateTime || new Date().toISOString(),
                        // Prefer the explicit action-by name, then fallback to common fields
                        approver_name: h.ActionByName || h.approver_name || h.UserName || h.FullName || h.ForwardedFromName || 'Unknown',
                        comments: h.comments || h.Comments || h.ForwardReason || 'No comments',
                        level: h.level || h.Level || h.StepNumber || i,
                        forwarded_to_name: h.ForwardedToName || h.forwarded_to_name || h.ForwardedToUserId || null,
                        forwarded_from_name: h.ForwardedFromName || h.forwarded_from_name || h.ForwardedFromUserId || null,
                        is_current_step: h.is_current_step || h.IsCurrentStep || false
                      }));
                    }
                  } else {
                    // Fall back to the older history endpoint if details endpoint doesn't return history
                    await loadApprovalHistory(foundRequest.id, mappedRequest);
                  }
                } else {
                  // Fall back on error
                  await loadApprovalHistory(foundRequest.id, mappedRequest);
                }
              } catch (err) {
                console.warn('Failed to fetch /api/request-details, falling back to approvals history', err);
                await loadApprovalHistory(foundRequest.id, mappedRequest);
              }
            }

            // Fetch approval items for item-level status tracking
            try {
              const approvalItemsResp = await fetch(
                `${getApiBaseUrl()}/approvals/request/${foundRequest.id}/items`,
                { credentials: 'include' }
              );
              if (approvalItemsResp.ok) {
                const approvalItemsData = await approvalItemsResp.json();
                if (approvalItemsData.success && approvalItemsData.data) {
                  mappedRequest.approval_items = approvalItemsData.data;
                }
              }
            } catch (err) {
              console.log('Could not fetch approval items for request:', foundRequest.id);
            }

            try {
              const lanesResp = await fetch(`${getApiBaseUrl()}/approvals/request/${foundRequest.id}/lanes`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });
              if (lanesResp.ok) {
                const lanesData = await lanesResp.json();
                if (lanesData?.success) {
                  setLaneSummary(lanesData);
                }
              }
            } catch (err) {
              console.warn('Could not fetch lane summary for request:', foundRequest.id, err);
            }
            
            // Normalize approval history entries - preserve all fields
            mappedRequest.approval_history = (mappedRequest.approval_history || []).map((ah: any) => {
              const action = (ah.action || ah.action_type || ah.ActionType || '')?.toString().trim().toLowerCase();
              const approver = (ah.approver_name || ah.ActionByName || ah.UserName || ah.FullName || ah.ForwardedFromName || '')?.toString().trim();
              const forwardedName = (ah.forwarded_to_name || ah.ForwardedToName || ah.ForwardedToUserId || ah.forwarded_to || '')?.toString().trim();
              return {
                ...ah,
                action: action || 'submitted',
                approver_name: action === 'submitted' ? mappedRequest.requester_name : (approver || 'Unknown'),
                forwarded_to_name: forwardedName || null,
                // Keep null for pending steps that have no action date yet
                action_date: ah.action_date || ah.ActionDate || ah.ActionDateTime || null
              } as ApprovalHistoryItem;
            });

            // Only add fallback if we have NO approval history at all
            if (!mappedRequest.approval_history || mappedRequest.approval_history.length === 0) {
              mappedRequest.approval_history = [{
                id: '1',
                action: 'submitted',
                action_date: mappedRequest.submitted_date || mappedRequest.requested_date || new Date().toISOString(),
                approver_name: mappedRequest.requester_name || 'Unknown',
                comments: `Request submitted by ${mappedRequest.requester_name || 'user'}`,
                level: 0
              }];
            }

            setRequest(mappedRequest);
      } else {
        console.error('Request not found with ID:', id);
        setRequest(null);
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
      // If the requestId looks like a GUID (used by stock_issuance_requests), use the request-details endpoint
      const looksLikeGuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/.test(requestId);

      if (looksLikeGuid) {
        try {
          const resp = await fetch(`${getApiBaseUrl()}/request-details/${requestId}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (resp.ok) {
            const d = await resp.json();
            if (d?.success && d.request && Array.isArray(d.request.approval_history)) {
              request.approval_history = d.request.approval_history.map((item: any, i: number) => ({
                id: (item.id || i + 1).toString(),
                action: (item.action || item.ActionType || item.action_type || '').toLowerCase() || 'submitted',
                action_date: item.action_date || item.ActionDate || new Date().toISOString(),
                approver_name: item.approver_name || item.UserName || item.FullName || 'Unknown',
                comments: item.comments || item.Comments || 'No comments',
                level: item.level || item.Level || i
              }));
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to fetch approval history via /api/request-details:', err);
          // fallthrough to try legacy endpoint as a last resort
        }
      }

      // Try to load real approval history from legacy database endpoint (expects numeric issuance id)
      try {
        const response = await fetch(`${getApiBaseUrl()}/approvals/history/${requestId}`, {
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
              action: (item.ActionType || item.action_type || item.action || '').toLowerCase() || 'submitted',
              action_date: item.ActionDate || item.action_date,
              approver_name: item.UserName || item.FullName || (item.ForwardedFromName || item.ForwardedToName) || 'Unknown',
              comments: item.Comments || item.comments || 'No comments',
              level: item.Level || item.level || index,
              forwarded_to_name: item.ForwardedToName || item.forwarded_to || null
            }));
            
            request.approval_history = approvalHistory;
            return;
          }
        }
      } catch (error) {
        console.log('Could not load approval history from legacy API, using minimal data', error);
      }

      // If no real data available, just show the basic submission info
      const approvalHistory: ApprovalHistoryItem[] = [];
      
      // Only add the actual submission
      approvalHistory.push({
        id: '1',
        action: 'submitted',
        action_date: request.submitted_date,
        approver_name: request.requester_name,
        comments: `Request submitted on ${formatDate(request.submitted_date)}`,
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

  const getItemStatusBadge = (decisionType: string | null | undefined) => {
    const itemStatusColors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVE_FROM_STOCK': 'bg-green-100 text-green-800',
      'APPROVE_FOR_PROCUREMENT': 'bg-green-100 text-green-800',
      'REJECT': 'bg-red-100 text-red-800',
      'RETURN': 'bg-orange-100 text-orange-800',
      'FORWARD_TO_SUPERVISOR': 'bg-blue-100 text-blue-800',
      'FORWARD_TO_ADMIN': 'bg-blue-100 text-blue-800',
      'null': 'bg-yellow-100 text-yellow-800',
      '': 'bg-yellow-100 text-yellow-800'
    };

    const key = decisionType || 'null';
    const color = itemStatusColors[key] || 'bg-gray-100 text-gray-800';
    
    const displayText = !decisionType ? 'Pending' : 
      decisionType === 'PENDING' ? 'Pending' :
      decisionType.includes('APPROVE') ? 'Approved' :
      decisionType === 'REJECT' ? 'Rejected' :
      decisionType === 'RETURN' ? 'Returned' :
      decisionType.includes('FORWARD') ? 'Forwarded' :
      decisionType;

    return <Badge className={`${color} cursor-pointer hover:opacity-80 transition-opacity`}>{displayText}</Badge>;
  };

  const getLaneStatusBadge = (status: string) => {
    const normalized = String(status || 'pending').toLowerCase();
    const color = normalized === 'completed'
      ? 'bg-green-100 text-green-800'
      : normalized === 'rejected'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800';

    return <Badge className={color}>{normalized.toUpperCase()}</Badge>;
  };

  const getItemsForLane = (groupNumber: number) => {
    return request.items.filter((item) => item.group_number === groupNumber);
  };

  const handleItemStatusClick = async (item: ApprovalItem) => {
    setItemTrackingLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/approvals/item/${item.id}/tracking`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedItemTracking(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching item tracking:', error);
    } finally {
      setItemTrackingLoading(false);
    }
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
          <Button onClick={() => navigate('/dashboard/my-requests')} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Back to My Requests
          </Button>
        </div>
      </div>
    );
  }

  const normalizedRequestType = String(request.request_type || '').trim().toLowerCase();
  const isWingOrOrganizationalRequest =
    normalizedRequestType === 'wing' ||
    normalizedRequestType === 'organizational';
  const backPath = isWingOrOrganizationalRequest
    ? '/dashboard/wing-request-history'
    : '/dashboard/my-requests';
  const backLabel = isWingOrOrganizationalRequest
    ? 'Back to Wing Requests'
    : 'Back to My Requests';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate(backPath)} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            {backLabel}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-gray-600 mt-1">Request ID: {request.id.slice(0, 12)}...</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/dashboard/requisition-report/${request.id}`)}
        >
          <FileText size={16} className="mr-2" />
          Requisition Report
        </Button>
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
                    {formatDate(request.submitted_date, 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Required Date</label>
                  <p className="text-gray-900 mt-1">
                    {formatDate(request.requested_date)}
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
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-left px-3 py-2 w-40">Last Issued Qty</th>
                      <th className="text-left px-3 py-2 w-36">Last Issue Date</th>
                      <th className="text-left px-3 py-2 w-40">Fresh Requirement</th>
                      <th className="text-left px-3 py-2 w-40">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map((item, index) => {
                      const approvalItem = request.approval_items.find(ai => ai.nomenclature === item.item_name);
                      return (
                        <tr key={index} className="border-t align-middle">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{item.item_name}</div>
                            {item.specifications && (
                              <div className="text-xs text-gray-500 mt-1">{item.specifications}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">{item.last_issued_quantity ?? 0}</td>
                          <td className="px-3 py-2">{formatDate(item.last_issue_date, 'MMM dd, yyyy', '-')}</td>
                          <td className="px-3 py-2">{item.requested_quantity} {item.unit}</td>
                          <td className="px-3 py-2">
                            {approvalItem ? (
                              <div onClick={() => handleItemStatusClick(approvalItem)} className="cursor-pointer inline-block">
                                {getItemStatusBadge(approvalItem.decision_type)}
                              </div>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                            history.action === 'approved' || history.action === 'Approved'
                              ? 'bg-green-100' 
                              : history.action === 'rejected' || history.action === 'Rejected'
                                ? 'bg-red-100' 
                                : history.action === 'submitted' || history.action === 'Submitted'
                                  ? 'bg-blue-100'
                                  : history.action === 'pending' || history.action === 'Pending'
                                    ? 'bg-yellow-100'
                                    : history.action === 'forwarded' || history.action === 'Forwarded'
                                      ? 'bg-purple-100'
                                      : history.action === 'Sent to Wing Store'
                                        ? 'bg-orange-100'
                                        : history.action === 'Issued'
                                          ? 'bg-teal-100'
                                          : 'bg-gray-100'
                          }`}>
                            {history.action === 'approved' || history.action === 'Approved' ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : history.action === 'rejected' || history.action === 'Rejected' ? (
                              <XCircle size={16} className="text-red-600" />
                            ) : history.action === 'submitted' || history.action === 'Submitted' ? (
                              <FileText size={16} className="text-blue-600" />
                            ) : history.action === 'pending' || history.action === 'Pending' ? (
                              <Clock size={16} className="text-yellow-600" />
                            ) : history.action === 'forwarded' || history.action === 'Forwarded' ? (
                              <Forward size={16} className="text-purple-600" />
                            ) : history.action === 'Sent to Wing Store' ? (
                              <Truck size={16} className="text-orange-600" />
                            ) : history.action === 'Issued' ? (
                              <PackageCheck size={16} className="text-teal-600" />
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
                              history.action === 'pending' || history.action === 'Pending' ? 'text-yellow-600' 
                              : history.action === 'Sent to Wing Store' ? 'text-orange-600'
                              : history.action === 'Issued' ? 'text-teal-600'
                              : 'text-gray-600'
                            }`}>
                              {(() => {
                                const act = history.action;
                                if (act === 'submitted' || act === 'Submitted') {
                                  if (history.submitted_to) {
                                    return `Submitted Request → to ${history.submitted_to}`;
                                  }
                                  return 'Submitted Request';
                                }
                                if (act === 'pending' || act === 'Pending') {
                                  return history.is_current_step ? '- Currently reviewing' : '- Pending';
                                }
                                if (act === 'approved' || act === 'Approved') return 'Approved';
                                if (act === 'rejected' || act === 'Rejected') return 'Rejected';
                                if (act === 'forwarded' || act === 'Forwarded') return history.forwarded_to_name ? `Forwarded → To ${history.forwarded_to_name}` : 'Forwarded to Admin';
                                if (act === 'Sent to Wing Store') return 'Sent to Wing Store Keeper';
                                if (act === 'Issued') return 'Issued to Requester';
                                // fallback: capitalize words
                                return act.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                              })()}
                            </span>
                            {history.is_current_step && (
                              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Current Step
                              </span>
                            )}
                          </div>
                          {/* Show approver role if available */}
                          {history.approver_role && (
                            <div className="text-xs text-gray-500">
                              Role: {history.approver_role}
                            </div>
                          )}
                          {history.action_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(history.action_date, 'MMM dd, yyyy HH:mm')}
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
                          {/* If submitted, show approver role */}
                          {history.submitted_to_role && (
                            <div className="text-xs text-gray-500 mt-1">
                              Approver Role: <span className="font-medium">{history.submitted_to_role}</span>
                            </div>
                          )}
                          {/* If forwarded, show target */}
                          {history.forwarded_to_name && (
                            <div className="text-sm text-gray-600 mt-1">
                              Forwarded to: <span className="font-medium">{history.forwarded_to_name}</span>
                            </div>
                          )}                        </div>
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

      {laneSummary && laneSummary.lanes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Approval Workflow by Group
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/dashboard/workflow-admin')}
            >
              <Pencil size={14} className="mr-2" />
              Edit Workflow
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Group</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Items</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Current Role</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Current Holder</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Step</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                    <th className="border-b px-3 py-2 text-left font-semibold text-gray-700">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {laneSummary.lanes.map((lane) => {
                    const laneItems = getItemsForLane(lane.group_number);
                    return (
                      <tr key={`lane-row-${lane.group_number}`}>
                        <td className="border-b px-3 py-3 align-top font-medium text-gray-900">Group {lane.group_number}</td>
                        <td className="border-b px-3 py-3 align-top text-gray-700">
                          {laneItems.length > 0 ? (
                            <div className="space-y-1">
                              {laneItems.map((item) => (
                                <div key={`lane-item-${lane.group_number}-${item.id}`}>{item.item_name}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">No grouped items found</span>
                          )}
                        </td>
                        <td className="border-b px-3 py-3 align-top text-gray-700">{lane.lane_role_label || 'Unassigned'}</td>
                        <td className="border-b px-3 py-3 align-top text-gray-700">{lane.lane_approver_name || 'Unassigned'}</td>
                        <td className="border-b px-3 py-3 align-top text-gray-700">{lane.current_step_order || 0} / {lane.total_steps || 0}</td>
                        <td className="border-b px-3 py-3 align-top">{getLaneStatusBadge(lane.status)}</td>
                        <td className="border-b px-3 py-3 align-top">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/dashboard/workflow-admin?group=${lane.group_number}`)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Tracking Modal */}
      {selectedItemTracking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedItemTracking.nomenclature}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Status Tracking History</p>
              </div>
              <button
                onClick={() => setSelectedItemTracking(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itemTrackingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600">Current Status:</p>
                    <div className="mt-2">
                      {getItemStatusBadge(selectedItemTracking.decision_type)}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">History:</p>
                    <div className="space-y-3">
                      {selectedItemTracking.history && selectedItemTracking.history.length > 0 ? (
                        selectedItemTracking.history.map((entry, idx) => (
                          <div key={idx} className="border-l-2 border-blue-300 pl-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm capitalize">
                                {entry.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.actor_name && (
                              <p className="text-xs text-gray-600">By: {entry.actor_name}</p>
                            )}
                            {entry.comments && (
                              <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                                {entry.comments}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No history available</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RequestDetailsPage;