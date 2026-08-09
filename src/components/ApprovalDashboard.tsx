import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  approvalForwardingService, 
  RequestApproval,
  RequestLaneSummary
} from '../services/approvalForwardingService';
import ApprovalForwarding from './ApprovalForwarding';
import PerItemApprovalPanel from './PerItemApprovalPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CheckCircle, Clock, RefreshCw, Search } from "lucide-react";

const ApprovalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<RequestApproval[]>([]);
  const [returnedApprovals, setReturnedApprovals] = useState<RequestApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    forwarded_count: 0,
    returned_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'forwarded' | 'returned'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<'date' | 'requester'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [requestLanes, setRequestLanes] = useState<Record<string, RequestLaneSummary>>({});

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, user, activeFilter]); // Reload when filter changes

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Pass the current user's ID to get their approvals
      // Prefer `user.user_id` (normalized session shape) but fall back to legacy `Id`
      const userId = (user as any)?.user_id || (user as any)?.Id;
      const [approvalsResult, dashboardResult] = await Promise.allSettled([
        approvalForwardingService.getMyApprovalsByStatus(userId, activeFilter),
        approvalForwardingService.getApprovalDashboard(userId)
      ]);

      const approvalsData = approvalsResult.status === 'fulfilled' ? approvalsResult.value : [];
      const dashboardData = dashboardResult.status === 'fulfilled'
        ? dashboardResult.value
        : {
            pending_count: 0,
            approved_count: 0,
            rejected_count: 0,
            finalized_count: 0,
            my_pending: [],
            recent_actions: []
          };

      if (approvalsResult.status === 'rejected') {
        console.error('Error fetching approvals list:', approvalsResult.reason);
      }
      if (dashboardResult.status === 'rejected') {
        console.error('Error fetching approval dashboard stats:', dashboardResult.reason);
      }

      let filteredApprovals = approvalsData;
      if (activeFilter === 'pending') {
        const lanePending = await approvalForwardingService.getMyLanePending().catch(() => null);
        if (lanePending && lanePending.length > 0) {
          const pendingRequestIds = new Set(
            lanePending.map((lane) => String(lane.request_id)).filter(Boolean)
          );
          filteredApprovals = approvalsData.filter((approval) =>
            pendingRequestIds.has(String(approval.request_id))
          );
        }
      }

      const uniqueRequestIds = Array.from(new Set(filteredApprovals.map((a) => String(a.request_id))));
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

      setPendingApprovals(filteredApprovals);
      setRequestLanes(lanesMap);

      // Set returned approvals from dashboard data
      setReturnedApprovals((dashboardData as any).my_returned || []);

      // Map the API response to match our state structure
      setDashboardStats({
        pending_count: dashboardData.pending_count || 0,
        approved_count: dashboardData.approved_count || 0,
        rejected_count: dashboardData.rejected_count || 0,
        forwarded_count: (dashboardData as any).forwarded_count || (dashboardData as any).finalized_count || 0,
        returned_count: (dashboardData as any).returned_count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (approvalId: string) => {
    setSelectedApproval(selectedApproval === approvalId ? null : approvalId);
  };

  const handleActionComplete = () => {
    // Refresh the dashboard when an action is completed
    setRefreshTrigger(prev => prev + 1);
    setSelectedApproval(null);
  };

  // Filter approvals based on search term
  const getFilteredApprovals = () => {
    if (!searchTerm.trim()) {
      return pendingApprovals;
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    return pendingApprovals.filter((approval) => 
      approval.request_id.toLowerCase().includes(lowerSearch) ||
      approval.submitted_by_name?.toLowerCase().includes(lowerSearch) ||
      approval.request_type.toLowerCase().includes(lowerSearch) ||
      approval.current_approver_name?.toLowerCase().includes(lowerSearch)
    );
  };

  // Sort and paginate approvals
  const getSortedAndPaginatedApprovals = () => {
    let filtered = getFilteredApprovals();
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.submitted_date).getTime() - new Date(b.submitted_date).getTime();
      } else if (sortBy === 'requester') {
        compareValue = (a.submitted_by_name || '').localeCompare(b.submitted_by_name || '');
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredApprovals().length / itemsPerPage);
  };

  // Group approvals by request scope (personal vs wing-wise)
  const getPersonalApprovals = () => {
    return getFilteredApprovals().filter(a => (a.scope_type || '').toLowerCase() === 'individual');
  };

  const getWingApprovals = () => {
    return getFilteredApprovals().filter(a => (a.scope_type || '').toLowerCase() === 'organizational');
  };

  // Get paginated results for personal requests
  const getPersonalPaginated = () => {
    const filtered = getPersonalApprovals();
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
    const filtered = getWingApprovals();
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
    return Math.ceil(getPersonalApprovals().length / itemsPerPage);
  };

  const getWingTotalPages = () => {
    return Math.ceil(getWingApprovals().length / itemsPerPage);
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
      <Badge
        variant="outline"
        className={`text-xs ${getLaneBadgeClass(laneSummary.parent_status)}`}
        title={laneTooltip}
      >
        Lanes {completedCount}/{laneSummary.lane_count}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your approval dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">My Approvals (Item wise)</h1>
        <p className="text-lg text-gray-600 mt-2">
          Manage requests awaiting your approval
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {dashboardStats.pending_count} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-4">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'pending' 
              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 shadow-lg' 
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-700 font-semibold">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{dashboardStats.pending_count}</div>
              <p className="text-xs text-gray-600 mt-2">Awaiting your action</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approved' 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 shadow-lg' 
              : 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboardStats.approved_count}</div>
              <p className="text-xs text-gray-600 mt-2">Requests approved</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'rejected' 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 shadow-lg' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 font-semibold">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{dashboardStats.rejected_count}</div>
              <p className="text-xs text-gray-600 mt-2">Requests rejected</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded' 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 shadow-lg' 
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 font-semibold">Forwarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboardStats.forwarded_count}</div>
              <p className="text-xs text-gray-600 mt-2">Forwarded to others</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('returned')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'returned' 
              ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 shadow-lg' 
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 font-semibold">Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{dashboardStats.returned_count}</div>
              <p className="text-xs text-gray-600 mt-2">Returned to requester</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Personal Requests Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-4xl font-bold flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 text-lg font-semibold px-4 py-2">Subordinate Requests</Badge>
              <span className="text-gray-600 text-2xl">({getPersonalApprovals().length})</span>
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
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {getPersonalApprovals().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No subordinate requests'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getPersonalPaginated().map((approval) => (
                <Card key={approval.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Request ID: {approval.request_id}
                          </h3>
                          <Badge className="text-xs">
                            {approval.request_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              approval.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              approval.current_status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                              approval.current_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {approval.current_status.toUpperCase()}
                          </Badge>
                          {renderLaneBadge(approval.request_id)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Submitted by: <span className="font-medium text-gray-900">{approval.submitted_by_name}</span></div>
                          <div>
                            Submitted: {(() => {
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
                          {approval.current_approver_name && (
                            <div>Current Approver: <span className="font-medium text-gray-900">{approval.current_approver_name}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalClick(approval.id)}
                        >
                          {selectedApproval === approval.id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>
                    </div>

                    {selectedApproval === approval.id && (
                      <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                        <PerItemApprovalPanel
                          approvalId={approval.id}
                          onActionComplete={handleActionComplete}
                          activeFilter={activeFilter}
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
              {getPersonalApprovals().length > 0 ? (
                <>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getPersonalApprovals().length)} of {getPersonalApprovals().length} requests
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

      {/* Wing Requests Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-4xl font-bold flex items-center gap-3">
              <Badge className="bg-purple-100 text-purple-800 text-lg font-semibold px-4 py-2">Wing Request</Badge>
              <span className="text-gray-600 text-2xl">({getWingApprovals().length})</span>
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
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {getWingApprovals().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No wing request'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getWingPaginated().map((approval) => (
                <Card key={approval.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Request ID: {approval.request_id}
                          </h3>
                          <Badge className="text-xs">
                            {approval.request_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              approval.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              approval.current_status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                              approval.current_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {approval.current_status.toUpperCase()}
                          </Badge>
                          {renderLaneBadge(approval.request_id)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Submitted by: <span className="font-medium text-gray-900">{approval.submitted_by_name}</span></div>
                          <div>
                            Submitted: {(() => {
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
                          {approval.current_approver_name && (
                            <div>Current Approver: <span className="font-medium text-gray-900">{approval.current_approver_name}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalClick(approval.id)}
                        >
                          {selectedApproval === approval.id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>
                    </div>

                    {selectedApproval === approval.id && (
                      <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                        <PerItemApprovalPanel
                          approvalId={approval.id}
                          onActionComplete={handleActionComplete}
                          activeFilter={activeFilter}
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
            {getWingApprovals().length > 0 ? (
              <>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getWingApprovals().length)} of {getWingApprovals().length} requests
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
    </div>
  );
};

export default ApprovalDashboard;