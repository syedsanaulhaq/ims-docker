import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Plus, Eye, Edit, Trash2, FileText, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenderItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface Tender {
  id: string;
  reference_number: string | null;
  title: string;
  description?: string;
  estimated_value?: number;
  publish_date?: string;
  submission_deadline?: string;
  opening_date?: string;
  status: string | null;
  tender_type?: string;
  tender_status?: string;
  document_path?: string;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
  items?: TenderItem[];
}

interface TenderDashboardProps {
  onCreateTender?: () => void;
  onEditTender?: (tender: Tender) => void;
  tenderTypeFilter?: 'contract' | 'spot-purchase' | null;
  dashboardTitle?: string;
}

const TenderDashboard: React.FC<TenderDashboardProps> = ({
  onCreateTender,
  onEditTender,
  tenderTypeFilter = null,
  dashboardTitle = "Tender Management"
}) => {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch detailed tender with items
  const fetchTenderDetails = async (tenderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tender = await response.json();
      setSelectedTender(tender);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching tender details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tender details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenders from API
  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/tenders');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Handle direct array response from backend
      if (Array.isArray(data)) {
        setTenders(data);
      } else if (data.success) {
        // Handle wrapped response format if backend changes
        setTenders(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch tenders');
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete tender
  const deleteTender = async (tenderId: string) => {
    if (!confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Remove tender from state
        setTenders(prev => prev.filter(t => t.id !== tenderId));
        alert('Tender deleted successfully');
      } else {
        throw new Error(data.error || 'Failed to delete tender');
      }
    } catch (err) {
      console.error('Error deleting tender:', err);
      alert('Failed to delete tender: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Finalize tender
  const finalizeTender = async (tenderId: string) => {
    if (!confirm('Are you sure you want to finalize this tender? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update tender in state
        setTenders(prev => prev.map(t => 
          t.id === tenderId ? { ...t, is_finalized: true } : t
        ));
        alert('Tender finalized successfully');
      } else {
        throw new Error(data.error || 'Failed to finalize tender');
      }
    } catch (err) {
      console.error('Error finalizing tender:', err);
      alert('Failed to finalize tender: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle opening create modal - navigate to create page
  const handleOpenCreateModal = () => {
    if (onCreateTender) {
      onCreateTender();
    } else {
      const typeParam = tenderTypeFilter ? `?type=${tenderTypeFilter}` : '';
      navigate(`/dashboard/create-tender${typeParam}`);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  // Filter tenders based on search and filters
  const filteredTenders = tenders.filter(tender => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (tender.title || '').toLowerCase().includes(searchLower) ||
      (tender.reference_number || '').toLowerCase().includes(searchLower) ||
      (tender.description || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    const matchesType = typeFilter === 'all' || tender.tender_type === typeFilter;
    
    // Apply tender type filter if specified
    const matchesTenderTypeFilter = !tenderTypeFilter || tender.tender_type === tenderTypeFilter;

    return matchesSearch && matchesStatus && matchesType && matchesTenderTypeFilter;
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string | null | undefined) => {
    if (!status) {
      return 'secondary'; // Default variant for null/undefined status
    }
    
    switch (status.toLowerCase()) {
      case 'draft':
        return 'secondary';
      case 'published':
        return 'default';
      case 'closed':
        return 'destructive';
      case 'awarded':
        return 'default'; // Changed from 'success' to 'default'
      default:
        return 'outline';
    }
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tenders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
          <p className="text-muted-foreground">
            {tenderTypeFilter === 'contract' 
              ? 'Manage contract tenders and track their progress'
              : tenderTypeFilter === 'spot-purchase'
              ? 'Manage Petty Purchase tenders and quick procurement'
              : 'Manage procurement tenders and track their progress'
            }
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Tender
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {tenderTypeFilter === 'contract' ? 'Contract Tenders' 
               : tenderTypeFilter === 'spot-purchase' ? 'Petty Purchases'
               : 'Total Tenders'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTenders.length}</div>
            <p className="text-xs text-muted-foreground">
              {tenderTypeFilter ? `${tenderTypeFilter} tenders` : 'All tenders in system'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTenders.filter(t => !t.is_finalized && (t.status === 'published' || t.status === 'draft')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized Tenders</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTenders.filter(t => t.is_finalized).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed tenders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated Value</CardTitle>
            <span className="text-lg">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(filteredTenders.reduce((sum, tender) => sum + (tender.estimated_value || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined tender value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenders by title, reference number, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="open">Open Tender</SelectItem>
                <SelectItem value="limited">Limited Tender</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="framework">Framework Agreement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tenders ({filteredTenders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTenders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tenders.length === 0 ? 'No tenders found' : 'No tenders match your search criteria'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Estimated Value</TableHead>
                  <TableHead>Submission Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenders.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="font-medium">
                      {tender.reference_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tender.title}</div>
                        {tender.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {tender.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tender.tender_type || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(tender.estimated_value)}
                    </TableCell>
                    <TableCell>
                      {tender.submission_deadline ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(tender.submission_deadline), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(tender.status)}>
                          {tender.status || 'N/A'}
                        </Badge>
                        {tender.is_finalized && (
                          <Badge variant="outline">Finalized</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchTenderDetails(tender.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tender.is_finalized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/create-po?tenderId=${tender.id}`)}
                            title="Create Purchase/Supply Orders from this tender"
                          >
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTender?.(tender)}
                          disabled={tender.is_finalized}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!tender.is_finalized && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => finalizeTender(tender.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTender(tender.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tender Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tender Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected tender and its items
            </DialogDescription>
          </DialogHeader>
          {selectedTender && (
            <div className="space-y-6">
              {/* Basic Tender Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tender Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reference Number</label>
                      <p className="text-sm font-semibold">
                        {selectedTender.reference_number || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Title</label>
                      <p className="text-sm font-semibold">{selectedTender.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-sm font-semibold">
                        {selectedTender.tender_type || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div>
                        <Badge variant={getStatusBadgeVariant(selectedTender.status)}>
                          {selectedTender.status || 'N/A'}
                        </Badge>
                        {selectedTender.is_finalized && (
                          <Badge variant="secondary" className="ml-2">
                            Finalized
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Estimated Value</label>
                      <p className="text-sm font-semibold">
                        {formatCurrency(selectedTender.estimated_value)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Publish Date</label>
                      <p className="text-sm font-semibold">
                        {selectedTender.publish_date ? 
                          format(new Date(selectedTender.publish_date), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submission Deadline</label>
                      <p className="text-sm font-semibold">
                        {selectedTender.submission_deadline ? 
                          format(new Date(selectedTender.submission_deadline), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Opening Date</label>
                      <p className="text-sm font-semibold">
                        {selectedTender.opening_date ? 
                          format(new Date(selectedTender.opening_date), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-sm font-semibold">
                        {format(new Date(selectedTender.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {selectedTender.description && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">
                        {selectedTender.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tender Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Tender Items ({selectedTender.items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTender.items && selectedTender.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            {selectedTender.tender_type !== 'annual-tender' && (
                              <TableHead>Quantity</TableHead>
                            )}
                            <TableHead>Unit Price</TableHead>
                            {selectedTender.tender_type !== 'annual-tender' && (
                              <TableHead>Total Amount</TableHead>
                            )}
                            <TableHead>Specifications</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTender.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.nomenclature}</p>
                                  <p className="text-xs text-gray-500">ID: {item.item_master_id}</p>
                                </div>
                              </TableCell>
                              {selectedTender.tender_type !== 'annual-tender' && (
                                <TableCell className="font-medium">
                                  {item.quantity?.toLocaleString() || 'N/A'}
                                </TableCell>
                              )}
                              <TableCell>
                                {formatCurrency(item.estimated_unit_price)}
                              </TableCell>
                              {selectedTender.tender_type !== 'annual-tender' && (
                                <TableCell className="font-medium">
                                  {formatCurrency(item.total_amount)}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="max-w-xs">
                                  {item.specifications ? (
                                    <p className="text-xs truncate" title={item.specifications}>
                                      {item.specifications}
                                    </p>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  {item.remarks ? (
                                    <p className="text-xs truncate" title={item.remarks}>
                                      {item.remarks}
                                    </p>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Summary */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Total Items</p>
                            <p className="text-lg font-bold">
                              {selectedTender.items.length}
                            </p>
                          </div>
                          {selectedTender.tender_type !== 'annual-tender' && (
                            <div>
                              <p className="text-sm text-gray-600">Total Quantity</p>
                              <p className="text-lg font-bold">
                                {selectedTender.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Total Estimated Value</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(selectedTender.items.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Average Unit Price</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(
                                selectedTender.items.filter(item => item.estimated_unit_price).length > 0
                                  ? selectedTender.items.reduce((sum, item) => sum + (item.estimated_unit_price || 0), 0) /
                                    selectedTender.items.filter(item => item.estimated_unit_price).length
                                  : 0
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No items found for this tender</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onEditTender?.(selectedTender)}
                    disabled={selectedTender.is_finalized}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Tender
                  </Button>
                  {!selectedTender.is_finalized && (
                    <Button
                      variant="outline"
                      onClick={() => finalizeTender(selectedTender.id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Finalize Tender
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenderDashboard;
