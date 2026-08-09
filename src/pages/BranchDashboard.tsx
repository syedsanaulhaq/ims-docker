import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getApiBaseUrl } from '@/services/invmisApi';
import { CheckCircle, ClipboardList, Clock, Package, Send, TrendingUp, Users } from 'lucide-react';
import { Cell, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const getRequestStatus = (request: any) => String(
  request?.current_status || request?.request_status || request?.final_status || request?.approval_status || ''
).toLowerCase();

const getFinalStatus = (request: any) => String(
  request?.final_status || request?.approval_status || request?.request_status || request?.current_status || ''
).toLowerCase();

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

const BranchDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [branchRequests, setBranchRequests] = useState<any[]>([]);
  const [branchInventoryItems, setBranchInventoryItems] = useState<any[]>([]);
  const [branchMembers, setBranchMembers] = useState<any[]>([]);

  const branchId = Number((user as any)?.branch_id ?? 0) || 0;
  const branchName = (user as any)?.branch_name || 'Your Branch';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const apiBase = getApiBaseUrl();
        const branchParam = branchId || 0;

        const [requestsRes, inventoryRes, membersRes] = await Promise.all([
          fetch(`${apiBase}/branch-inventory/requests`, { credentials: 'include' }).then((response) =>
            response.ok ? response.json() : { requests: [] }
          ),
          fetch(`${apiBase}/branch-inventory/${branchParam}`, { credentials: 'include' }).then((response) =>
            response.ok ? response.json() : { items: [] }
          ),
          fetch(`${apiBase}/ims/users/aspnet/filtered?branch_id=me`, { credentials: 'include' }).then((response) =>
            response.ok ? response.json() : []
          ),
        ]);

        setBranchRequests(Array.isArray(requestsRes?.requests) ? requestsRes.requests : []);
        setBranchInventoryItems(Array.isArray(inventoryRes?.items) ? inventoryRes.items : []);
        setBranchMembers(Array.isArray(membersRes) ? membersRes : []);
      } catch (error) {
        console.error('Error loading branch dashboard:', error);
        setBranchRequests([]);
        setBranchInventoryItems([]);
        setBranchMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.user_id) {
      loadData();
    }
  }, [user?.user_id, branchId]);

  const stats = useMemo(() => {
    const pendingRequests = branchRequests.filter((request) => {
      const status = getRequestStatus(request);
      return ['submitted', 'pending', 'under_review'].includes(status);
    }).length;

    const approvedRequests = branchRequests.filter((request) => {
      const status = getFinalStatus(request);
      return ['approved', 'completed', 'issued'].includes(status);
    }).length;

    return {
      totalRequests: branchRequests.length,
      pendingRequests,
      approvedRequests,
      itemsInBranch: branchInventoryItems.length,
      totalMembers: branchMembers.length,
    };
  }, [branchRequests, branchInventoryItems, branchMembers]);

  const monthlyRequestTrend = useMemo(() => {
    const monthData: Record<string, number> = {};
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthData[monthKey] = 0;
    }

    branchRequests.forEach((request) => {
      const rawDate = request.requested_date || request.submitted_date || request.created_at || request.submitted_at;
      const requestDate = rawDate ? new Date(rawDate) : null;
      if (!requestDate || Number.isNaN(requestDate.getTime())) return;

      const monthKey = requestDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (Object.prototype.hasOwnProperty.call(monthData, monthKey)) {
        monthData[monthKey] += 1;
      }
    });

    return Object.entries(monthData).map(([month, requests]) => ({ month, requests }));
  }, [branchRequests]);

  const statusDistribution = [
    { name: 'Pending', value: stats.pendingRequests },
    { name: 'Approved', value: stats.approvedRequests },
    { name: 'Other', value: Math.max(stats.totalRequests - stats.pendingRequests - stats.approvedRequests, 0) },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading branch dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Branch Dashboard</h1>
            <p className="text-lg text-gray-600 mt-2">{branchName}</p>
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
          <Button onClick={() => navigate('/dashboard/stock-issuance-branch')} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Send className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500" onClick={() => navigate('/dashboard/branch-request-history')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <ClipboardList className="h-5 w-5" />
                Branch Requests
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

          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500" onClick={() => navigate('/dashboard/branch-inventory')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Package className="h-5 w-5" />
                Items in Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.itemsInBranch}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">In branch possession</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500" onClick={() => navigate('/dashboard/branch-request-history')}>
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

          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500" onClick={() => navigate('/dashboard/branch-members')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Users className="h-5 w-5" />
                Branch Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-green-600">{stats.totalMembers}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Members in branch</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-2 border-teal-200">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-teal-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                Request Status Distribution
              </CardTitle>
              <CardDescription>Overview of branch request statuses</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-center">
              {branchRequests.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No requests yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
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

          <Card className="shadow-lg border-2 border-indigo-200">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Requests Trend
              </CardTitle>
              <CardDescription>Branch requests created in the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-center">
              {branchRequests.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No requests yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRequestTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} formatter={(value) => value} />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Branch Requests</CardTitle>
                <CardDescription>Latest stock requests from this branch</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/branch-request-history')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {branchRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-gray-600">No branch requests yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {branchRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/request-details/${request.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{request.title || request.purpose || 'Stock Request'}</h4>
                      <Badge variant={getFinalStatus(request) === 'approved' || getFinalStatus(request) === 'completed' ? 'default' : 'secondary'}>
                        {request.final_status || request.current_status || 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDisplayDate(request.submitted_date || request.requested_date)} - {request.description || request.justification || 'No description'}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>Requester: {request.requester_name || 'Unknown'}</div>
                      <div>Branch: {request.requester_branch || branchName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Items in Branch Possession</CardTitle>
                <CardDescription>Current inventory assigned to this branch</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/branch-inventory')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {branchInventoryItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-gray-600">No branch inventory yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {branchInventoryItems.slice(0, 5).map((item, index) => (
                  <div key={item.ledger_id || index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.nomenclature || item.item_name || 'Unknown Item'}</h4>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {Number(item.issued_quantity || item.quantity || 0)} units
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{item.category_name || item.category || 'Uncategorized'}</p>
                    <p className="text-xs text-gray-500 mt-1">Issued: {formatDisplayDate(item.issued_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BranchDashboard;