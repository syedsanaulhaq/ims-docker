import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { 
  ClipboardList, 
  ArrowLeft,
  Database,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  Eye,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const StockOperations = () => {
  const navigate = useNavigate();
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected

  // Fetch stock operations data
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setDataLoading(true);
        const response = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`);
        const data = await response.json();
        
        // Handle the API response structure
        if (data.success && Array.isArray(data.data)) {
          setStockRequests(data.data);
        } else if (Array.isArray(data)) {
          setStockRequests(data);
        } else {
          setStockRequests([]);
        }
      } catch (error) {
        console.error('Error fetching stock operations data:', error);
        setStockRequests([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Filter and search stock requests
  const filteredRequests = stockRequests.filter(request => {
    const matchesSearch = request.purpose?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.request_type?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.request_number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requester?.full_name?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.office?.name?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.wing?.name?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'pending') {
      return matchesSearch && (request.request_status === 'Submitted' || request.request_status === 'Pending');
    } else if (filterStatus === 'approved') {
      return matchesSearch && request.request_status === 'Approved';
    } else if (filterStatus === 'rejected') {
      return matchesSearch && request.request_status === 'Rejected';
    }
    
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: stockRequests.length,
    pending: stockRequests.filter(r => r.request_status === 'Submitted' || r.request_status === 'Pending').length,
    approved: stockRequests.filter(r => r.request_status === 'Approved').length,
    rejected: stockRequests.filter(r => r.request_status === 'Rejected').length,
    thisMonth: stockRequests.filter(req => {
      const reqDate = new Date(req.created_at);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return reqDate.getMonth() === currentMonth && reqDate.getFullYear() === currentYear;
    }).length
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'submitted': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending':
      case 'submitted': return 'secondary';
      default: return 'outline';
    }
  };

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading stock operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-4">
            Stock Operations
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Comprehensive view of all stock requests and issuance activities
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Live Data Connected
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {filteredRequests.length} of {stats.total} Requests
            </Badge>
          </div>
        </div>
        
        {/* Create New Request Button */}
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/dashboard/stock-issuance')}
            className="flex items-center gap-2"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Stock Issuance Request
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-purple-700">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-orange-700">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-700">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-700">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-700">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by purpose, type, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All Requests
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('approved')}
                size="sm"
              >
                Approved
              </Button>
              <Button
                variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('rejected')}
                size="sm"
              >
                Rejected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Stock Requests ({filteredRequests.length})
          </CardTitle>
          <CardDescription>
            Detailed view of all stock issuance requests and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No requests found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{request.purpose || 'Stock Request'}</h3>
                          <Badge variant={getStatusBadgeVariant(request.request_status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(request.request_status)}
                              {request.request_status || 'Unknown'}
                            </div>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">
                              {request.request_type === 'Individual' ? 'Requester:' : 'Department:'}
                            </span>
                            <span className="font-medium">
                              {request.request_type === 'Individual' 
                                ? (request.requester?.full_name || 'N/A')
                                : (request.wing?.name || request.office?.name || 'N/A')
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{request.request_type || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">{formatDateDMY(request.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Priority:</span>
                            <span className="font-medium">{request.urgency_level || 'Normal'}</span>
                          </div>
                        </div>
                        {request.justification && (
                          <p className="text-sm text-gray-600 mt-2"><span className="font-medium">Justification:</span> {request.justification}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 md:w-auto">
                        <Button
                          onClick={() => navigate(`/dashboard/stock-operation-request-details/${request.id}`)}
                          variant="default"
                          size="sm"
                          className="w-full md:w-auto flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOperations;
