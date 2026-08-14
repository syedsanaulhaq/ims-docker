import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

interface ReportItem {
  id: string;
  item_master_id?: string;
  item_name: string;
  unit: string;
  requested_quantity: number;
  allotted_quantity?: number;
  last_issued_quantity?: number | null;
  last_issue_date?: string | null;
}

interface RequisitionReport {
  id: string;
  request_number?: string;
  request_type: string;
  requester_name: string;
  requester_designation?: string;
  allotted_by_name?: string;
  approved_by_name?: string;
  office_name?: string;
  wing_name?: string;
  submitted_date?: string;
  purpose?: string;
  items: ReportItem[];
}

interface RequisitionOption {
  id: string;
  request_number?: string;
  purpose?: string;
  submitted_at?: string;
  requester_name?: string;
  requester_designation?: string;
  request_type?: string;
  request_status?: string;
  office_name?: string;
  wing_name?: string;
  is_completed?: boolean;
}

const formatDate = (value?: string | null, fallback = '-') => {
  if (!value) return fallback;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return fallback;
  return dt.toLocaleDateString('en-GB');
};

const pickDesignation = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text && text !== '-') return text;
  }
  return '-';
};

const isCompletedRequest = (request: any) => {
  const statusBlob = [request?.request_status, request?.approval_status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    statusBlob.includes('completed') ||
    statusBlob.includes('approved') ||
    statusBlob === 'issued' ||
    statusBlob.includes('finalized') ||
    statusBlob.includes('finalised') ||
    statusBlob.includes('closed')
  );
};

const RequisitionReportPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RequisitionReport | null>(null);
  const [requestOptions, setRequestOptions] = useState<RequisitionOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const todayText = formatDate(new Date().toISOString(), '-');

  const handlePrint = () => {
    document.body.classList.add('requisition-report-print');
    window.print();
  };

  useEffect(() => {
    const clearPrintMode = () => {
      document.body.classList.remove('requisition-report-print');
    };

    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        setReport(null);

        const normalizeLegacyRows = (rows: any[]) => rows.map((row: any) => ({
          id: String(row.id),
          request_number: row.request_number,
          request_type: row.request_type,
          requester_user_id: row.requester_user_id,
          requester_name: row.requester_name,
          purpose: row.purpose,
          approval_status: row.approval_status,
          request_status: row.request_status,
          submitted_at: row.submitted_at || row.created_at,
          created_at: row.created_at,
          requester: {
            user_id: row.requester_user_id,
            full_name: row.requester_name,
            designation_name: row.requester_designation || row.requester_role || '-'
          },
          wing: { name: row.wing_name || '-' },
          office: { office_name: row.office_name || '-', name: row.office_name || '-' },
          items: []
        }));

        let currentUserId = '';
        let currentUserDesignation = '-';

        try {
          const sessionResp = await fetch(`${getApiBaseUrl()}/auth/session`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (sessionResp.ok) {
            const sessionData = await sessionResp.json();
            currentUserId = String(
              sessionData?.session?.user_id ||
              sessionData?.session?.userId ||
              sessionData?.user?.id ||
              ''
            ).trim();

            if (currentUserId) {
              const designationResp = await fetch(`${getApiBaseUrl()}/auth/designation/${currentUserId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });

              if (designationResp.ok) {
                const designationData = await designationResp.json();
                currentUserDesignation = pickDesignation(designationData?.designation);
              }
            }
          }
        } catch (sessionOrDesignationError) {
          }

        if (!currentUserId) {
          throw new Error('Unable to resolve logged-in user session');
        }

        const byId: Record<string, any> = {};

        try {
          const requestsResp = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (requestsResp.ok) {
            const requestsData = await requestsResp.json();
            const primaryRows = Array.isArray(requestsData)
              ? requestsData
              : (Array.isArray(requestsData?.data) ? requestsData.data : []);
            primaryRows.forEach((row: any) => {
              const key = String(row?.id || '').trim();
              if (key) byId[key] = row;
            });
          }
        } catch (requestsError) {
          }

        if (Object.keys(byId).length === 0) {
          try {
            const legacyResp = await fetch(`${getApiBaseUrl()}/stock-issuance`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (legacyResp.ok) {
              const legacyData = await legacyResp.json();
              const legacyRows = Array.isArray(legacyData)
                ? legacyData
                : (Array.isArray(legacyData?.data) ? legacyData.data : []);
              normalizeLegacyRows(legacyRows).forEach((row: any) => {
                const key = String(row?.id || '').trim();
                if (key) byId[key] = row;
              });
            }
          } catch (legacyError) {
            }
        }

        if (Object.keys(byId).length === 0) {
          try {
            if (currentUserId) {
              const myReqResp = await fetch(`${getApiBaseUrl()}/approvals/my-requests/${currentUserId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });

              if (myReqResp.ok) {
                const myReqData = await myReqResp.json();
                const myRows = Array.isArray(myReqData?.requests) ? myReqData.requests : [];
                normalizeLegacyRows(myRows).forEach((row: any) => {
                  const key = String(row?.id || '').trim();
                  if (key) byId[key] = row;
                });
              }
            }
          } catch (myReqError) {
            }
        }

        const allRequests = Object.values(byId);
        const myRequests = allRequests.filter((r: any) => {
          if (!currentUserId) return false;
          const requesterId = String(r?.requester_user_id || r?.requester?.user_id || '').trim();
          return requesterId === currentUserId;
        });

        if (!requestId) {
          const requestsToShow = myRequests.length > 0 ? myRequests : allRequests;
          const options = requestsToShow
            .sort((a: any, b: any) => {
              const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
              const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
              return dateB - dateA;
            })
            .map((r: any) => ({
              id: String(r.id),
              request_number: r.request_number,
              purpose: r.purpose,
              submitted_at: r.submitted_at || r.created_at || null,
              requester_name: r.requester?.full_name || r.requester_name || '-',
              requester_designation: pickDesignation(
                currentUserDesignation,
                r.requester?.designation_name,
                r.requester?.designation,
                r.requester_designation,
                r.requester?.role_name,
                r.requester?.role
              ),
              request_type: r.request_type || '-',
              request_status: r.request_status || r.approval_status || '-',
              office_name: r.office?.name || r.office?.office_name || '-',
              wing_name: r.wing?.name || '-',
              is_completed: isCompletedRequest(r)
            }));
          setRequestOptions(options);
          return;
        }

        const found = (myRequests.length > 0 ? myRequests : allRequests).find((r: any) => r.id === requestId);

        if (!found) {
          console.error(`Request not found: ${requestId} | currentUserId: ${currentUserId} | myRequests: ${myRequests.length} | allRequests: ${allRequests.length}`);
          throw new Error(`Request not found (searched ${allRequests.length} available requests)`);
        }

        let items: ReportItem[] = (found.items || []).map((item: any) => ({
          id: String(item.id),
          item_master_id: item.item_master_id ? String(item.item_master_id) : undefined,
          item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
          requested_quantity: Number(item.requested_quantity || 0),
          allotted_quantity: Number(item.issued_quantity ?? item.approved_quantity ?? 0),
          unit: item.unit || 'Nos.'
        }));

        let allottedByName = '-';
        let approvedByName = '-';
        let requesterDesignation = pickDesignation(
          currentUserDesignation,
          found.requester?.designation_name,
          found.requester?.designation,
          found.requester_designation,
          found.requester?.role_name,
          found.requester?.role
        );

        if (requesterDesignation === '-') {
          const requesterUserId = String(found.requester_user_id || found.requester?.user_id || '').trim();

          if (requesterUserId) {
            try {
              const designationResp = await fetch(`${getApiBaseUrl()}/auth/designation/${requesterUserId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });

              if (designationResp.ok) {
                const designationData = await designationResp.json();
                requesterDesignation = pickDesignation(designationData?.designation);
              }
            } catch (designationError) {
              }
          }
        }

        try {
          const detailResp = await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/request/${found.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (detailResp.ok) {
            const detailData = await detailResp.json();
            if (Array.isArray(detailData?.items) && detailData.items.length > 0) {
              items = detailData.items.map((item: any) => ({
                id: String(item.id),
                item_master_id: item.item_master_id ? String(item.item_master_id) : undefined,
                item_name: item.nomenclature || item.custom_item_name || item.item_name || 'Unknown Item',
                requested_quantity: Number(item.requested_quantity || 0),
                allotted_quantity: Number(item.issued_quantity ?? item.approved_quantity ?? 0),
                unit: item.unit || 'Nos.'
              }));
            }
          }
        } catch (detailError) {
          }

        try {
          const historyRows: any[] = [];

          const historyResp = await fetch(`${getApiBaseUrl()}/stock-issuance/${found.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (historyResp.ok) {
            const historyData = await historyResp.json();
            if (Array.isArray(historyData?.approval_history)) {
              historyRows.push(...historyData.approval_history);
            }
          }

          const detailsResp = await fetch(`${import.meta.env.VITE_API_URL}/api/request-details/${found.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (detailsResp.ok) {
            const detailsData = await detailsResp.json();
            if (Array.isArray(detailsData?.request?.approval_history)) {
              historyRows.push(...detailsData.request.approval_history);
            }
          }

          const normalized = historyRows.map((h: any) => ({
            action: String(h.action || h.action_type || h.ActionType || '').toLowerCase(),
            role: String(h.approver_role || h.submitted_to_role || h.RoleName || '').toLowerCase(),
            roleLabel: String(h.approver_role || h.submitted_to_role || h.RoleName || '').trim(),
            actor: String(
              h.actor_name ||
              h.approver_name ||
              h.ActionByName ||
              h.UserName ||
              h.FullName ||
              h.forwarded_to_name ||
              h.submitted_to ||
              ''
            ).trim()
          }));

          const allottedRows = normalized.filter((h: any) =>
            h.actor && (
              h.action.includes('allotted') ||
              h.action.includes('issued') ||
              h.action.includes('sent to wing store') ||
              h.action.includes('wing store') ||
              h.action.includes('verified') ||
              h.role.includes('store')
            )
          );
          if (allottedRows.length > 0) {
            allottedByName = allottedRows[allottedRows.length - 1].actor;
          }

          const approvedRows = normalized.filter((h: any) =>
            h.actor && (
              h.action.includes('approved') ||
              h.action.includes('final approved')
            ) && !h.action.includes('pending')
          );
          if (approvedRows.length > 0) {
            approvedByName = approvedRows[approvedRows.length - 1].actor;
          } else {
            const issuedIndex = normalized.findIndex((h: any) =>
              h.actor && (
                h.action.includes('issued') ||
                h.action.includes('allotted') ||
                h.action.includes('sent to wing store')
              )
            );

            if (issuedIndex > 0) {
              for (let i = issuedIndex - 1; i >= 0; i -= 1) {
                const prior = normalized[i];
                if (prior?.actor && prior.actor !== allottedByName) {
                  approvedByName = prior.actor;
                  break;
                }
              }
            }
          }
        } catch (historyError) {
          }

        try {
          const params = new URLSearchParams();
          if (String(found.request_type || '').toLowerCase() === 'individual' && found.requester_user_id) {
            params.append('user_id', String(found.requester_user_id));
          } else if (found.requester_wing_id) {
            params.append('wing_id', String(found.requester_wing_id));
          }
          params.append('exclude_request_id', String(found.id));

          if (params.toString()) {
            const summaryResp = await fetch(`${getApiBaseUrl()}/stock-issuance/last-issued-summary?${params.toString()}`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (summaryResp.ok) {
              const summaryData = await summaryResp.json();
              const summaryMap: Record<string, { qty: number | null; date: string | null }> = {};
              (summaryData?.data || []).forEach((row: any) => {
                const key = String(row.item_master_id || '');
                if (!key) return;
                summaryMap[key] = {
                  qty: row.last_issued_quantity == null ? null : Number(row.last_issued_quantity),
                  date: row.last_issue_date || null
                };
              });

              items = items.map((item) => {
                const history = item.item_master_id ? summaryMap[String(item.item_master_id)] : undefined;
                return {
                  ...item,
                  last_issued_quantity: history?.qty ?? null,
                  last_issue_date: history?.date || null
                };
              });
            }
          }
        } catch (summaryError) {
          }

        setReport({
          id: found.id,
          request_number: found.request_number,
          request_type: found.request_type || '-',
          requester_name: found.requester?.full_name || found.requester_name || 'Unknown',
          requester_designation: requesterDesignation || '-',
          allotted_by_name: allottedByName,
          approved_by_name: approvedByName,
          office_name: found.office?.name || found.office?.office_name || '-',
          wing_name: found.wing?.name || '-',
          submitted_date: found.submitted_at || found.created_at || null,
          purpose: found.purpose || '-',
          items
        });
      } catch (err: any) {
        console.error('Requisition report error:', err);
        setError(err?.message || 'Failed to load requisition report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [requestId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading requisition report...</div>
      </div>
    );
  }

  const filteredRequestOptions = requestOptions.filter((req) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const blob = [
      req.request_number,
      req.purpose,
      req.requester_name,
      req.requester_designation,
      req.request_type,
      req.request_status,
      req.office_name,
      req.wing_name,
      req.submitted_at
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return blob.includes(q);
  });
  const pendingRequestOptions = filteredRequestOptions.filter((req) => !req.is_completed);
  const completedRequestOptions = filteredRequestOptions.filter((req) => req.is_completed);

  const renderRequestGroup = (title: string, options: RequisitionOption[], variant: 'pending' | 'completed') => (
    <div className="space-y-3">
      <div className={variant === 'completed'
        ? 'flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-2 border-l-4 border-l-green-600'
        : 'flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 border-l-4 border-l-amber-600'
      }>
        <h3 className={variant === 'completed' ? 'text-base font-semibold text-green-900' : 'text-base font-semibold text-amber-900'}>{title}</h3>
        <Badge className={variant === 'completed' ? 'bg-green-700 text-white' : 'bg-amber-700 text-white'}>
          {options.length}
        </Badge>
      </div>
      {options.length === 0 ? (
        <div className="text-sm text-gray-500 py-3">No {variant} requisition reports found.</div>
      ) : (
        options.map((req) => (
          <div key={req.id} className="border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-sm">{req.request_number || req.id.slice(0, 12)}</p>
                <Badge className={req.is_completed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {req.is_completed ? 'Completed' : 'Pending'}
                </Badge>
              </div>
              <p className="text-sm text-gray-700"><span className="font-medium">Requested By:</span> {req.requester_name || '-'}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Designation:</span> {req.requester_designation || '-'}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Office/Wing:</span> {req.office_name || '-'} / {req.wing_name || '-'}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Type/Status:</span> {req.request_type || '-'} / {req.request_status || '-'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Purpose:</span> {req.purpose || '-'}</p>
              <p className="text-xs text-gray-500"><span className="font-medium">Submitted:</span> {formatDate(req.submitted_at, '-')}</p>
            </div>
            <Button size="sm" onClick={() => navigate(`/dashboard/requisition-report/${req.id}`)}>
              Open Report
            </Button>
          </div>
        ))
      )}
    </div>
  );

  if (!requestId) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="space-y-4">
            <CardTitle>Select Requisition Report</CardTitle>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by request no, requester, designation, office, wing, purpose..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredRequestOptions.length === 0 ? (
              <div className="text-center text-sm text-gray-600 py-6">No matching requisition reports found.</div>
            ) : (
              <div className="space-y-8">
                {renderRequestGroup('Pending Requisitions', pendingRequestOptions, 'pending')}
                {renderRequestGroup('Completed Requisitions', completedRequestOptions, 'completed')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-red-600">{error || 'Unable to load report'}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard/requisition-report')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requisition Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFreshRequirement = report.items.reduce((sum, item) => sum + Number(item.requested_quantity || 0), 0);
  const totalAllottedQuantity = report.items.reduce((sum, item) => sum + Number(item.allotted_quantity || 0), 0);

  return (
    <div className="requisition-print-shell container mx-auto p-6 bg-[#f5f6f7] print:bg-white print:p-0 print:m-0">
      <style>{`
        @page {
          size: A4;
          margin: 0.3in;
        }

        @media print {
          body.requisition-report-print #root > * {
            visibility: hidden !important;
          }

          body.requisition-report-print .requisition-print-shell,
          body.requisition-report-print .requisition-print-shell * {
            visibility: visible !important;
          }

          body.requisition-report-print .requisition-print-shell {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
          }

          body.requisition-report-print aside,
          body.requisition-report-print header,
          body.requisition-report-print nav,
          body.requisition-report-print .requisition-print-actions,
          body.requisition-report-print .requisition-print-hide {
            display: none !important;
          }

          body.requisition-report-print {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.3;
            margin: 0 !important;
            padding: 0 !important;
          }

          body.requisition-report-print .requisition-print-shell {
            margin: 0 !important;
            max-width: none !important;
            padding: 0 !important;
            background: #fff !important;
            display: block !important;
            page-break-after: avoid;
          }

          body.requisition-report-print .requisition-print-card {
            border: none !important;
            box-shadow: none !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
            display: block !important;
          }

          body.requisition-report-print .requisition-print-card > div {
            page-break-inside: avoid;
          }

          body.requisition-report-print table {
            page-break-inside: avoid;
            border-collapse: collapse;
            width: 100%;
          }

          body.requisition-report-print thead {
            display: table-header-group;
            page-break-inside: avoid;
          }

          body.requisition-report-print tbody tr {
            page-break-inside: avoid;
          }

          body.requisition-report-print .requisition-signature-label {
            border-top: 1px solid #000 !important;
            color: #000 !important;
          }

          body.requisition-report-print .requisition-signature-value {
            color: #000 !important;
          }
        }
      `}</style>
      <div className="requisition-print-actions flex items-center justify-between mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate('/dashboard/requisition-report')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisition Report
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Requisition
        </Button>
      </div>

      <Card className="requisition-print-card max-w-5xl mx-auto border-2 border-black/70 rounded-sm bg-white print:shadow-none print:border-none print:page-break-inside-avoid">
        <CardContent className="p-0 print:page-break-inside-avoid print:min-h-[9.6in] print:flex print:flex-col">
          <div className="border-b-2 border-black/70 px-6 py-5 text-center print:py-3 print:px-4">
            <p className="text-xs tracking-[0.18em] uppercase text-gray-700">Election Commission of Pakistan</p>
            <h1 className="text-2xl font-semibold tracking-wide mt-1">REQUISITION REPORT</h1>
            <p className="text-xs mt-1 text-gray-700">Inventory Management System - Formal Slip</p>
          </div>

          <div className="px-6 py-4 border-b border-black/50 print:px-4 print:py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm print:gap-x-6 print:gap-y-1 print:text-sm">
              <div><span className="font-semibold">Requisition No:</span> {report.request_number || report.id.slice(0, 12)}</div>
              <div><span className="font-semibold">Generated On:</span> {todayText}</div>
              <div><span className="font-semibold">Submitted Date:</span> {formatDate(report.submitted_date, 'N/A')}</div>
              <div><span className="font-semibold">Request Type:</span> {report.request_type}</div>
              <div><span className="font-semibold">Requester:</span> {report.requester_name}</div>
              <div><span className="font-semibold">Designation:</span> {report.requester_designation || '-'}</div>
              <div><span className="font-semibold">Wing:</span> {report.wing_name || '-'}</div>
              <div className="md:col-span-2"><span className="font-semibold">Office:</span> {report.office_name || '-'}</div>
              <div className="md:col-span-2"><span className="font-semibold">Purpose:</span> {report.purpose || '-'}</div>
            </div>
          </div>

          <div className="px-6 py-4 print:px-4 print:py-2 print:page-break-inside-avoid">
            <table className="w-full text-sm border border-black/60 border-collapse print:text-xs">
              <thead className="print:page-break-inside-avoid">
                <tr className="bg-gray-100">
                  <th className="border border-black/60 px-2 py-2 w-12 text-center print:px-1 print:py-1">Sr.</th>
                  <th className="border border-black/60 px-2 py-2 text-left print:px-1 print:py-1">Item Description</th>
                  <th className="border border-black/60 px-2 py-2 w-36 text-left print:px-1 print:py-1">Last Issued Qty</th>
                  <th className="border border-black/60 px-2 py-2 w-36 text-left print:px-1 print:py-1">Last Issue Date</th>
                  <th className="border border-black/60 px-2 py-2 w-40 text-left print:px-1 print:py-1">Fresh Requirement</th>
                  <th className="border border-black/60 px-2 py-2 w-32 text-left print:px-1 print:py-1">Allotted Qty</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-black/60 px-2 py-2 text-center print:px-1 print:py-1">{index + 1}</td>
                    <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{item.item_name}</td>
                    <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{item.last_issued_quantity == null ? '-' : item.last_issued_quantity}</td>
                    <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{formatDate(item.last_issue_date, '-')}</td>
                    <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{item.requested_quantity} {item.unit}</td>
                    <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{item.allotted_quantity ?? 0} {item.unit}</td>
                  </tr>
                ))}
                {report.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-black/60 px-2 py-6 text-center text-gray-600 print:py-4">
                      No items available in this requisition.
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-semibold">
                  <td className="border border-black/60 px-2 py-2 text-center print:px-1 print:py-1" colSpan={4}>Total</td>
                  <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{totalFreshRequirement}</td>
                  <td className="border border-black/60 px-2 py-2 print:px-1 print:py-1">{totalAllottedQuantity}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 pb-8 pt-6 print:px-4 print:pb-2 print:pt-3 print:page-break-inside-avoid print:mt-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm print:grid-cols-3 print:gap-3 print:page-break-inside-avoid">
              <div className="text-center print:page-break-inside-avoid">
                <div className="requisition-signature-label border-t border-black/70 pt-2 print:pt-1">Requested By</div>
                <div className="requisition-signature-value mt-1 text-xs text-gray-600 print:mt-0 print:text-[10px]">{report.requester_name}</div>
                <div className="requisition-signature-value text-[11px] text-gray-500 print:text-[9px]">{report.requester_designation || '-'}</div>
              </div>
              <div className="text-center print:page-break-inside-avoid">
                <div className="requisition-signature-label border-t border-black/70 pt-2 print:pt-1">Allotted By</div>
                <div className="requisition-signature-value mt-1 text-xs text-gray-600 print:mt-0 print:text-[10px]">{report.allotted_by_name || '-'}</div>
              </div>
              <div className="text-center print:page-break-inside-avoid">
                <div className="requisition-signature-label border-t border-black/70 pt-2 print:pt-1">Approved By</div>
                <div className="requisition-signature-value mt-1 text-xs text-gray-600 print:mt-0 print:text-[10px]">{report.approved_by_name || '-'}</div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-600 mt-8 border-t border-dashed border-gray-400 pt-3 print:mt-2 print:pt-1 print:text-[9px]">
              This report is Computer Generated.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequisitionReportPage;
