import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getApiBaseUrl } from '@/services/invmisApi';
import { getRequestTypeLabel } from '@/utils/requestTypeLabel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Clock,
  CheckCircle,
  Package,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { StockIssuanceRequestForm } from '@/components/stock/StockIssuanceRequestForm';
import stockIssuanceService, { StockIssuanceFilters } from '@/services/stockIssuanceService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  issuedRequests: number;
}

interface StockIssuanceRequest {
  id: string;
  request_number: string;
  request_type: string;
  request_status: string;
  urgency_level: string;
  purpose: string;
  submitted_at: string;
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
  requester: {
    full_name: string;
    role: string;
  };
  office: {
    name: string;
    office_code: string;
  };
  wing: {
    name: string;
    short_name: string;
  };
  branch: {
    dec_name: string;
    dec_acronym: string;
  };
  items: Array<{
    nomenclature: string;
    requested_quantity: number;
    item_status: string;
  }>;
}

export function StockIssuanceDashboard() {
  const { user } = useSession();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requests, setRequests] = useState<StockIssuanceRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    issuedRequests: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<StockIssuanceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  
  // Finalize functionality state
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [requestToFinalize, setRequestToFinalize] = useState<StockIssuanceRequest | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Try direct API call first
      const directResponse = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
        credentials: 'include',
      });
      if (!directResponse.ok) {
        throw new Error(`API request failed: ${directResponse.status}`);
      }
      
      const directData = await directResponse.json();
      if (directData.success && directData.data && directData.summary) {
        // Filter requests to only show those created by the logged-in user
        const userRequests = (directData.data || []).filter((req: any) => {
          const isUserRequest = req.requester?.user_id === user?.user_id;
          return isUserRequest;
        });
        
        setRequests(userRequests);
        
        // Calculate stats based on filtered user requests
        const userStats = {
          totalRequests: userRequests.length,
          pendingRequests: userRequests.filter((r: any) => r.request_status === 'Submitted' || r.request_status === 'Pending').length,
          approvedRequests: userRequests.filter((r: any) => r.request_status === 'Approved').length,
          issuedRequests: userRequests.filter((r: any) => r.request_status === 'Issued').length
        };
        
        setStats(userStats);
        
        } else {
        console.error('❌ Invalid API response structure:', directData);
        throw new Error('Invalid API response structure');
      }
      
      } catch (error) {
      console.error('❌ Error loading stock issuance dashboard data:', error);
      toast({
        title: 'Error',
        description: `Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = (newRequest: any) => {
    setShowCreateForm(false);
    loadData(); // Reload data
    toast({
      title: 'Success',
      description: `Request ${newRequest.request_number} created successfully!`,
    });
  };

  const getStatusBadge = (status: string) => {
    // Map database status to user-friendly display labels
    const statusMapping = {
      'Submitted': { label: 'Pending', variant: 'outline' as const, color: 'blue' },
      'Under Review': { label: 'Under Review', variant: 'secondary' as const, color: 'yellow' },
      'Approved': { label: 'Approved', variant: 'default' as const, color: 'green' },
      'Partially Approved': { label: 'Partially Approved', variant: 'secondary' as const, color: 'orange' },
      'Rejected': { label: 'Rejected', variant: 'destructive' as const, color: 'red' },
      'Issued': { label: 'Issued', variant: 'default' as const, color: 'purple' },
      'Completed': { label: 'Completed', variant: 'outline' as const, color: 'gray' },
      'Pending': { label: 'Pending', variant: 'outline' as const, color: 'blue' },
    };

    const config = statusMapping[status as keyof typeof statusMapping] || statusMapping['Submitted'];
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Helper function to get display label for status
  const getStatusLabel = (status: string): string => {
    const statusMapping = {
      'Submitted': 'Pending',
      'Under Review': 'Under Review',
      'Approved': 'Approved',
      'Partially Approved': 'Partially Approved',
      'Rejected': 'Rejected',
      'Issued': 'Issued',
      'Completed': 'Completed',
      'Pending': 'Pending',
    };
    
    return statusMapping[status as keyof typeof statusMapping] || status;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      'Low': { variant: 'secondary' as const },
      'Normal': { variant: 'outline' as const },
      'High': { variant: 'default' as const },
      'Critical': { variant: 'destructive' as const },
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig['Normal'];
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {urgency}
      </Badge>
    );
  };

  // Finalize request function
  const handleFinalizeRequest = async (request: StockIssuanceRequest) => {
    setRequestToFinalize(request);
    setShowFinalizeDialog(true);
  };

  const confirmFinalize = async () => {
    if (!requestToFinalize) return;

    setIsFinalizing(true);
    try {
      const response = await fetch(`/api/stock-issuance/requests/${requestToFinalize.id}/finalize`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: 'system', // You can get this from user context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize request');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `Request ${requestToFinalize.request_number} has been finalized successfully!`,
      });

      // Refresh data and close dialog
      loadData();
      setShowFinalizeDialog(false);
      setRequestToFinalize(null);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to finalize request',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Check if request can be finalized
  const canFinalize = (request: StockIssuanceRequest) => {
    const validStatuses = ['Approved', 'Issued'];
    return validStatuses.includes(request.request_status) && !request.is_finalized;
  };

  if (showCreateForm) {
    return (
      <StockIssuanceRequestForm
        onSuccess={handleCreateSuccess}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Issuance</h1>
          <p className="text-muted-foreground">
            Manage stock issuance requests through organizational hierarchy
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/dashboard/stock-issuance-personal')} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Personal Request
          </Button>
          <Button onClick={() => navigate('/dashboard/stock-issuance-wing')} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Wing Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedRequests}</div>
            <p className="text-xs text-muted-foreground">Ready for issuance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.issuedRequests}</div>
            <p className="text-xs text-muted-foreground">Items distributed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status || 'ALL_STATUSES'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'ALL_STATUSES' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_STATUSES">All Statuses</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Issued">Issued</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.urgency_level || 'ALL_URGENCIES'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, urgency_level: value === 'ALL_URGENCIES' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_URGENCIES">All Urgencies</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.request_type || 'ALL_TYPES'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, request_type: value === 'ALL_TYPES' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_TYPES">All Types</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Organizational">Organizational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Personal Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Requests (Individual)</CardTitle>
          <CardDescription>
            Stock issuance requests for individual use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (!requests || requests.filter(r => r.request_type === 'Individual').length === 0) ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No personal requests found</h3>
              <p className="text-muted-foreground mb-4">
                No personal stock issuance requests match your current filters.
              </p>
              <Button onClick={() => navigate('/dashboard/stock-issuance-personal')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Personal Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests
                    .filter(r => r.request_type === 'Individual')
                    .filter(req => 
                      !searchTerm || 
                      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      req.purpose.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.request_number}</TableCell>
                        <TableCell>{request.requester.full_name}</TableCell>
                        <TableCell>{getStatusBadge(request.request_status)}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency_level)}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                        <TableCell>{format(new Date(request.submitted_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/stock-issuance/${request.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wing Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wing Requests (Organizational)</CardTitle>
          <CardDescription>
            Stock issuance requests for organizational/department use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (!requests || requests.filter(r => r.request_type === 'Organizational').length === 0) ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No wing requests found</h3>
              <p className="text-muted-foreground mb-4">
                No organizational stock issuance requests match your current filters.
              </p>
              <Button onClick={() => navigate('/dashboard/stock-issuance-wing')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Wing Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requests || [])
                    .filter(r => r.request_type === 'Organizational')
                    .filter(req => 
                      !searchTerm || 
                      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      req.purpose.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.request_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {request.request_type === 'Individual' ? (
                            <>
                              <span className="font-medium">{request.requester?.full_name || 'Unknown User'}</span>
                              <span className="text-sm text-muted-foreground">{request.requester?.role || 'N/A'}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{request.wing?.name || request.wing?.short_name || 'Unknown Wing'}</span>
                              <span className="text-sm text-muted-foreground">Organizational Request</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{request.office?.name || 'Unknown Office'}</span>
                          <span className="text-muted-foreground">
                            {request.wing?.name || 'Unknown Wing'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={request.purpose}>
                          {request.purpose}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{(request.items || []).length} item(s)</span>
                          <span className="text-muted-foreground">
                            {(request.items || []).reduce((sum, item) => sum + item.requested_quantity, 0)} total qty
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.request_status)}
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(request.urgency_level)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.submitted_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRequestDialog(true);
                            }}
                          >
                            View
                          </Button>
                          
                          {/* Finalize Button */}
                          {canFinalize(request) && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleFinalizeRequest(request)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Finalize
                            </Button>
                          )}
                          
                          {/* Show finalized status */}
                          {request.is_finalized && (
                            <Badge variant="secondary" className="text-xs">
                              Finalized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Issuance Request Details</DialogTitle>
            <DialogDescription>
              Request #{selectedRequest?.request_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Request Type</label>
                  <p className="text-sm">{getRequestTypeLabel(selectedRequest.request_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.request_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Urgency</label>
                  <div className="mt-1">{getUrgencyBadge(selectedRequest.urgency_level)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted Date</label>
                  <p className="text-sm">{format(new Date(selectedRequest.submitted_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Requester Information */}
              <div>
                <h4 className="font-medium mb-3">Requester Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Requester</label>
                    <p className="text-sm">
                      {selectedRequest.request_type === 'Individual' 
                        ? selectedRequest.requester?.full_name || 'Unknown User'
                        : selectedRequest.wing?.name || selectedRequest.wing?.short_name || 'Unknown Wing'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Office</label>
                    <p className="text-sm">{selectedRequest.office?.name || 'Unknown Office'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Wing</label>
                    <p className="text-sm">{selectedRequest.wing?.name || 'Unknown Wing'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Branch/DEC</label>
                    <p className="text-sm">{selectedRequest.branch?.dec_name || selectedRequest.wing?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h4 className="font-medium mb-3">Request Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Purpose</label>
                    <p className="text-sm">{selectedRequest.purpose}</p>
                  </div>
                  {selectedRequest.justification && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Justification</label>
                      <p className="text-sm">{selectedRequest.justification}</p>
                    </div>
                  )}
                  {selectedRequest.expected_return_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Return Date</label>
                      <p className="text-sm">{format(new Date(selectedRequest.expected_return_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Returnable</label>
                    <p className="text-sm">{selectedRequest.is_returnable ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Requested Items ({selectedRequest.items.length})</h4>
                  <div className="space-y-2">
                    {selectedRequest.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.nomenclature}</p>
                          <p className="text-xs text-gray-500">
                            Status: <Badge variant="outline" className="text-xs">{item.item_status || 'Pending'}</Badge>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Requested: {item.requested_quantity}</p>
                          {item.approved_quantity && (
                            <p className="text-xs text-green-600">Approved: {item.approved_quantity}</p>
                          )}
                          {item.issued_quantity && (
                            <p className="text-xs text-blue-600">Issued: {item.issued_quantity}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Stock Issuance Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize this stock issuance request?
            </DialogDescription>
          </DialogHeader>
          
          {requestToFinalize && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Request Details</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Request Number:</span> {requestToFinalize.request_number}</p>
                  <p><span className="font-medium">Current Status:</span> {getStatusLabel(requestToFinalize.request_status)}</p>
                  <p><span className="font-medium">Requester:</span> {requestToFinalize.requester?.full_name}</p>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Once finalized, this request cannot be modified further.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFinalizeDialog(false)}
                  disabled={isFinalizing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmFinalize}
                  disabled={isFinalizing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isFinalizing ? 'Finalizing...' : 'Finalize Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
