import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ShieldCheck,
  ShoppingCart
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
import { PermissionGate } from '@/components/PermissionGate';
import TenderVendorManagement from '@/components/tenders/TenderVendorManagement';

interface TenderItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  brand?: string;
  model?: string;
  warranty_duration?: number;
  technical_requirements?: string;
  delivery_timeline?: string;
}

interface Tender {
  id: string;
  title: string;
  description?: string;
  reference_number: string;
  tender_type: string;
  submission_deadline: string;
  publish_date?: string;
  estimated_value: number;
  status: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  items?: TenderItem[];
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface ContractTenderProps {
  initialType?: 'Contract/Tender' | 'Petty Purchase' | 'Annual Tender';
}

const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [finalizingTender, setFinalizingTender] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Determine tender type from prop or query param
  const queryType = searchParams.get('type');
  let effectiveType = initialType;
  if (queryType === 'annual-tender') {
    effectiveType = 'Annual Tender';
  } else if (queryType === 'spot-purchase') {
    effectiveType = 'Petty Purchase';
  } else if (queryType === 'contract') {
    effectiveType = 'Contract/Tender';
  }

  const isSpotPurchase = effectiveType === 'Petty Purchase';
  const isAnnualTender = effectiveType === 'Annual Tender';
  const dashboardTitle = isSpotPurchase ? 'Petty Purchase Management' : isAnnualTender ? 'Annual Tender Management' : 'Contract/Tender Management';
  
  // Separate tenders into finalized and non-finalized
  const nonFinalizedTenders = tenders.filter(tender => !tender.is_finalized);
  const finalizedTenders = tenders.filter(tender => tender.is_finalized);

  // Fetch tenders from the backend
  const fetchTenders = async (includeDeleted = false) => {
    try {
      setLoading(true);
      const url = includeDeleted 
        ? 'http://localhost:3001/api/tenders?includeDeleted=true'
        : 'http://localhost:3001/api/tenders';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter by tender type if needed
      let filteredTenders;
      if (isSpotPurchase) {
        filteredTenders = data.filter((t: Tender) => t.tender_type === 'spot-purchase');
      } else if (isAnnualTender) {
        filteredTenders = data.filter((t: Tender) => t.tender_type === 'annual-tender');
      } else {
        filteredTenders = data.filter((t: Tender) => t.tender_type === 'contract');
      }
        
      setTenders(filteredTenders || []);
    } catch (error) {
      console.error('❌ Error fetching tenders:', error);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders(showDeleted);
  }, [isSpotPurchase, isAnnualTender, effectiveType, showDeleted]);

  const handleFinalizeTender = async (tenderId: string) => {
    if (!window.confirm('Are you sure you want to finalize this tender? This action cannot be undone.')) {
      return;
    }

    try {
      setFinalizingTender(tenderId);
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: 'System User' // Changed to match database schema - will be handled by backend
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Finalize API Error Details:', errorData);
        throw new Error(errorData.error || `Failed to finalize tender: ${response.status}`);
      }

      const result = await response.json();
      // Refresh the tender list to show updated status
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
    navigate(`/dashboard/tender-details/${tender.id}`);
  };

  const handleCreateNew = () => {
    let path = '/dashboard/create-tender?type=contract';
    if (isSpotPurchase) {
      path = '/dashboard/create-tender?type=spot-purchase';
    } else if (isAnnualTender) {
      path = '/dashboard/create-tender?type=annual-tender';
    }
    navigate(path);
  };

  const handleEdit = (tender: Tender) => {
    if (tender.is_finalized) {
      alert('Finalized tenders cannot be edited');
      return;
    }
    navigate(`/dashboard/tenders/${tender.id}/edit`);
  };

