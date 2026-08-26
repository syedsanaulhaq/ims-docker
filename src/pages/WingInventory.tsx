import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Eye,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';
import { formatDateDMY } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WingIssuedItem {
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
  total_returned_quantity: number;
  total_in_use_quantity: number;
  details: WingIssuedItem[];
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
  const [filteredGroups, setFilteredGroups] = useState<GroupedInventoryItem[]>([]);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  
  // Modal states
  const [selectedGroup, setSelectedGroup] = useState<GroupedInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user?.is_super_admin || user?.wing_id) {
      fetchWingInventory();
    }
  }, [user]);

  useEffect(() => {
    processAndFilterInventory();
  }, [items, searchTerm, filterStatus, selectedUser]);

  const fetchWingInventory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const wingParam = user?.wing_id || '0';
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/wing-inventory/${wingParam}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wing inventory');
      }

      const data = await response.json();
      setItems(data.items || []);
      setUserBreakdown(data.userBreakdown || []);
      
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error fetching wing inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const processAndFilterInventory = () => {
    // 1. Group all items by item_code or nomenclature first
    const groupedMap: Record<string, GroupedInventoryItem> = {};
    
    // Apply user filter on details before grouping
    let baseItems = items;
    if (selectedUser !== 'all') {
      baseItems = baseItems.filter(item => item.issued_to_id === selectedUser);
    }

    baseItems.forEach((item) => {
      const key = item.item_code || item.nomenclature;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          id: key,
          item_code: item.item_code || '',
          nomenclature: item.nomenclature,
          category_name: item.category_name || 'N/A',
          total_issued_quantity: 0,
          total_returned_quantity: 0,
          total_in_use_quantity: 0,
          details: []
        };
      }
      
      const qty = Number(item.issued_quantity) || 0;
      groupedMap[key].total_issued_quantity += qty;
      
      const isReturned = item.status === 'Returned' || item.current_return_status === 'Returned';
      if (isReturned) {
        groupedMap[key].total_returned_quantity += qty;
      } else {
        groupedMap[key].total_in_use_quantity += qty;
      }
      
      groupedMap[key].details.push(item);
    });

    // 2. Convert map to list and apply searches/filters
    const groupedList = Object.values(groupedMap);
    
    const filtered = groupedList.filter((group) => {
      // Search filter
      const matchesSearch = !searchTerm || 
        group.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.details.some(d => d.request_number.toLowerCase().includes(searchTerm.toLowerCase()) || d.issued_to_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus === 'all') return true;
      
      const hasOverdue = group.details.some(d => d.current_return_status === 'Overdue');
      const hasInUse = group.total_in_use_quantity > 0;
      const isAllReturned = group.total_issued_quantity > 0 && group.total_in_use_quantity === 0;

      if (filterStatus === 'overdue') return hasOverdue;
      if (filterStatus === 'in-use') return hasInUse && !hasOverdue;
      if (filterStatus === 'returned') return isAllReturned;

      return true;
    });

    // Sort by name
    filtered.sort((a, b) => a.nomenclature.localeCompare(b.nomenclature));
    setFilteredGroups(filtered);
  };

  // Summary Metrics calculations
  const getStats = () => {
    let totalItems = 0;
    let totalIssued = 0;
    let totalReturned = 0;
    let totalInUse = 0;
    let totalOverdue = 0;

    const uniqueItems = new Set<string>();

    items.forEach(item => {
      uniqueItems.add(item.item_code || item.nomenclature);
      const qty = Number(item.issued_quantity) || 0;
      totalIssued += qty;
      
      const isReturned = item.status === 'Returned' || item.current_return_status === 'Returned';
      if (isReturned) {
        totalReturned += qty;
      } else {
        totalInUse += qty;
      }

      if (item.current_return_status === 'Overdue') {
        totalOverdue += qty;
      }
    });

    totalItems = uniqueItems.size;

    return {
      totalItems,
      totalIssued,
      totalReturned,
      totalInUse,
      totalOverdue
    };
  };

  const stats = getStats();

  const getGroupStatusBadge = (group: GroupedInventoryItem) => {
    const hasOverdue = group.details.some(d => d.current_return_status === 'Overdue');
    if (hasOverdue) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Overdue</Badge>;
    }
    if (group.total_in_use_quantity > 0) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Use</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-300">Returned</Badge>;
  };

  const getLastUpdated = (group: GroupedInventoryItem) => {
    if (!group.details || group.details.length === 0) return 'N/A';
    try {
      const dates = group.details.map(d => new Date(d.issued_at).getTime()).filter(t => !isNaN(t));
      if (dates.length === 0) return 'N/A';
      return formatDateDMY(new Date(Math.max(...dates)).toISOString());
    } catch {
      return 'N/A';
    }
  };

  const handleOpenDetails = (group: GroupedInventoryItem) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-2">Loading wing inventory quantities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-teal-600" />
              Wing Inventory
            </h1>
            <p className="text-gray-600">Track and manage items issued to your department / wing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchWingInventory} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/dashboard/stock-issuance-wing')} className="bg-teal-600 hover:bg-teal-700 text-white">
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Issued</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalIssued}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">In Possession</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalInUse}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Returned</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalReturned}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Overdue Items</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalOverdue}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wing Members Breakdown */}
      {userBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Wing Members Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userBreakdown.map((member) => (
                <div
                  key={member.user_id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${selectedUser === member.user_id ? 'border-teal-500 bg-teal-50/30' : ''}`}
                  onClick={() => setSelectedUser(selectedUser === member.user_id ? 'all' : member.user_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">{member.user_name}</span>
                    </div>
                    {member.overdue_count > 0 && (
                      <Badge className="bg-red-500 text-white">{member.overdue_count} Overdue</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Items Count</p>
                      <p className="font-semibold">{member.items_count}</p>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by item code, name, category, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="in-use">In Use</option>
                <option value="returned">Returned</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="min-w-[180px]">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="all">All Members</option>
                {userBreakdown.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_name} ({member.items_count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flat Inventory Table */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-teal-600" />
              <p>No inventory items found</p>
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search criteria</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Inventory Stock Quantities</span>
              <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">{filteredGroups.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">Issued</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider">Returned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider font-bold">In Possession</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{group.nomenclature}</div>
                          <div className="text-sm text-gray-500">{group.item_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{group.category_name}</td>
                      <td className="px-4 py-4 text-right text-sm text-purple-600 font-semibold">
                        {group.total_issued_quantity}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-blue-600 font-semibold">
                        {group.total_returned_quantity}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-green-600 font-bold">
                        {group.total_in_use_quantity}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getGroupStatusBadge(group)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {getLastUpdated(group)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDetails(group)} aria-label="Open item details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Details Modal */}
      {selectedGroup && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-1">
                <span className="text-xl font-bold text-gray-900">{selectedGroup.nomenclature}</span>
                {selectedGroup.item_code && (
                  <span className="text-sm text-gray-500 font-mono">Code: {selectedGroup.item_code}</span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Issuance & Return History ({selectedGroup.details.length} records)
              </h3>
              
              <div className="space-y-3">
                {selectedGroup.details.map((item) => {
                  const isItemReturned = item.status === 'Returned' || item.current_return_status === 'Returned';
                  return (
                    <div key={item.ledger_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                            <span className="font-mono font-semibold text-gray-800">Req: {item.request_number}</span>
                            <span className="flex items-center gap-1 font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-xs border border-teal-100">
                              Issued to: {item.issued_to_name || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDateDMY(item.issued_at)}
                            </span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                              Qty: {item.issued_quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isItemReturned ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">Returned</Badge>
                          ) : item.current_return_status === 'Overdue' ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300">Overdue</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Use</Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsModalOpen(false);
                              navigate(`/dashboard/request-details/${item.request_id}`);
                            }}
                            className="h-8 ml-2"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Request
                          </Button>
                        </div>
                      </div>
                      
                      {!!item.is_returnable && (
                        <div className="mt-3 text-xs flex gap-4 text-gray-500 bg-gray-50 p-2 rounded">
                          <span><strong>Expected Return:</strong> {item.expected_return_date ? formatDateDMY(item.expected_return_date) : 'N/A'}</span>
                          {item.actual_return_date && (
                            <span><strong>Actual Return:</strong> {formatDateDMY(item.actual_return_date)}</span>
                          )}
                        </div>
                      )}

                      {(item.purpose || item.issuance_notes) && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {item.purpose && (
                            <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                              <span className="font-semibold text-gray-600 block text-xs uppercase tracking-wider mb-1">Purpose</span>
                              <p className="text-gray-700">{item.purpose}</p>
                            </div>
                          )}
                          {item.issuance_notes && (
                            <div className="bg-amber-50 p-2.5 rounded border border-amber-100">
                              <span className="font-semibold text-amber-800 block text-xs uppercase tracking-wider mb-1">Notes</span>
                              <p className="text-gray-700">{item.issuance_notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
