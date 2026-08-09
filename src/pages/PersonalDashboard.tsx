import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import { 
  Package,
  ClipboardList,
  CheckCircle,
  Clock,
  Box,
  XCircle,
  Layers,
  ArrowUpRight,
  BarChart3,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import LoadingSpinner from "@/components/common/LoadingSpinner";

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'forwarded' | 'other';

const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  pending: '#f59e0b',
  approved: '#16a34a',
  rejected: '#dc2626',
  returned: '#ea580c',
  forwarded: '#2563eb',
  other: '#6b7280',
};

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [dataLoading, setDataLoading] = useState(true);

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myIssuedItems, setMyIssuedItems] = useState<any[]>([]);
  const [myPendingApprovals, setMyPendingApprovals] = useState<any[]>([]);
  const [searchRequestsFilter, setSearchRequestsFilter] = useState('');

  const toArray = (payload: any, preferredKeys: string[] = ['data', 'requests', 'items']) => {
    if (Array.isArray(payload)) return payload;
    for (const key of preferredKeys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  };

  const getStatusRaw = (request: any) =>
    String(
      request?.request_status ||
      request?.current_status ||
      request?.status ||
      request?.approval_status ||
      'pending'
    ).toLowerCase();

  const getNormalizedStatus = (request: any): RequestStatus => {
    const raw = getStatusRaw(request);
    if (raw.includes('reject')) return 'rejected';
    if (raw.includes('return')) return 'returned';
    if (raw.includes('forward')) return 'forwarded';
    if (raw.includes('approv') || raw.includes('complete') || raw.includes('final')) return 'approved';
    if (raw.includes('pending') || raw.includes('review') || raw.includes('wait')) return 'pending';
    return 'other';
  };

  const getRequestDate = (request: any) =>
    request?.submitted_at ||
    request?.submitted_date ||
    request?.requested_at ||
    request?.requested_date ||
    request?.created_at ||
    request?.created_date ||
    request?.date;

  const parseDateSafely = (value: any): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const dateFromNumber = new Date(value);
      return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const dotNetTicksMatch = raw.match(/^\/Date\((\d+)\)\/$/);
    if (dotNetTicksMatch) {
      const ticks = Number(dotNetTicksMatch[1]);
      const dotNetDate = new Date(ticks);
      return Number.isNaN(dotNetDate.getTime()) ? null : dotNetDate;
    }

    if (/^\d+$/.test(raw)) {
      const numericDate = new Date(Number(raw));
      return Number.isNaN(numericDate.getTime()) ? null : numericDate;
    }

    let parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    if (raw.includes(' ') && !raw.includes('T')) {
      parsed = new Date(raw.replace(' ', 'T'));
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    return null;
  };

  const getRequestItems = (request: any): any[] => {
    if (Array.isArray(request?.items)) return request.items;
    if (Array.isArray(request?.request_items)) return request.request_items;
    return [];
  };

  const getNumeric = (value: any, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const getRequestQuantity = (request: any) => {
    const items = getRequestItems(request);
    if (!items.length) {
      return getNumeric(request?.requested_quantity || request?.quantity || request?.total_items, 0);
    }
    return items.reduce(
      (sum, item) => sum + getNumeric(item?.requested_quantity || item?.quantity || item?.qty, 0),
      0
    );
  };

  const getIssuedQuantity = (item: any) =>
    getNumeric(item?.issued_quantity || item?.quantity || item?.qty || item?.requested_quantity, 1);

  const isReturnedInventoryItem = (item: any) => {
    const status = String(item?.status || item?.return_status || '').toLowerCase();
    return status === 'returned' || Boolean(item?.actual_return_date) || Boolean(item?.returned_date);
  };

  const getStatusBadgeClass = (status: RequestStatus) => {
    if (status === 'approved') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-300';
    if (status === 'returned') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (status === 'forwarded') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusLabel = (status: RequestStatus) => {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'returned') return 'Returned';
    if (status === 'forwarded') return 'Forwarded';
    if (status === 'pending') return 'Pending';
    return 'Other';
  };

  const openMyRequestsReport = (status?: string) => {
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    navigate(params.toString() ? `/dashboard/my-requests?${params.toString()}` : '/dashboard/my-requests');
  };

  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();

        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes
        ] = await Promise.all([
          fetch(`${apiBase}/approvals/my-requests/${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : { requests: [] })
            .catch(() => ({ requests: [] })),

          fetch(`${apiBase}/stock-issuance/issued-items?user_id=${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(() => ({ data: [] })),

          fetch(`${apiBase}/approvals/my-lane-pending`, { credentials: 'include' })
            .then(async (res) => {
              if (res.ok) return res.json();
              const fallbackRes = await fetch(`${apiBase}/approvals/my-pending`, { credentials: 'include' });
              return fallbackRes.ok ? fallbackRes.json() : { data: [] };
            })
            .catch(() => ({ data: [] }))
        ]);

        setMyRequests(toArray(requestsRes, ['requests', 'data']));
        setMyIssuedItems(toArray(issuedItemsRes, ['data', 'items']));
        setMyPendingApprovals(toArray(approvalsRes, ['data', 'requests']));

      } catch (error) {
        console.error('Error fetching personal dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user?.user_id) {
      fetchPersonalData();
    }
  }, [user?.user_id]);

  // ⚠️ All hooks MUST be called before any early return (Rules of Hooks)
  const inventorySummary = useMemo(() => {
    const totalQuantity = myIssuedItems.reduce((sum, item) => sum + getIssuedQuantity(item), 0);
    const returnedQuantity = myIssuedItems
      .filter((item) => isReturnedInventoryItem(item))
      .reduce((sum, item) => sum + getIssuedQuantity(item), 0);
    const inPossessionQuantity = Math.max(totalQuantity - returnedQuantity, 0);

    return {
      totalQuantity,
      returnedQuantity,
      inPossessionQuantity,
      uniqueItemRows: myIssuedItems.length,
    };
  }, [myIssuedItems]);

  const requestSummary = useMemo(() => {
    const base = {
      requested: myRequests.length,
      requestedQuantity: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      returned: 0,
      forwarded: 0,
      other: 0,
    };

    return myRequests.reduce((acc, request) => {
      const status = getNormalizedStatus(request);
      acc.requestedQuantity += getRequestQuantity(request);
      acc[status] += 1;
      return acc;
    }, base);
  }, [myRequests]);

  const requestStatusChartData = useMemo(
    () => [
      { name: 'Pending', value: requestSummary.pending, color: REQUEST_STATUS_COLORS.pending },
      { name: 'Approved', value: requestSummary.approved, color: REQUEST_STATUS_COLORS.approved },
      { name: 'Rejected', value: requestSummary.rejected, color: REQUEST_STATUS_COLORS.rejected },
      { name: 'Returned', value: requestSummary.returned, color: REQUEST_STATUS_COLORS.returned },
      { name: 'Forwarded', value: requestSummary.forwarded, color: REQUEST_STATUS_COLORS.forwarded },
    ],
    [requestSummary]
  );

  const inventoryChartData = useMemo(
    () => [
      { name: 'In Inventory', value: inventorySummary.inPossessionQuantity, color: '#0891b2' },
      { name: 'Returned', value: inventorySummary.returnedQuantity, color: '#f97316' },
    ],
    [inventorySummary]
  );

  const filteredLatestRequests = useMemo(() => {
    const search = searchRequestsFilter.trim().toLowerCase();

    const filtered = myRequests.filter((request) => {
      if (!search) return true;
      const text = [
        request?.title,
        request?.description,
        request?.purpose,
        request?.request_id,
        request?.request_number,
        getStatusRaw(request),
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return text.includes(search);
    });

    return filtered
      .sort((a, b) => {
        const db = parseDateSafely(getRequestDate(b))?.getTime() || 0;
        const da = parseDateSafely(getRequestDate(a))?.getTime() || 0;
        return db - da;
      })
      .slice(0, 8);
  }, [myRequests, searchRequestsFilter]);

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your personal dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      <Card className="border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Personal Dashboard</h1>
              <p className="text-slate-600 mt-2">
                Welcome back, {user?.user_name || 'User'}. Track your inventory health and request pipeline in one view.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  <Clock className="h-3 w-3 mr-1" /> Last Updated: {new Date().toLocaleTimeString()}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => navigate('/dashboard/stock-issuance-personal')}>
                New Request
              </Button>
              <Button onClick={() => navigate('/dashboard/my-requests')}>
                My Requests
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <button type="button" onClick={() => navigate('/dashboard/my-issued-items')} className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl" aria-label="Open inventory in hand report">
          <Card className="border-l-4 border-l-cyan-500 h-full">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <Package className="h-4 w-4" /> Inventory In Hand
              </CardDescription>
              <CardTitle className="text-3xl text-cyan-700">{inventorySummary.inPossessionQuantity}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Items currently in your possession</CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => navigate('/dashboard/requisition-report')} className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl" aria-label="Open total requested report">
          <Card className="border-l-4 border-l-indigo-500 h-full">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <ClipboardList className="h-4 w-4" /> Total Requested
              </CardDescription>
              <CardTitle className="text-3xl text-indigo-700">{requestSummary.requested}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Requests submitted by you</CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => openMyRequestsReport('pending')} className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl" aria-label="Open pending requests report">
          <Card className="border-l-4 border-l-amber-500 h-full">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" /> Pending Requests
              </CardDescription>
              <CardTitle className="text-3xl text-amber-700">{requestSummary.pending}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Still awaiting approval decision</CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => openMyRequestsReport('rejected')} className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl" aria-label="Open rejected requests report">
          <Card className="border-l-4 border-l-rose-500 h-full">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <XCircle className="h-4 w-4" /> Rejected Requests
              </CardDescription>
              <CardTitle className="text-3xl text-rose-700">{requestSummary.rejected}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Requests marked as rejected</CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => navigate('/dashboard/requisition-report')} className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl" aria-label="Open requisition quantity report">
          <Card className="border-l-4 border-l-teal-500 h-full">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <Layers className="h-4 w-4" /> Requested Qty
              </CardDescription>
              <CardTitle className="text-3xl text-teal-700">{requestSummary.requestedQuantity}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Total quantity requested across requests</CardContent>
          </Card>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" /> Request Status Overview
            </CardTitle>
            <CardDescription>Distribution of your request statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {requestStatusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Inventory Split</CardTitle>
            <CardDescription>In inventory vs returned quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {inventoryChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-sm mt-2">
              {inventoryChartData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Latest Requests & Status</CardTitle>
              <CardDescription>Most recent requests submitted by you</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search by request number, title, status..."
                value={searchRequestsFilter}
                onChange={(e) => setSearchRequestsFilter(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <Button variant="outline" onClick={() => navigate('/dashboard/my-requests')}>View All</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredLatestRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              {searchRequestsFilter ? 'No matching requests found.' : 'No requests available yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-slate-50">
                    <th className="px-3 py-3 font-semibold text-slate-700">Request</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Submitted</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Items</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLatestRequests.map((request) => {
                    const normalizedStatus = getNormalizedStatus(request);
                    const requestKey = request?.id || request?.request_id;
                    const displayName = request?.request_number || request?.request_id || request?.title || 'Stock Issuance Request';
                    const itemCount = getRequestItems(request).length || getNumeric(request?.total_items, 0);
                    const quantity = getRequestQuantity(request);
                    const submittedDate = parseDateSafely(getRequestDate(request));

                    return (
                      <tr key={String(requestKey)} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{displayName}</div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">{request?.description || request?.purpose || 'No description'}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{submittedDate ? formatDateTimeDMY(submittedDate) : '-'}</td>
                        <td className="px-3 py-3 text-slate-600">
                          <div>{itemCount} item(s)</div>
                          <div className="text-xs text-slate-500">Qty: {quantity}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={getStatusBadgeClass(normalizedStatus)}>
                            {getStatusLabel(normalizedStatus)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/request-details/${requestKey}`)}
                            className="gap-1"
                          >
                            View <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default PersonalDashboard;
