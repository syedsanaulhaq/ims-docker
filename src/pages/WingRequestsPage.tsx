import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, Filter, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
}

interface SubmittedRequest {
  id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  current_status: string;
  current_approver_name?: string;
  items: RequestItem[];
  total_items: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  office_name?: string;
  wing_name?: string;
  requester_name?: string;
}

const WingRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { user } = useSession();

  useEffect(() => {
    loadWingRequests();
  }, [user]);

  const loadWingRequests = async () => {
    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();
      
      // Fetch all stock issuance requests (wing supervisor can see all wing requests)
      const response = await fetch(`${apiBase}/stock-issuance/requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success || Array.isArray(data)) {
          const requestsData = Array.isArray(data) ? data : (data.data || []);
          // Map the stock issuance data to our request format
          const mappedRequests = requestsData.map((request: any) => ({
            id: request.id,
            request_type: request.request_type || 'Individual',
            title: request.purpose || 'Stock Issuance Request',
            description: request.justification || request.purpose || 'Request for inventory items',
            requested_date: request.created_at,
            submitted_date: request.submitted_at,
            current_status: request.request_status?.toLowerCase() || 'pending',
            current_approver_name: 'N/A',
            items: request.items?.map((item: any) => ({
              id: item.id,
              item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
              requested_quantity: item.requested_quantity || 1,
              approved_quantity: item.approved_quantity,
              unit: 'units'
            })) || [],
            total_items: request.items?.length || 0,
            priority: request.urgency_level || 'Medium',
            office_name: request.office?.name,
            wing_name: request.wing?.name,
            requester_name: request.requester?.full_name || request.requester_full_name || 'Unknown'
          }));
          
          setRequests(mappedRequests);
        } else {
          console.error('Failed to load requests:', data.error);
        }
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error loading wing requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'submitted': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      'finalized': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      'in_progress': { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: RefreshCw }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.wing_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.current_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime());

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/wing-dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wing Requests</h1>
            <p className="text-gray-600 mt-1">All stock requests from wing members</p>
          </div>
        </div>
        <Button onClick={loadWingRequests} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, requester, or wing..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 text-lg">No wing requests found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No requests have been submitted yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card 
              key={request.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-300"
              onClick={() => navigate(`/dashboard/request-details/${request.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Requester:</span> {request.requester_name}
                      </p>
                      {request.wing_name && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Wing:</span> {request.wing_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Items:</span> {request.total_items} item(s)
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted: {format(new Date(request.submitted_date), 'MMMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {getStatusBadge(request.current_status)}
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/request-details/${request.id}`);
                    }}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.current_status === 'pending' || r.current_status === 'submitted').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.current_status === 'approved').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.current_status === 'rejected').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WingRequestsPage;
