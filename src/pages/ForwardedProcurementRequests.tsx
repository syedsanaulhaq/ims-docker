import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowRight,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ForwardedItem {
  id: string;
  nomenclature: string;
  quantity_needed: number;
  unit: string;
  status: string;
  tender_id?: string;
  tender_type?: string;
  tender_reference?: string;
  notes?: string;
  created_at: string;
  item_code?: string;
}

interface ForwardedRequest {
  source_request_id: string;
  source_request_number: string;
  request_type: string;
  urgency_level: string;
  purpose?: string;
  submitted_at: string;
  requester_name?: string;
  wing_name?: string;
  branch_name?: string;
  office_name?: string;
  approval_status: string;
  forwarded_at: string;
  item_count: number;
  items: ForwardedItem[];
}

interface Stats {
  total_requests: number;
  total_items: number;
  Pending: number;
  'In Tender': number;
  Procured: number;
  Cancelled: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  Pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  'In Tender': { label: 'In Tender', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: FileText },
  Procured: { label: 'Procured', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
  Planned: { label: 'Planned', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: ShoppingCart }
};

const ForwardedProcurementRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ForwardedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({
    total_requests: 0,
    total_items: 0,
    Pending: 0,
    'In Tender': 0,
    Procured: 0,
    Cancelled: 0
  });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = `${getApiBaseUrl()}/api/required-items/forwarded${
        statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''
      }`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
        setStats(data.stats || {
          total_requests: 0,
          total_items: 0,
          Pending: 0,
          'In Tender': 0,
          Procured: 0,
          Cancelled: 0
        });
      } else {
        console.error('Failed to fetch forwarded procurement requests');
      }
    } catch (error) {
      console.error('Error fetching forwarded procurement requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (requestId: string) => {
    const next = new Set(expandedRequests);
    if (next.has(requestId)) {
      next.delete(requestId);
    } else {
      next.add(requestId);
    }
    setExpandedRequests(next);
  };

  const getStatusBadge = (status: string) => {
    const normalized = String(status || 'Pending');
    const config = statusConfig[normalized] || {
      label: normalized,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: AlertTriangle
    };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1 border`}>
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const getOverallStatusBadge = (status: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('procurement')) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1">
          <ShoppingCart size={12} />
          Forwarded to Procurement
        </Badge>
      );
    }
    if (normalized.includes('approved')) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
          <CheckCircle size={12} />
          Approved
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
        <ArrowRight size={12} />
        {normalized}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors: Record<string, string> = {
      Urgent: 'bg-red-100 text-red-800 border-red-300',
      High: 'bg-orange-100 text-orange-800 border-orange-300',
      Medium: 'bg-blue-100 text-blue-800 border-blue-300',
      Low: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return (
      <Badge className={`${colors[urgency] || colors.Medium} border`}>
        {urgency || 'Medium'}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = requests.filter(request => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (request.source_request_number || '').toLowerCase().includes(term) ||
      (request.requester_name || '').toLowerCase().includes(term) ||
      (request.wing_name || '').toLowerCase().includes(term) ||
      (request.branch_name || '').toLowerCase().includes(term) ||
      request.items.some(item =>
        (item.nomenclature || '').toLowerCase().includes(term) ||
        (item.item_code || '').toLowerCase().includes(term)
      )
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Forwarded to Procurement</h1>
            <p className="text-gray-600 mt-1">
              Track the status of requests you forwarded to procurement
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchRequests}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/dashboard/required-items')}
              className="flex items-center gap-2"
            >
              <ClipboardList size={16} />
              Required Items
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total Requests"
          value={stats.total_requests}
          icon={ShoppingCart}
          color="text-blue-600"
        />
        <StatCard
          title="Total Items"
          value={stats.total_items}
          icon={Package}
          color="text-purple-600"
        />
        <StatCard
          title="Pending"
          value={stats.Pending}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="In Tender"
          value={stats['In Tender']}
          icon={FileText}
          color="text-blue-600"
        />
        <StatCard
          title="Procured"
          value={stats.Procured}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Cancelled"
          value={stats.Cancelled}
          icon={XCircle}
          color="text-red-600"
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Tender">In Tender</option>
                <option value="Procured">Procured</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Planned">Planned</option>
              </select>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search by request number, requester, wing, branch, or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No forwarded procurement requests found</p>
            <p className="text-gray-400 text-sm mt-1">
              Requests marked as "Forward to Procurement" will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.source_request_id} className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {request.source_request_number || 'N/A'}
                      </CardTitle>
                      {getOverallStatusBadge(request.approval_status)}
                      {getUrgencyBadge(request.urgency_level)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                      {request.requester_name && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {request.requester_name}
                        </span>
                      )}
                      {request.wing_name && (
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {request.wing_name}
                        </span>
                      )}
                      {request.branch_name && (
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {request.branch_name}
                        </span>
                      )}
                      {request.office_name && (
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {request.office_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="text-right">
                      <p>Forwarded: {formatDate(request.forwarded_at)}</p>
                      <p>Items: {request.item_count}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(request.source_request_id)}
                      className="p-1"
                    >
                      {expandedRequests.has(request.source_request_id) ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </Button>
                  </div>
                </div>
                {request.purpose && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    <span className="font-medium">Purpose:</span> {request.purpose}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-4">
                {/* Mini item preview */}
                <div className="space-y-2">
                  {request.items.slice(0, expandedRequests.has(request.source_request_id) ? undefined : 2).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">
                            {item.nomenclature}
                          </span>
                          {item.item_code && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {item.item_code}
                            </Badge>
                          )}
                        </div>
                        {(item.notes || item.tender_reference) && (
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            {item.notes && <span className="mr-2">{item.notes}</span>}
                            {item.tender_reference && (
                              <span className="text-blue-600">Tender: {item.tender_reference}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 sm:mt-0 sm:ml-4">
                        <div className="text-sm text-gray-600 whitespace-nowrap">
                          <span className="font-medium">{item.quantity_needed}</span> {item.unit || 'pcs'}
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  ))}
                  {!expandedRequests.has(request.source_request_id) && request.items.length > 2 && (
                    <button
                      onClick={() => toggleExpand(request.source_request_id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + {request.items.length - 2} more item(s)
                    </button>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/request-details/${request.source_request_id}`)}
                  >
                    View Original Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value || 0}</p>
        </div>
        <Icon size={24} className="text-gray-300" />
      </div>
    </CardContent>
  </Card>
);

export default ForwardedProcurementRequests;
