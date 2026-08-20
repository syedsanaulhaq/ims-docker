import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Shield,
  ShieldCheck
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  status: string;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  items?: TenderItem[];
}

const EnhancedTenderDashboard: React.FC = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [finalizingTender, setFinalizingTender] = useState<string | null>(null);
  const navigate = useNavigate();

  // Separate tenders into finalized and non-finalized
  const nonFinalizedTenders = tenders.filter(tender => !tender.is_finalized);
  const finalizedTenders = tenders.filter(tender => tender.is_finalized);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tenders');
      if (!response.ok) {
        throw new Error(`Failed to fetch tenders: ${response.status}`);
      }
      
      const data = await response.json();
      setTenders(data);
    } catch (err) {
      console.error('❌ Error fetching tenders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const handleFinalizeTender = async (tenderId: string) => {
    try {
      setFinalizingTender(tenderId);
      
      const response = await fetch(`/api/tenders/${tenderId}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: 'current_user' // You can get this from your session/auth context
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to finalize tender: ${response.status}`);
      }

      const result = await response.json();
      // Refresh the tenders list
      await fetchTenders();
      
      alert('Tender finalized successfully and added to stock acquisition system!');
    } catch (err) {
      console.error('❌ Error finalizing tender:', err);
      alert(`Failed to finalize tender: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFinalizingTender(null);
    }
  };

  const handleViewDetails = async (tender: Tender) => {
    try {
      const response = await fetch(`/api/tenders/${tender.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tender details');
      }
      const detailedTender = await response.json();
      setSelectedTender(detailedTender);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching tender details:', err);
      alert('Failed to fetch tender details');
    }
  };

  const handleEdit = (tender: Tender) => {
    if (tender.is_finalized) {
      alert('Finalized tenders cannot be edited');
      return;
    }
    navigate(`/dashboard/tenders/edit/${tender.id}`);
  };

  const handleDelete = async (tenderId: string) => {
    const tender = tenders.find(t => t.id === tenderId);
    if (tender?.is_finalized) {
      alert('Finalized tenders cannot be deleted');
      return;
    }

    if (window.confirm('Are you sure you want to delete this tender?')) {
      try {
        const response = await fetch(`/api/tenders/${tenderId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setTenders(tenders.filter(t => t.id !== tenderId));
          alert('Tender deleted successfully');
        } else {
          throw new Error('Failed to delete tender');
        }
      } catch (err) {
        console.error('Error deleting tender:', err);
        alert('Failed to delete tender');
      }
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Finalized
      </Badge>;
    }
    
    const statusColors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'Published': 'bg-blue-100 text-blue-800 border-blue-200',
      'Open': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Closed': 'bg-red-100 text-red-800 border-red-200',
      'Awarded': 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        <Clock className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const filterTenders = (tenderList: Tender[]) => {
    return tenderList.filter(tender => {
      const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tender.reference_number && tender.reference_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (tender.vendor_name && tender.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const TenderTable = ({ tenderList, title, isFinalized }: { 
    tenderList: Tender[], 
    title: string, 
    isFinalized: boolean 
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isFinalized ? (
            <ShieldCheck className="w-5 h-5 text-green-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
          {title}
          <Badge variant="outline">{tenderList.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {isFinalized && <TableHead>Finalized</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenderList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isFinalized ? 8 : 7} className="text-center py-6 text-gray-500">
                    {isFinalized ? 'No finalized tenders found' : 'No active tenders found'}
                  </TableCell>
                </TableRow>
              ) : (
                tenderList.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="font-medium">
                      {tender.reference_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{tender.title}</div>
                    </TableCell>
                    <TableCell>{tender.vendor_name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(tender.estimated_value)}</TableCell>
                    <TableCell>{getStatusBadge(tender.status, tender.is_finalized)}</TableCell>
                    <TableCell>{formatDate(tender.created_at)}</TableCell>
                    {isFinalized && (
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(tender.finalized_at)}</div>
                          <div className="text-gray-500">by {tender.finalized_by || 'Unknown'}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(tender)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {!isFinalized && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(tender)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFinalizeTender(tender.id)}
                              disabled={finalizingTender === tender.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {finalizingTender === tender.id ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(tender.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading tenders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tender Management</h1>
          <p className="text-muted-foreground">
            Manage tenders and track finalization status
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/tenders/create')} className="gap-2">
          <Plus className="w-4 h-4" />
          Tender
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{nonFinalizedTenders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized Tenders</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{finalizedTenders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by title, reference, or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Awarded">Awarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tender Tables */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Tenders ({nonFinalizedTenders.length})
          </TabsTrigger>
          <TabsTrigger value="finalized" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Finalized Tenders ({finalizedTenders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <TenderTable 
            tenderList={filterTenders(nonFinalizedTenders)} 
            title="Active Tenders (Can be edited and finalized)"
            isFinalized={false}
          />
        </TabsContent>

        <TabsContent value="finalized">
          <TenderTable 
            tenderList={filterTenders(finalizedTenders)} 
            title="Finalized Tenders (Read-only, added to stock acquisition)"
            isFinalized={true}
          />
        </TabsContent>
      </Tabs>

      {/* Tender Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tender Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected tender
            </DialogDescription>
          </DialogHeader>
          
          {selectedTender && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Reference Number</label>
                  <p className="text-sm text-gray-600">{selectedTender.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm">{getStatusBadge(selectedTender.status, selectedTender.is_finalized)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p className="text-sm text-gray-600">{selectedTender.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Value</label>
                  <p className="text-sm text-gray-600">{formatCurrency(selectedTender.estimated_value)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created Date</label>
                  <p className="text-sm text-gray-600">{formatDate(selectedTender.created_at)}</p>
                </div>
                {selectedTender.is_finalized && (
                  <div>
                    <label className="text-sm font-medium">Finalized Date</label>
                    <p className="text-sm text-gray-600">{formatDate(selectedTender.finalized_at)}</p>
                  </div>
                )}
              </div>

              {selectedTender.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTender.description}</p>
                </div>
              )}

              {selectedTender.items && selectedTender.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Tender Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          {(selectedTender.tender_type || selectedTender.type) !== 'annual-tender' && (
                            <TableHead>Quantity</TableHead>
                          )}
                          <TableHead>Unit Price</TableHead>
                          {(selectedTender.tender_type || selectedTender.type) !== 'annual-tender' && (
                            <TableHead>Total</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTender.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.nomenclature}</TableCell>
                            {(selectedTender.tender_type || selectedTender.type) !== 'annual-tender' && (
                              <TableCell>{item.quantity}</TableCell>
                            )}
                            <TableCell>{formatCurrency(item.estimated_unit_price)}</TableCell>
                            {(selectedTender.tender_type || selectedTender.type) !== 'annual-tender' && (
                              <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedTenderDashboard;
