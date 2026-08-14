import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approvalForwardingService,
  RequestApproval,
  RequestLaneSummary
} from '../services/approvalForwardingService';
import { CheckCircle, Clock, RefreshCw, Settings, Users, Building2 } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export const WingApprovalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [pendingApprovals, setPendingApprovals] = useState<RequestApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    forwarded_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'forwarded'>('pending');
  const [wingName, setWingName] = useState<string>('');
  const [requestLanes, setRequestLanes] = useState<Record<string, RequestLaneSummary>>({});

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, user, activeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const loadAssignedApprovalsFallback = async () => {
        const userId = (user as any)?.user_id || (user as any)?.Id;
        const statuses = ['pending', 'approved', 'rejected', 'forwarded'] as const;

        const results = await Promise.all(
          statuses.map(async (status) => {
            try {
              const data = await approvalForwardingService.getMyApprovalsByStatus(userId, status);
              return { status, data: Array.isArray(data) ? data : [] };
            } catch (error) {
              return { status, data: [] as RequestApproval[] };
            }
          })
        );

        const bucket = {
          pending: [] as RequestApproval[],
          approved: [] as RequestApproval[],
          rejected: [] as RequestApproval[],
          forwarded: [] as RequestApproval[]
        };

        results.forEach((entry) => {
          bucket[entry.status] = entry.data;
        });

        const fallbackRows = bucket[activeFilter] || [];
        setPendingApprovals(fallbackRows);
        setDashboardStats({
          pending_count: bucket.pending.length,
          approved_count: bucket.approved.length,
          rejected_count: bucket.rejected.length,
          forwarded_count: bucket.forwarded.length
        });

        const uniqueRequestIds = Array.from(new Set(fallbackRows.map((a) => String(a.request_id)).filter(Boolean)));
        const laneSummaries = await Promise.all(
          uniqueRequestIds.map(async (requestId) => {
            const summary = await approvalForwardingService.getRequestLanes(requestId).catch(() => null);
            return [requestId, summary] as const;
          })
        );
        const lanesMap: Record<string, RequestLaneSummary> = {};
        for (const [requestId, summary] of laneSummaries) {
          if (summary) {
            lanesMap[requestId] = summary;
          }
        }
        setRequestLanes(lanesMap);
      };

      // Get wing information
      if (user?.wing_id) {
        try {
          const wingsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/wings`, { credentials: 'include' });
          if (wingsRes.ok) {
            const wingsData = await wingsRes.json();
            const wingsList = Array.isArray(wingsData) ? wingsData : (wingsData?.data || []);
            const currentWing = wingsList.find((w: any) => w.Id === user.wing_id || w.id === user.wing_id);
            setWingName(currentWing?.Name || currentWing?.name || 'Your Wing');
          }
        } catch (error) {
          console.error('Error fetching wing information:', error);
        }
      }

      // For wing dashboard, we need to get approvals for all users in the wing
      const wingId = user?.wing_id;
      if (!wingId) {
        await loadAssignedApprovalsFallback();
        return;
      }

      // Use the new wing-specific endpoint
      const [approvalsData, dashboardData] = await Promise.all([
        approvalForwardingService.getWingApprovalsByStatus(wingId, activeFilter),
        approvalForwardingService.getWingApprovalDashboard(wingId)
      ]);

      const uniqueRequestIds = Array.from(new Set(approvalsData.map((a) => String(a.request_id))));
      const laneSummaries = await Promise.all(
        uniqueRequestIds.map(async (requestId) => {
          const summary = await approvalForwardingService.getRequestLanes(requestId).catch(() => null);
          return [requestId, summary] as const;
        })
      );
      const lanesMap: Record<string, RequestLaneSummary> = {};
      for (const [requestId, summary] of laneSummaries) {
        if (summary) {
          lanesMap[requestId] = summary;
        }
      }

      const hasWingData =
        approvalsData.length > 0 ||
        Number(dashboardData?.pending_count || 0) > 0 ||
        Number(dashboardData?.approved_count || 0) > 0 ||
        Number(dashboardData?.rejected_count || 0) > 0 ||
        Number(dashboardData?.forwarded_count || 0) > 0;

      if (!hasWingData) {
        await loadAssignedApprovalsFallback();
      } else {
        setPendingApprovals(approvalsData);
        setDashboardStats(dashboardData);
        setRequestLanes(lanesMap);
      }

    } catch (error) {
      console.error('❌ Error loading wing approval dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = String(status || 'pending').toLowerCase();
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: RefreshCw },
      'forwarded': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Users }
    };

    const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
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

  const getLaneBadgeClass = (parentStatus?: string) => {
    if (parentStatus === 'approved') return 'bg-green-100 text-green-800 border-green-300';
    if (parentStatus === 'partially_approved') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (parentStatus === 'rejected') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const renderLaneBadge = (requestId: string) => {
    const laneSummary = requestLanes[String(requestId)];
    if (!laneSummary || !laneSummary.lane_count) {
      return null;
    }

    const completedCount = laneSummary.lanes.filter((lane) => lane.status === 'completed').length;
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
    const laneTooltip = [
      `Parent: ${String(laneSummary.parent_status || 'pending').toUpperCase()}`,
      `Completed: ${completedGroups || '-'}`,
      `Pending: ${pendingGroups || '-'}`,
      `Rejected: ${rejectedGroups || '-'}`
    ].join(' | ');

    return (
      <Badge className={`${getLaneBadgeClass(laneSummary.parent_status)} flex items-center gap-1`} title={laneTooltip}>
        Lanes {completedCount}/{laneSummary.lane_count}
      </Badge>
    );
  };

  const getDisplayRequestType = (approval: RequestApproval) => {
    const raw = String((approval as any).scope_type || approval.request_type || '').toLowerCase();
    if (!raw || raw.includes('individual') || raw.includes('organizational') || raw.includes('wing')) {
      return 'wing';
    }
    return String(approval.request_type || 'wing').toLowerCase();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const totalRequests =
    Number(dashboardStats.pending_count || 0) +
    Number(dashboardStats.approved_count || 0) +
    Number(dashboardStats.rejected_count || 0) +
    Number(dashboardStats.forwarded_count || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Requests Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Requests received from your subordinate side in {wingName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/personal-dashboard')}
              variant="outline"
            >
              Go to Personal Dashboard
            </Button>
            <Button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Users className="h-5 w-5" />
                Total Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalRequests}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardStats.approved_count}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <RefreshCw className="h-5 w-5" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats.rejected_count}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <Clock className="h-5 w-5" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardStats.pending_count}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'pending', label: 'Pending', count: dashboardStats.pending_count },
            { key: 'approved', label: 'Approved', count: dashboardStats.approved_count },
            { key: 'rejected', label: 'Rejected', count: dashboardStats.rejected_count },
            { key: 'forwarded', label: 'Forwarded', count: dashboardStats.forwarded_count }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeFilter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Approvals List */}
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No {activeFilter} approvals found</p>
                <p className="text-sm">Approvals for your wing will appear here</p>
              </div>
            </Card>
          ) : (
            pendingApprovals.map((approval) => (
              <Card key={approval.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {(approval as any).title || (approval as any).request_title || 'Approval Request'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested by: {(approval as any).requester_name || 'Unknown'} • Wing: {wingName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge((approval as any).status || approval.current_status)}
                      {renderLaneBadge(approval.request_id)}
                      {getPriorityBadge((approval as any).priority || 'Medium')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {getDisplayRequestType(approval)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Submitted:</strong> {new Date(approval.submitted_date).toLocaleDateString()}
                      </p>
                      {(approval as any).description && (
                        <p className="text-sm text-gray-600">
                          <strong>Description:</strong> {(approval as any).description || (approval as any).title}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/dashboard/request-details/${approval.request_id}`)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default WingApprovalDashboard;