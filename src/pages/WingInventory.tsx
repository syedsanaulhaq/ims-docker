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
  Building2
} from 'lucide-react';
import { formatDateDMY } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WingIssuedItem {
  ledger_id: string;
  request_number: string;
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

interface WingSummary {
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

export default function WingInventory() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [items, setItems] = useState<WingIssuedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WingIssuedItem[]>([]);
  const [summary, setSummary] = useState<WingSummary | null>(null);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    // Admin can view all-wing inventory even without a personal wing_id
    if (user?.is_super_admin || user?.wing_id) {
      fetchWingInventory();
    }
  }, [user]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus, selectedUser]);

  const fetchWingInventory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Admin: pass '0' — server ignores param and returns all wings
      const wingParam = user?.wing_id || '0';
      const response = await fetch(`http://localhost:3001/api/wing-inventory/${wingParam}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wing inventory');
      }

      const data = await response.json();
      setItems(data.items || []);
      setSummary(data.summary);
      setUserBreakdown(data.userBreakdown || []);
      
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error fetching wing inventory:', err);
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
        filtered = filtered.filter(item => item.status === 'Returned');
      } else if (filterStatus === 'in-use') {
        filtered = filtered.filter(item => item.status === 'Issued' && item.return_status !== 'Returned');
      }
    }

    setFilteredItems(filtered);
  };

  const getStatusBadge = (item: WingIssuedItem) => {
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
            <h1 className="text-3xl font-bold">Wing Inventory</h1>
            <p className="text-gray-500">Track all items issued to your wing/department</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/procurement/new-request')} className="bg-teal-600 hover:bg-teal-700 text-white">
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
              <p className="text-xs text-gray-500 mt-1">Issued to wing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wing Members</CardTitle>
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
            <CardTitle>Wing Members Breakdown</CardTitle>
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
            Issued Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.ledger_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.nomenclature}</h3>
                      <p className="text-sm text-gray-500">Request: {item.request_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.category_name && (
                          <Badge variant="outline">
                            {item.category_name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="bg-blue-100">
                          <Users className="h-3 w-3 mr-1" />
                          {item.issued_to_name}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(item)}
                      {item.is_returnable && (
                        <div className="flex items-center gap-1">
                          {getReturnStatusIcon(item.current_return_status)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-semibold">{item.issued_quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Issued Date</p>
                      <p className="font-semibold">{formatDateDMY(item.issued_at)}</p>
                    </div>
                  </div>

                  {item.is_returnable && (
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                      <div>
                        <p className="text-gray-500">Expected Return</p>
                        <p className="font-semibold">
                          {item.expected_return_date ? formatDateDMY(item.expected_return_date) : 'N/A'}
                        </p>
                      </div>
                      {item.actual_return_date && (
                        <div>
                          <p className="text-gray-500">Actual Return</p>
                          <p className="font-semibold">{formatDateDMY(item.actual_return_date)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {item.purpose && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-gray-500 text-sm">Purpose</p>
                      <p className="text-sm mt-1">{item.purpose}</p>
                    </div>
                  )}

                  {item.issuance_notes && (
                    <div className="mt-2">
                      <p className="text-gray-500 text-sm">Notes</p>
                      <p className="text-sm mt-1">{item.issuance_notes}</p>
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
