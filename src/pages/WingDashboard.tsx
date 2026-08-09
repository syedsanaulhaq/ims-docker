import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import { 
  Package, 
  ClipboardList,
  CheckCircle,
  Clock,
  Send,
  Undo2,
  Bell,
  TrendingUp,
  Box,
  Building2,
  Users,
  X
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Wing data state
  const [wingRequests, setWingRequests] = useState<any[]>([]);
  const [wingIssuedItems, setWingIssuedItems] = useState<any[]>([]);
  const [wingPendingApprovals, setWingPendingApprovals] = useState<any[]>([]);
  const [wingNotifications, setWingNotifications] = useState<any[]>([]);
  const [myVerificationRequests, setMyVerificationRequests] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [userWingName, setUserWingName] = useState<string>('');
  const [wingMembers, setWingMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetchWingData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();
        
        // First, get the current user's wing information
        let wingName = '';
        if (user?.wing_id) {
          try {
            const wingsRes = await fetch(`${apiBase}/wings`, { credentials: 'include' });
            if (wingsRes.ok) {
              const wingsData = await wingsRes.json();
              const wingsList = Array.isArray(wingsData) ? wingsData : (wingsData?.data || []);
              const currentWing = wingsList.find(w => w.Id === user.wing_id || w.id === user.wing_id);
              wingName = currentWing?.Name || currentWing?.name || '';
            }
          } catch (error) {
            console.error('Error fetching wing information:', error);
          }
          setUserWingName(wingName);
        }
        
        // Fetch wing-level data - use the same endpoints as personal dashboard
        // but wing supervisors can see all requests for their wing members
        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes,
          notificationsRes,
          verificationsRes,
          membersRes
        ] = await Promise.all([
          // Wing-related requests only (exclude personal requests)
          fetch(
            user?.is_super_admin
              ? `${apiBase}/stock-issuance/requests?request_type=organizational,wing`
              : `${apiBase}/stock-issuance/requests?wing_id=${user?.wing_id}&request_type=organizational,wing`,
            { credentials: 'include' }
          )
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My issued items (wing supervisor's own items)
          fetch(`${apiBase}/stock-issuance/issued-items?user_id=${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My pending approvals (if wing supervisor is an approver)
          fetch(`${apiBase}/approvals/my-pending`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My notifications
          fetch(`${apiBase}/my-notifications?limit=10`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My verification requests (inventory checks I've requested)
          fetch(`${apiBase}/inventory/my-verification-requests?userId=${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(() => ({ data: [] })),
          
          // Wing members - admin sees all, supervisors scoped to own wing
          fetch(
            user?.is_super_admin
              ? `${apiBase}/ims/users/aspnet/filtered`
              : `${apiBase}/ims/users/aspnet/filtered?wing_id=${user?.wing_id}`,
            { credentials: 'include' }
          )
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        ]);

        setWingRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.requests || requestsRes?.data || []));
        setWingIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setWingPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setWingNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);
        setMyVerificationRequests(verificationsRes?.data || []);
        const normalizedMembers = Array.isArray(membersRes) ? membersRes : (membersRes?.data || []);
        const scopedMembers = user?.is_super_admin
          ? normalizedMembers
          : normalizedMembers.filter((m: any) => Number(m.intWingID ?? m.wing_id) === Number(user?.wing_id));
        setWingMembers(scopedMembers);

      } catch (error) {
        console.error('Error fetching wing dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user?.user_id) {
      fetchWingData();
    }
  }, [user?.user_id]);

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading wing dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalRequests: wingRequests.length,
    pendingRequests: wingRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'submitted' || status === 'pending' || status === 'under_review';
    }).length,
    approvedRequests: wingRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'approved' || status === 'completed';
    }).length,
    itemsInWing: wingIssuedItems.length,
    pendingApprovals: wingPendingApprovals.length,
    unreadNotifications: wingNotifications.filter(n => !n.is_read).length,
    totalMembers: wingMembers.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-8">
        {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Wing Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">
            Manage wing-level stock operations and inventory
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              <Clock className="h-3 w-3 mr-1" />
              Last Updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>
        <Button onClick={() => navigate('/procurement/new-request')} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Send className="h-4 w-4 mr-2" />
          Create Request
        </Button>
      </div>

      {/* Quick Stats - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500" onClick={() => navigate('/dashboard/wing-request-history')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="h-5 w-5" />
              Wing Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-orange-600">{stats.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pending</span>
                <span className="font-semibold text-orange-500">{stats.pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Approved</span>
                <span className="font-semibold text-green-600">{stats.approvedRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500" onClick={() => navigate('/dashboard/wing-inventory')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Items in Wing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-blue-600">{stats.itemsInWing}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                In wing possession
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500" onClick={() => { window.location.href = 'http://localhost:8080/dashboard/wing-request-history'; }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <CheckCircle className="h-5 w-5" />
              Need Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-2xl font-bold text-purple-600">{stats.pendingRequests}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.pendingRequests > 0 ? 'Pending requests to be approved' : 'No pending requests'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500" onClick={() => navigate('/dashboard/wing-members')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Users className="h-5 w-5" />
              Wing Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-green-600">{stats.totalMembers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Members in wing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Status Distribution */}
        <Card className="shadow-lg border-2 border-teal-200">
          <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-teal-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Request Status Distribution
            </CardTitle>
            <CardDescription>Overview of request statuses</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex items-center justify-center">
            {wingRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No requests yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Pending', value: stats.pendingRequests },
                      { name: 'Approved', value: stats.approvedRequests },
                      { name: 'Other', value: stats.totalRequests - stats.pendingRequests - stats.approvedRequests }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#f97316" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#6b7280" />
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Requests Trend */}
        <Card className="shadow-lg border-2 border-indigo-200">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Requests Trend
            </CardTitle>
            <CardDescription>Requests created in the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex items-center justify-center">
            {wingRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No requests yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={(() => {
                    // Group requests by month
                    const monthData: Record<string, number> = {};
                    const now = new Date();
                    
                    // Initialize last 6 months
                    for (let i = 5; i >= 0; i--) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      monthData[monthKey] = 0;
                    }
                    
                    // Count requests by month
                    wingRequests.forEach(req => {
                      const reqDate = new Date(req.created_at || req.submitted_date || req.request_date || new Date());
                      const monthKey = reqDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      if (monthData.hasOwnProperty(monthKey)) {
                        monthData[monthKey]++;
                      }
                    });
                    
                    return Object.entries(monthData).map(([month, count]) => ({
                      month,
                      requests: count
                    }));
                  })()}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    formatter={(value) => value}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Verification Requests */}
      <Card className="shadow-lg border-2 border-indigo-200">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                My Verification Requests
              </CardTitle>
              <CardDescription>Inventory checks I've requested</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/pending-verifications')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!myVerificationRequests || myVerificationRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-gray-600">No verification requests yet</p>
              <p className="text-xs text-gray-400 mt-2">Click "Ask Supervisor to Verify" on any inventory item to create a request</p>
            </div>
          ) : (
            <div className="divide-y">
              {myVerificationRequests.map((request) => {
                const isPending = request.status === 'pending';
                const isVerified = request.status && request.status.startsWith('verified');
                const statusColor = isPending ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                   request.status === 'verified_available' ? 'bg-green-100 text-green-800 border-green-300' :
                                   request.status === 'verified_partial' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                   request.status === 'verified_unavailable' ? 'bg-red-100 text-red-800 border-red-300' :
                                   'bg-gray-100 text-gray-800 border-gray-300';

                return (
                  <div 
                    key={request.id} 
                    className="p-4 hover:bg-indigo-50 cursor-pointer transition-colors border-b"
                    onClick={() => setSelectedVerification(request)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Reference: #{request.id}</h4>
                        <p className="text-sm text-gray-600 mt-1">Item: {request.item_nomenclature || request.item_id}</p>
                        <p className="text-xs text-gray-500 mt-1">Requester: {request.requested_by_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">Wing: {request.wing_name || 'Unknown Wing'}</p>
                      </div>
                      <Badge variant="outline" className={statusColor}>
                        {isPending ? '⏳ Pending' : isVerified ? '✓ Verified' : request.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-semibold">Quantity Requested:</span> {request.requested_quantity || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Requested on:</span> {formatDateDMY(request.requested_at || request.created_at)}
                      </div>
                    </div>
                    {isVerified && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2 bg-indigo-50 p-2 rounded">
                        <div>
                          <span className="font-semibold">Found:</span> {request.physical_count || '-'}
                        </div>
                        <div>
                          <span className="font-semibold">Available:</span> {request.available_quantity || '-'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Details Modal */}
      {selectedVerification && (
        <>
          <style>{`body { overflow: hidden; }`}</style>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-100 to-indigo-50 sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Verification Request Details</CardTitle>
                  <CardDescription>Reference: #{selectedVerification.id}</CardDescription>
                </div>
                <button 
                  onClick={() => setSelectedVerification(null)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 pb-6">
              {/* Request Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Item</p>
                  <p className="text-lg font-medium text-gray-900">{selectedVerification.item_nomenclature || 'Unknown Item'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                  <Badge className={selectedVerification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                    {selectedVerification.status === 'pending' ? '⏳ Pending Verification' : '✓ Verified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Requested By</p>
                  <p className="text-sm text-gray-700">{selectedVerification.requested_by_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Quantity Requested</p>
                  <p className="text-sm text-gray-700">{selectedVerification.requested_quantity || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Requested On</p>
                  <p className="text-sm text-gray-700">{formatDateDMY(selectedVerification.requested_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Wing</p>
                  <p className="text-sm text-gray-700">{userWingName || 'Unknown'}</p>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-4">Activity Timeline</h5>
                <div className="space-y-4">
                  {/* Verification Request Created */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 mt-2"></div>
                      <div className="w-0.5 h-12 bg-gray-200"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900">Verification Requested</p>
                      <p className="text-xs text-gray-600">{selectedVerification.requested_by_name} requested inventory verification</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateDMY(selectedVerification.requested_at)}</p>
                    </div>
                  </div>

                  {/* Verification Completed */}
                  {selectedVerification.status && selectedVerification.status.startsWith('verified') && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-600 mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Verification Completed</p>
                        <p className="text-xs text-gray-600">{selectedVerification.verified_by_name} verified the inventory</p>
                        <div className="mt-2 p-3 bg-white border border-green-200 rounded text-sm space-y-1">
                          <div><span className="font-semibold">Status:</span> {selectedVerification.status.replace('verified_', '').charAt(0).toUpperCase() + selectedVerification.status.replace('verified_', '').slice(1)}</div>
                          <div><span className="font-semibold">Physical Count:</span> {selectedVerification.physical_count || '-'}</div>
                          <div><span className="font-semibold">Available Quantity:</span> {selectedVerification.available_quantity || '-'}</div>
                          {selectedVerification.verification_notes && (
                            <div><span className="font-semibold">Notes:</span> {selectedVerification.verification_notes}</div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{formatDateDMY(selectedVerification.verified_at)}</p>
                      </div>
                    </div>
                  )}

                  {selectedVerification.status === 'pending' && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Awaiting Verification</p>
                        <p className="text-xs text-gray-600">Waiting for inventory supervisor to verify</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </>
      )}

      {/* Recent Wing Requests */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Wing Requests</CardTitle>
              <CardDescription>Latest stock requests from wing members</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/wing-request-history')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {wingRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-gray-600">No wing requests yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {wingRequests.slice(0, 5).map((request) => (
                <div 
                  key={request.id} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/request-details/${request.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{request.purpose || request.title || 'Stock Request'}</h4>
                    <Badge 
                      variant={
                        (request.request_status || '').toLowerCase() === 'approved' 
                          ? 'default' 
                          : (request.request_status || '').toLowerCase() === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {request.request_status || 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {format(new Date(request.created_at || request.submitted_at), 'MM/dd/yyyy')} • {request.justification || request.purpose || 'No description'}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      Requester: {request.requester?.full_name || 'Unknown'}
                    </div>
                    <div>
                      Wing: {request.wing?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items in Wing */}
      {wingIssuedItems.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Items in Wing Possession</CardTitle>
                <CardDescription>Current inventory assigned to wing members</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/wing-inventory')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {wingIssuedItems.slice(0, 5).map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/item-details/${item.item_id || item.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{item.item_name || item.description}</h4>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">{item.quantity || 0} units</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{item.category || 'Uncategorized'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default WingDashboard;