  const handleDelete = async (tenderId: string) => {
    const tender = tenders.find(t => t.id === tenderId);
    if (tender?.is_finalized) {
      alert('Finalized tenders cannot be deleted');
      return;
    }

    if (window.confirm('Move this tender to trash?')) {
      try {
        setDeletingId(tenderId);
        const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchTenders(showDeleted);
          alert('Tender moved to trash');
        } else {
          alert('Failed to delete tender');
        }
      } catch (error) {
        console.error('Error deleting tender:', error);
        alert('Failed to delete tender');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleRestore = async (tenderId: string) => {
    if (window.confirm('Restore this tender?')) {
      try {
        setRestoringId(tenderId);
        const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/restore`, {
          method: 'POST',
        });

        if (response.ok) {
          await fetchTenders(showDeleted);
          alert('Tender restored successfully');
        } else {
          alert('Failed to restore tender');
        }
      } catch (error) {
        console.error('Error restoring tender:', error);
        alert('Failed to restore tender');
      } finally {
        setRestoringId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    // Return '-' if date is null, empty, or the default 1970 date
    if (!dateString) {
      return '-';
    }
    
    try {
      const date = new Date(dateString);
      // Check if it's the default 1970 date (Jan 1, 1970)
      if (date.getFullYear() === 1970 && date.getMonth() === 0 && date.getDate() === 1) {
        return '-';
      }
      return format(date, 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || amount === 0) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Finalized
        </Badge>
      );
    }

    const statusColors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'published': 'bg-blue-100 text-blue-800',
      'ongoing': 'bg-yellow-100 text-yellow-800',
      'evaluation': 'bg-purple-100 text-purple-800',
      'awarded': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };

    return (
      <Badge variant="secondary" className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const filterTenders = (tenderList: Tender[]) => {
    return tenderList.filter(tender => {
      // Filter by deleted status
      if (!showDeleted && (tender.is_deleted === 1 || tender.is_deleted === true)) {
        return false;
      }
      if (showDeleted && (tender.is_deleted === 0 || tender.is_deleted === false)) {
        return false;
      }

      const matchesSearch = 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
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
            <FileText className="w-5 h-5 text-blue-600" />
          )}
          {title}
          <Badge variant="outline" className="ml-2">
            {tenderList.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{isAnnualTender ? 'Publish Date' : 'Submission Deadline'}</TableHead>
                {isFinalized && <TableHead>Finalized</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenderList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isFinalized ? 8 : 7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="w-8 h-8" />
                      <p>No {isFinalized ? 'finalized' : 'active'} tenders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenderList.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="font-medium">{tender.reference_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tender.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {tender.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tender.tender_type === 'spot-purchase' ? 'Petty Purchase' : tender.tender_type === 'annual-tender' ? 'Annual Tender' : 'Contract'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(tender.estimated_value)}</TableCell>
                    <TableCell>{getStatusBadge(tender.status, tender.is_finalized)}</TableCell>
                    <TableCell>{formatDate(isAnnualTender && tender.publish_date ? tender.publish_date : tender.submission_deadline)}</TableCell>
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
                        {isFinalized ? (
                          // Show Manage PO and View Report buttons for finalized tenders
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/dashboard/purchase-orders?tenderId=${tender.id}`)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              title="Manage Purchase/Supply Orders related to this tender"
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Manage PO
                            </Button>
                            <Button
                              onClick={() => navigate(`/dashboard/tenders/${tender.id}/report`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Report
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(tender)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <PermissionGate permission="tender.edit">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(tender)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            
                            {!showDeleted && (
                              <>
                                <PermissionGate permission="tender.finalize">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFinalizeTender(tender.id)}
                                    disabled={finalizingTender === tender.id}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    title="Finalize Tender"
                                  >
                                    {finalizingTender === tender.id ? (
                                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                </PermissionGate>
                                
                                <PermissionGate permission="tender.delete">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(tender.id)}
                                    disabled={deletingId === tender.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </PermissionGate>
                              </>
                            )}
                            
                            {showDeleted && (
                              <PermissionGate permission="tender.delete">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(tender.id)}
                                  disabled={restoringId === tender.id}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  {restoringId === tender.id ? '...' : '💚 Restore'}
                                </Button>
                              </PermissionGate>
                            )}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h1>
          <p className="text-gray-600">Manage {isSpotPurchase ? 'Petty Purchases' : isAnnualTender ? 'annual tenders' : 'contract tenders'} and track their progress</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {isSpotPurchase ? 'Petty Purchase' : 'Tender'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {isSpotPurchase ? 'Petty Purchases' : isAnnualTender ? 'Annual Tenders' : 'Contract Tenders'}
                </p>
                <h3 className="text-2xl font-bold">{tenders.length}</h3>
                <p className="text-xs text-gray-500">
                  {isSpotPurchase ? 'Total Petty Purchases' : isAnnualTender ? 'Total annual tenders' : 'Total tenders'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {isSpotPurchase ? 'Active Petty Purchases' : 'Active Tenders'}
                </p>
                <h3 className="text-2xl font-bold">{nonFinalizedTenders.length}</h3>
                <p className="text-xs text-gray-500">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {isSpotPurchase ? 'Finalized Petty Purchases' : 'Finalized Tenders'}
                </p>
                <h3 className="text-2xl font-bold">{finalizedTenders.length}</h3>
                <p className="text-xs text-gray-500">
                  {isSpotPurchase ? 'Completed Petty Purchases' : 'Completed tenders'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {isSpotPurchase ? 'Recent Petty Purchases' : 'Recent Tenders'}
                </p>
                <h3 className="text-2xl font-bold">
                  {tenders.filter(t => {
                    const createdDate = new Date(t.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createdDate >= weekAgo;
                  }).length}
                </h3>
                <p className="text-xs text-gray-500">Created in last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={isSpotPurchase ? 'Search Petty Purchases by title, reference number, or description...' : 'Search tenders by title, reference number, or description...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="evaluation">Evaluation</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showDeleted ? 'destructive' : 'outline'}
              onClick={() => setShowDeleted(!showDeleted)}
              className="whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showDeleted ? 'Deleted' : 'Show Deleted'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {isSpotPurchase ? 'Active Petty Purchases' : 'Active Tenders'} ({nonFinalizedTenders.length})
          </TabsTrigger>
          <TabsTrigger value="finalized" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {isSpotPurchase ? 'Finalized Petty Purchases' : 'Finalized Tenders'} ({finalizedTenders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <TenderTable 
            tenderList={filterTenders(nonFinalizedTenders)} 
            title={isSpotPurchase ? 'Active Petty Purchases (Can be edited and finalized)' : 'Active Tenders (Can be edited and finalized)'}
            isFinalized={false}
          />
        </TabsContent>

        <TabsContent value="finalized">
          <TenderTable 
            tenderList={filterTenders(finalizedTenders)} 
            title={isSpotPurchase ? 'Finalized Petty Purchases (Read-only, added to stock acquisition)' : 'Finalized Tenders (Read-only, added to stock acquisition)'}
            isFinalized={true}
          />
        </TabsContent>
      </Tabs>

      {/* Tender Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tender Details: {selectedTender?.reference_number}
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected tender
            </DialogDescription>
          </DialogHeader>
          
          {selectedTender && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-lg font-semibold">{selectedTender.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Number</label>
                  <p className="text-lg font-semibold">{selectedTender.reference_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-lg">
                    {selectedTender.tender_type === 'spot-purchase' ? 'Petty Purchase' : 'Contract'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTender.status, selectedTender.is_finalized)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Value</label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedTender.estimated_value)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submission Deadline</label>
                  <p className="text-lg">{formatDate(selectedTender.submission_deadline)}</p>
                </div>
              </div>

              {selectedTender.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{selectedTender.description}</p>
                </div>
              )}

              {/* Tender Items Table */}
              {selectedTender.items && selectedTender.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-3">Tender Items ({selectedTender.items.length})</label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>#</TableHead>
                          <TableHead>Nomenclature</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Specifications</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTender.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.nomenclature}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.estimated_unit_price ? formatCurrency(item.estimated_unit_price) : 'N/A'}</TableCell>
                            <TableCell className="font-semibold">
                              {item.total_amount ? formatCurrency(item.total_amount) : 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={item.specifications || ''}>
                              {item.specifications || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-sm font-medium text-gray-500">Total Items: </span>
                    <span className="text-lg font-bold text-blue-600">{selectedTender.items.length}</span>
                    <span className="ml-4 text-sm font-medium text-gray-500">Total Quantity: </span>
                    <span className="text-lg font-bold text-green-600">
                      {selectedTender.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Participating Bidders Section */}
              <div className="border-t pt-6">
                <TenderVendorManagement
                  tenderId={selectedTender.id}
                  readOnly={true}
                  vendors={[]}
                />
              </div>

              {selectedTender.is_finalized && (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    This tender has been finalized on {formatDate(selectedTender.finalized_at)} 
                    by {selectedTender.finalized_by || 'Unknown'} and has been added to the stock acquisition system.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractTender;