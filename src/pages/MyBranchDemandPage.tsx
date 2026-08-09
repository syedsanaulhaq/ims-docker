import React, { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertCircle, CheckCircle2, History } from 'lucide-react';

interface DemandRow {
  id: string;
  staff_user_id?: string;
  submission_group_id?: string;
  item_nomenclature: string;
  requested_quantity: number;
  unit_label?: string;
  justification?: string;
  status: string;
  created_at?: string;
}

interface DemandGroup {
  groupKey: string;
  title: string;
  justification: string;
  created_at?: string;
  status: string;
  items: DemandRow[];
  totalQuantity: number;
}

const parseApiJsonSafely = (raw: string) => {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approved') || normalized.includes('issued') || normalized.includes('included')) return 'bg-green-100 text-green-800 border-green-200';
  if (normalized.includes('reject')) return 'bg-red-100 text-red-800 border-red-200';
  if (normalized.includes('pending') || normalized.includes('submitted') || normalized.includes('forwarded')) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const toDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const MyBranchDemandPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DemandGroup | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands/my`, { credentials: 'include' });
      const raw = await response.text();
      const data = parseApiJsonSafely(raw);
      if (!response.ok) throw new Error(data?.error || 'Failed to load branch demands');
      setDemands((data.demands || []) as DemandRow[]);
      setSuccess('My Branch Demand loaded successfully.');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branch demands');
      setDemands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const demandGroups = useMemo(() => {
    const map = new Map<string, DemandRow[]>();
    for (const demand of demands) {
      const submittedAtSecond = String(demand.created_at || '').slice(0, 19);
      const key = demand.submission_group_id
        ? `submission-${demand.submission_group_id}`
        : `legacy-${demand.staff_user_id || 'current'}-${demand.justification || ''}-${submittedAtSecond}`;
      const list = map.get(key) || [];
      list.push(demand);
      map.set(key, list);
    }

    return Array.from(map.entries()).map(([groupKey, items]) => {
      const totalQuantity = items.reduce((sum, item) => sum + Number(item.requested_quantity || 0), 0);
      const head = items[0];
      return {
        groupKey,
        title: head?.justification || 'My Branch Demand',
        justification: head?.justification || '-',
        created_at: head?.created_at,
        status: head?.status || 'SUBMITTED',
        items,
        totalQuantity
      };
    }).sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime());
  }, [demands]);

  const summary = useMemo(() => ({
    totalDemands: demandGroups.length,
    totalItems: demands.reduce((sum, item) => sum + Number(item.requested_quantity || 0), 0),
    usedDemands: demands.filter((d) => String(d.status || '').toLowerCase().includes('included')).length,
    pendingDemands: demands.filter((d) => {
      const s = String(d.status || '').toLowerCase();
      return s.includes('submitted') || s.includes('pending');
    }).length,
  }), [demands, demandGroups.length]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Branch Demand</h1>
            <p className="text-gray-600 mt-1">Each row is one demand request from the current user. Click a row to see its items.</p>
          </div>
          <Button onClick={loadData} variant="outline" disabled={loading}><RefreshCcw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>

        {success && <Alert className="border-green-200 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}
        {error && <Alert className="border-red-200 bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800">{error}</AlertDescription></Alert>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalDemands}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Items in Demand</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-700">{summary.totalItems}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Used Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{summary.usedDemands}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-700">{summary.pendingDemands}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Demand Submissions</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading demands...</div>
            ) : demandGroups.length === 0 ? (
              <div className="text-sm text-gray-500">No demands found for the current user yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="text-left p-3 font-semibold">Demand Request</th>
                      <th className="text-left p-3 font-semibold">Justification</th>
                      <th className="text-left p-3 font-semibold">Date & Time</th>
                      <th className="text-left p-3 font-semibold">Items</th>
                      <th className="text-left p-3 font-semibold">Quantity</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandGroups.map((group) => (
                      <tr key={group.groupKey} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedGroup(group)}>
                        <td className="p-3">
                          <div className="font-semibold text-base break-words">{group.title}</div>
                        </td>
                        <td className="p-3 break-words">{group.justification}</td>
                        <td className="p-3">{toDateTime(group.created_at)}</td>
                        <td className="p-3">
                          <div className="font-semibold">{group.items.length}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{group.totalQuantity}</div>
                        </td>
                        <td className="p-3">
                          <Badge className={statusClass(group.status)}>{group.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedGroup && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup.title}</h2>
                  <p className="text-sm text-gray-600">{selectedGroup.justification}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedGroup(null)}>Close</Button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[65vh]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Item</th>
                      <th className="text-left p-3 font-semibold">Quantity</th>
                      <th className="text-left p-3 font-semibold">Unit</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="p-3 font-medium break-words">{item.item_nomenclature}</td>
                        <td className="p-3">{item.requested_quantity}</td>
                        <td className="p-3">{item.unit_label || 'No(s)'}</td>
                        <td className="p-3"><Badge className={statusClass(item.status || 'SUBMITTED')}>{item.status || 'SUBMITTED'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBranchDemandPage;