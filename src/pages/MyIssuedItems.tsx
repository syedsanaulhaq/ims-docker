import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Calendar, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Search,
  Download,
  Clock
} from 'lucide-react';
import { formatDateDMY } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';

interface IssuedItem {
  ledger_id: string;
  request_number: string;
  nomenclature: string;
  category_name: string;
  issued_quantity: number;
  unit_price: number;
  total_value: number;
  issued_at: string;
  issued_by_name: string;
  purpose: string;
  request_type: string;
  is_returnable: boolean;
  expected_return_date: string | null;
  actual_return_date: string | null;
  return_status: string;
  current_return_status: string;
  status: string;
  issuance_notes: string;
}

interface Summary {
  total_items: number;
  total_value: number;
  returnable_items: number;
  not_returned: number;
  overdue: number;
}

export default function MyIssuedItems() {
  const { user } = useSession();
  const [items, setItems] = useState<IssuedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<IssuedItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchMyIssuedItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus]);

  const fetchMyIssuedItems = async () => {
    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/stock-issuance/issued-items?user_id=${user?.user_id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch issued items');
      }

      const data = await response.json();
      setItems(data.items || data.data || []);
      setSummary(data.summary);
      
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error fetching issued items:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter(item => item.current_return_status === 'Overdue');
      } else if (filterStatus === 'returnable') {
        filtered = filtered.filter(item => item.is_returnable && item.return_status === 'Not Returned');
      } else {
        filtered = filtered.filter(item => item.status === filterStatus);
      }
    }

    setFilteredItems(filtered);
  };

  const getStatusBadge = (item: IssuedItem) => {
    if (item.current_return_status === 'Overdue') {
      return <Badge className="bg-red-500">Overdue</Badge>;
    }
    const status = item.status || (item as any).approval_status || 'Issued';
    if (item.current_return_status === 'Overdue') {
      return <Badge className="bg-red-500">Overdue</Badge>;
    }
    if (status === 'Returned') {
      return <Badge className="bg-green-500">Returned</Badge>;
    }
    if (status === 'Issued' || status === 'Approved by Admin' || status === 'Approved') {
      return <Badge className="bg-blue-500">In Use</Badge>;
    }
    if (status === 'Damaged') {
      return <Badge className="bg-orange-500">Damaged</Badge>;
    }
    if (status === 'Lost') {
      return <Badge className="bg-gray-500">Lost</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const getReturnStatusIcon = (status: string) => {
    switch (status) {
      case 'Returned':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Not Returned':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">My Issued Items</h1>
                <p className="text-slate-600 mt-2">Track all items currently issued to you from inventory.</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    <Package className="h-3 w-3 mr-1" /> Active Inventory
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    <Clock className="h-3 w-3 mr-1" /> Last Updated: {new Date().toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => window.history.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50" variant="destructive">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-slate-600">
                  <Package className="h-4 w-4" /> Total Items
                </CardDescription>
                <CardTitle className="text-3xl text-cyan-700">{summary.total_items}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">Items issued to your account</CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-slate-600">
                  <RotateCcw className="h-4 w-4" /> Returnable
                </CardDescription>
                <CardTitle className="text-3xl text-purple-700">{summary.returnable_items}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">Items expected to be returned</CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-slate-600">
                  <XCircle className="h-4 w-4" /> Not Returned
                </CardDescription>
                <CardTitle className="text-3xl text-slate-700">{summary.not_returned}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">Returnable items still in use</CardContent>
            </Card>

            <Card className={`border-l-4 ${summary.overdue > 0 ? 'border-l-red-500 bg-red-50/60' : 'border-l-rose-500'}`}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-slate-600">
                  <AlertTriangle className={`h-4 w-4 ${summary.overdue > 0 ? 'text-red-500' : 'text-rose-500'}`} /> Overdue
                </CardDescription>
                <CardTitle className={`text-3xl ${summary.overdue > 0 ? 'text-red-700' : 'text-rose-700'}`}>{summary.overdue}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">Items past expected return date</CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 border border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'Issued' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('Issued')}
                  size="sm"
                >
                  In Use
                </Button>
                <Button
                  variant={filterStatus === 'returnable' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('returnable')}
                  size="sm"
                >
                  Returnable
                </Button>
                <Button
                  variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('overdue')}
                  size="sm"
                  className={filterStatus === 'overdue' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  Overdue
                </Button>
                <Button
                  variant={filterStatus === 'Returned' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('Returned')}
                  size="sm"
                >
                  Returned
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Items ({filteredItems.length})</span>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request#</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item, idx) => (
                      <tr key={(item as any).id || item.ledger_id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-sm">{item.nomenclature}</div>
                            <div className="text-xs text-gray-500">{item.category_name}</div>
                            <div className="text-xs text-gray-400 mt-1">{item.purpose}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs">{item.request_number}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold">{item.issued_quantity}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold">₨ {(item.total_value || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDateDMY(item.issued_at || (item as any).created_at)}
                          </div>
                          {item.issued_by_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              By: {item.issued_by_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(item)}
                        </td>
                        <td className="px-4 py-4">
                          {item.is_returnable ? (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {getReturnStatusIcon(item.current_return_status)}
                                <span className="text-sm">{item.current_return_status}</span>
                              </div>
                              {item.expected_return_date && (
                                <div className="text-xs text-gray-500">
                                  Expected: {formatDateDMY(item.expected_return_date)}
                                </div>
                              )}
                              {item.actual_return_date && (
                                <div className="text-xs text-green-600">
                                  Returned: {formatDateDMY(item.actual_return_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not Returnable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
