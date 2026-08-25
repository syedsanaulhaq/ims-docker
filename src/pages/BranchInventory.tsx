import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Search,
  TrendingUp,
  Clock,
  Users,
  Building2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDateDMY } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BranchIssuedItem {
  ledger_id: string;
  request_number: string;
  item_code?: string;
  request_id?: string;
  nomenclature: string;
  category_name: string;
  issued_quantity: number;
  unit_price: number;
  total_value: number;
  issued_at: string;
  issued_by_name: string;
  issued_to_name: string;
  issued_to_id: string;
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


interface GroupedInventoryItem {
  id: string;
  item_code: string;
  nomenclature: string;
  category_name: string;
  total_issued_quantity: number;
  total_value: number;
  details: BranchIssuedItem[];
}

interface BranchSummary {
  total_items: number;
  unique_users: number;
  returnable_items: number;
  not_returned: number;
  overdue: number;
}

interface UserBreakdown {
  user_id: string;
  user_name: string;
  items_count: number;
  overdue_count: number;
}

export default function BranchInventory() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [items, setItems] = useState<BranchIssuedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BranchIssuedItem[]>([]);

  const [groupedItems, setGroupedItems] = useState<GroupedInventoryItem[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const getBranchId = () => Number((user as any)?.branch_id ?? (user as any)?.intBranchID ?? 0) || 0;

  useEffect(() => {
    // Admin can view all-branch inventory even without a personal branch id.
    if (user?.is_super_admin || getBranchId()) {
      fetchBranchInventory();
    }
  }, [user]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus, selectedUser]);

  const fetchBranchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Admin: pass 0; server ignores it and returns all branches.
      const branchParam = getBranchId() || '0';
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/branch-inventory/${branchParam}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branch inventory');
      }

      const data = await response.json();
      setItems(data.items || []);
      setSummary(data.summary);
      setUserBreakdown(data.userBreakdown || []);
      
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching branch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(item => item.issued_to_id === selectedUser);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.item_code && item.item_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.issued_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter(item => item.current_return_status === 'Overdue');
      } else if (filterStatus === 'returnable') {
        filtered = filtered.filter(item => item.is_returnable && item.return_status === 'Not Returned');
      } else if (filterStatus === 'returned') {
        filtered = filtered.filter(item => item.status?.toLowerCase() === 'returned');
      } else if (filterStatus === 'in-use') {
        filtered = filtered.filter(item => 
          ['issued', 'completed', 'dispatched'].includes(item.status?.toLowerCase()) && 
          item.return_status !== 'Returned'
        );
      }
    }

    
    setFilteredItems(filtered);

    // Grouping logic
    const grouped = filtered.reduce((acc, item) => {
      const key = item.item_code || item.nomenclature;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          item_code: item.item_code || '',
          nomenclature: item.nomenclature,
          category_name: item.category_name,
          total_issued_quantity: 0,
          total_value: 0,
          details: []
        };
      }
      acc[key].total_issued_quantity += Number(item.issued_quantity) || 0;
      acc[key].total_value += Number(item.total_value) || 0;
      acc[key].details.push(item);
      return acc;
    }, {} as Record<string, GroupedInventoryItem>);

    setGroupedItems(Object.values(grouped).sort((a, b) => b.total_issued_quantity - a.total_issued_quantity));
  };

  const getStatusBadge = (item: BranchIssuedItem) => {
    if (item.current_return_status === 'Overdue') {
      return <Badge className="bg-red-500">Overdue</Badge>;
    }
    if (item.status === 'Returned') {
      return <Badge className="bg-green-500">Returned</Badge>;
    }
    if (item.status === 'Issued') {
      return <Badge className="bg-blue-500">In Use</Badge>;
    }
    if (item.status === 'Damaged') {
      return <Badge className="bg-orange-500">Damaged</Badge>;
    }
    if (item.status === 'Lost') {
      return <Badge className="bg-gray-500">Lost</Badge>;
    }
    return <Badge>{item.status}</Badge>;
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
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Branch Inventory</h1>
            <p className="text-gray-500">Track all items issued to your branch/department</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/dashboard/stock-issuance-branch')} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Package className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_items}</div>
              <p className="text-xs text-gray-500 mt-1">Issued to branch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Branch Members</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unique_users}</div>
              <p className="text-xs text-gray-500 mt-1">With issued items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Returnable</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.returnable_items}</div>
              <p className="text-xs text-gray-500 mt-1">To be returned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Not Returned</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.not_returned}</div>
              <p className="text-xs text-gray-500 mt-1">Currently in use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.overdue}</div>
              <p className="text-xs text-gray-500 mt-1">Past return date</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Breakdown */}
      {userBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Branch Members Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userBreakdown.map((user) => (
                <div
                  key={user.user_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user.user_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">{user.user_name}</span>
                    </div>
                    {user.overdue_count > 0 && (
                      <Badge className="bg-red-500">{user.overdue_count} Overdue</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-semibold">{user.items_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by item name, request number, user, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="border rounded-md px-3 py-2 min-w-[200px]"
              >
                <option value="all">All Members</option>
                {userBreakdown.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_name} ({user.items_count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'in-use' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('in-use')}
              >
                In Use
              </Button>
              <Button
                variant={filterStatus === 'returnable' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('returnable')}
              >
                Returnable
              </Button>
              <Button
                variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('overdue')}
              >
                Overdue
              </Button>
              <Button
                variant={filterStatus === 'returned' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('returned')}
              >
                Returned
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Issued Items ({groupedItems.length} unique)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.id} className="border rounded-xl bg-white shadow-sm overflow-hidden mb-4">
                  {/* Group Header */}
                  <div 
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                    onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-100">
                        <Package className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-800">{group.nomenclature}</h3>
                          {group.item_code && (
                            <Badge variant="outline" className="font-mono text-xs text-blue-600 border-blue-200 bg-blue-50">
                              {group.item_code}
                            </Badge>
                          )}
                        </div>
                        {group.category_name && (
                          <div className="text-sm text-slate-500">{group.category_name}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                      <div className="text-left md:text-right">
                        <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Quantity</div>
                        <div className="text-2xl font-bold text-slate-800">{group.total_issued_quantity}</div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 transition-transform duration-200">
                        {expandedGroupId === group.id ? (
                          <ChevronUp className="h-5 w-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedGroupId === group.id && (
                    <div className="bg-slate-50/80 border-t p-4 space-y-4">
                      <h4 className="font-semibold text-sm text-slate-700 px-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Issuance History ({group.details.length} records)
                      </h4>
                      <div className="space-y-3">
                        {group.details.map((item) => (
                          <div key={item.ledger_id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                                  <span className="font-mono font-medium text-slate-800">Req: {item.request_number}</span>
                                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">
                                    {item.issued_to_name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDateDMY(item.issued_at)}
                                  </span>
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                                    Qty: {item.issued_quantity}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(item)}
                                {!!item.is_returnable && getReturnStatusIcon(item.current_return_status)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/dashboard/request-details/${item.request_id}`);
                                  }}
                                  className="h-8 ml-2 bg-white hover:bg-slate-50"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              </div>
                            </div>
                            
                            {!!item.is_returnable && (
                              <div className="mt-3 text-sm flex gap-4 text-slate-500 bg-slate-50 p-2 rounded-md">
                                <span><strong>Expected Return:</strong> {item.expected_return_date ? formatDateDMY(item.expected_return_date) : 'N/A'}</span>
                                {item.actual_return_date && (
                                  <span><strong>Actual Return:</strong> {formatDateDMY(item.actual_return_date)}</span>
                                )}
                              </div>
                            )}

                            {(item.purpose || item.issuance_notes) && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {item.purpose && (
                                  <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                                    <span className="font-semibold text-slate-600 block text-xs uppercase tracking-wider mb-1">Purpose</span>
                                    <p className="text-slate-700">{item.purpose}</p>
                                  </div>
                                )}
                                {item.issuance_notes && (
                                  <div className="bg-amber-50 p-2.5 rounded-md border border-amber-100">
                                    <span className="font-semibold text-amber-700 block text-xs uppercase tracking-wider mb-1">Notes</span>
                                    <p className="text-slate-700">{item.issuance_notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

