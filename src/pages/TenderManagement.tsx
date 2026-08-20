import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ClipboardList,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Users,
  Building,
  Truck,
  Award,
  RefreshCw,
  MoreHorizontal,
  Send,
  Archive
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { invmisApi } from '@/services/invmisApi';

// Types
interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  category: string;
  department: string;
  tender_type: 'open' | 'limited' | 'single_source' | 'framework';
  status: 'draft' | 'published' | 'active' | 'evaluation' | 'awarded' | 'cancelled' | 'completed';
  estimated_value: number;
  currency: string;
  publication_date?: string;
  submission_deadline?: string;
  opening_date?: string;
  evaluation_deadline?: string;
  award_date?: string;
  created_by: string;
  created_date: string;
  updated_date: string;
  documents_count: number;
  bids_count: number;
  evaluation_status?: string;
  awarded_vendor?: string;
  awarded_amount?: number;
  contract_duration?: number;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
}

interface TenderItem {
  id: string;
  tender_id: string;
  item_code: string;
  item_name: string;
  description: string;
  unit_of_measure: string;
  quantity: number;
  estimated_unit_price: number;
  estimated_total_price: number;
  specifications?: string;
}

interface Bid {
  id: string;
  tender_id: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone?: string;
  bid_amount: number;
  currency: string;
  submission_date: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  documents_count: number;
  technical_score?: number;
  financial_score?: number;
  total_score?: number;
  evaluation_notes?: string;
  is_compliant: boolean;
}

interface TenderDocument {
  id: string;
  tender_id: string;
  document_name: string;
  document_type: 'specification' | 'terms' | 'drawing' | 'sample' | 'other';
  file_size: number;
  upload_date: string;
  uploaded_by: string;
}

const TenderManagement: React.FC = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [documents, setDocuments] = useState<TenderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dialog states
  const [isCreateTenderOpen, setIsCreateTenderOpen] = useState(false);
  const [isViewTenderOpen, setIsViewTenderOpen] = useState(false);
  const [isEvaluateBidsOpen, setIsEvaluateBidsOpen] = useState(false);

  // Form data
  const [tenderFormData, setTenderFormData] = useState({
    title: '',
    description: '',
    category: '',
    department: '',
    tender_type: 'open',
    estimated_value: 0,
    currency: 'PKR',
    submission_deadline: '',
    opening_date: '',
    contact_person: '',
    contact_email: '',
    contact_phone: ''
  });

  const fetchTenderData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch tenders from API using direct fetch
      const response = await fetch('/api/tenders');
      const tendersResponse = await response.json();
      setTenders(Array.isArray(tendersResponse) ? tendersResponse : []);

      // Set empty arrays for additional data until specific APIs are implemented
      setTenderItems([]);
      setBids([]);
      setDocuments([]);
      
    } catch (err) {
      console.error('Error fetching tender data:', err);
      setError('Failed to load tender data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenderData();
  }, []);

  // Filter tenders based on search and filters
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = 
      tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.tender_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || tender.department === departmentFilter;
    const matchesType = typeFilter === 'all' || tender.tender_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesType;
  });

  // Calculate tender statistics
  const tenderStats = {
    totalTenders: tenders.length,
    activeTenders: tenders.filter(t => t.status === 'active').length,
    evaluationTenders: tenders.filter(t => t.status === 'evaluation').length,
    awardedTenders: tenders.filter(t => t.status === 'awarded').length,
    totalValue: tenders.reduce((sum, tender) => sum + tender.estimated_value, 0),
    averageValue: tenders.length > 0 ? tenders.reduce((sum, tender) => sum + tender.estimated_value, 0) / tenders.length : 0
  };

  const handleCreateTender = async () => {
    try {
      // In real app, call API to create tender
      // Generate tender number
      const tenderNumber = `TND-${new Date().getFullYear()}-${String(tenders.length + 1).padStart(3, '0')}`;
      
      // Reset form and close dialog
      setTenderFormData({
        title: '',
        description: '',
        category: '',
        department: '',
        tender_type: 'open',
        estimated_value: 0,
        currency: 'PKR',
        submission_deadline: '',
        opening_date: '',
        contact_person: '',
        contact_email: '',
        contact_phone: ''
      });
      setIsCreateTenderOpen(false);
      
      // Refresh tenders
      await fetchTenderData();
      
    } catch (err) {
      console.error('Error creating tender:', err);
    }
  };

  const handleViewTender = (tender: Tender) => {
    setSelectedTender(tender);
    setIsViewTenderOpen(true);
  };

  const handleStatusChange = async (tender: Tender, newStatus: string) => {
    try {
      // In real app, call API to update tender status
      // Update local state
      setTenders(tenders.map(t => 
        t.id === tender.id ? { ...t, status: newStatus as any } : t
      ));
      
    } catch (err) {
      console.error('Error updating tender status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'published': return 'default';
      case 'active': return 'default';
      case 'evaluation': return 'secondary';
      case 'awarded': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return Edit;
      case 'published': return FileText;
      case 'active': return Clock;
      case 'evaluation': return Eye;
      case 'awarded': return Award;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return AlertTriangle;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading tender management...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tender Management</h1>
            <p className="text-gray-600 mt-1">Manage procurement tenders and bidding processes</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchTenderData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsCreateTenderOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Tender
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tenders</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(tenderStats.totalTenders)}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">All time</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tenders</p>
                  <p className="text-2xl font-bold text-green-600">{tenderStats.activeTenders}</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-green-600">Open for bidding</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Evaluation</p>
                  <p className="text-2xl font-bold text-yellow-600">{tenderStats.evaluationTenders}</p>
                </div>
                <Eye className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-yellow-600">Bid evaluation</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(tenderStats.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">Estimated value</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tenders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenders">Tenders</TabsTrigger>
            <TabsTrigger value="evaluation">Bid Evaluation</TabsTrigger>
            <TabsTrigger value="awards">Awards & Contracts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="tenders" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search tenders by title, number, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="evaluation">Evaluation</SelectItem>
                        <SelectItem value="awarded">Awarded</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="open">Open Tender</SelectItem>
                        <SelectItem value="limited">Limited Tender</SelectItem>
                        <SelectItem value="single_source">Single Source</SelectItem>
                        <SelectItem value="framework">Framework</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tenders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Tenders ({filteredTenders.length})</CardTitle>
                <CardDescription>Manage procurement tenders and track their progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tender Details</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Estimated Value</TableHead>
                        <TableHead>Deadlines</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bids</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenders.map((tender) => {
                        const StatusIcon = getStatusIcon(tender.status);
                        return (
                          <TableRow key={tender.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{tender.title}</div>
                                <div className="text-sm text-gray-500">{tender.tender_number}</div>
                                <div className="text-xs text-gray-400 mt-1">{tender.category}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Building className="w-4 h-4 mr-2 text-gray-400" />
                                {tender.department}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tender.tender_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(tender.estimated_value)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {tender.submission_deadline && (
                                <div className="flex items-center mb-1">
                                  <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                  Submit: {formatDate(tender.submission_deadline)}
                                </div>
                              )}
                              {tender.opening_date && (
                                <div className="flex items-center text-gray-500">
                                  <Eye className="w-3 h-3 mr-1 text-gray-400" />
                                  Open: {formatDate(tender.opening_date)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className="w-4 h-4" />
                                <Badge variant={getStatusColor(tender.status) as any}>
                                  {tender.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="text-lg font-bold">{tender.bids_count || 0}</div>
                                <div className="text-xs text-gray-500">bids received</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewTender(tender)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bid Evaluation</CardTitle>
                <CardDescription>Evaluate and compare submitted bids</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Bid Amount</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Technical Score</TableHead>
                        <TableHead>Financial Score</TableHead>
                        <TableHead>Total Score</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bids.map((bid) => (
                        <TableRow key={bid.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{bid.vendor_name}</div>
                              <div className="text-sm text-gray-500">{bid.vendor_email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(bid.bid_amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(bid.submission_date)}
                          </TableCell>
                          <TableCell>
                            {bid.technical_score ? (
                              <div className="text-center">
                                <div className="text-lg font-bold">{bid.technical_score}%</div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{width: `${bid.technical_score}%`}}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not scored</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {bid.financial_score ? (
                              <div className="text-center">
                                <div className="text-lg font-bold">{bid.financial_score}%</div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full" 
                                    style={{width: `${bid.financial_score}%`}}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not scored</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {bid.total_score ? (
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">{bid.total_score}%</div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-purple-600 h-2 rounded-full" 
                                    style={{width: `${bid.total_score}%`}}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bid.is_compliant ? 'default' : 'destructive'}>
                              {bid.is_compliant ? 'Compliant' : 'Non-Compliant'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {bid.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="awards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Awards & Contracts</CardTitle>
                <CardDescription>Manage tender awards and contract execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Awards Yet</h3>
                  <p>Awarded tenders and contracts will appear here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold mb-2">Tender Summary Report</h3>
                  <p className="text-sm text-gray-500">Overview of all tenders and their status</p>
                </div>
              </Card>
              
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-semibold mb-2">Vendor Performance</h3>
                  <p className="text-sm text-gray-500">Analyze vendor participation and success rates</p>
                </div>
              </Card>
              
              <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="font-semibold mb-2">Financial Analysis</h3>
                  <p className="text-sm text-gray-500">Cost savings and procurement efficiency</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Tender Dialog */}
        <Dialog open={isCreateTenderOpen} onOpenChange={setIsCreateTenderOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tender</DialogTitle>
              <DialogDescription>
                Create a new procurement tender with detailed specifications.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tender Title</Label>
                  <Input
                    id="title"
                    value={tenderFormData.title}
                    onChange={(e) => setTenderFormData({...tenderFormData, title: e.target.value})}
                    placeholder="Enter tender title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={tenderFormData.category} onValueChange={(value) => setTenderFormData({...tenderFormData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Vehicles">Vehicles</SelectItem>
                      <SelectItem value="Medical Equipment">Medical Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={tenderFormData.description}
                  onChange={(e) => setTenderFormData({...tenderFormData, description: e.target.value})}
                  placeholder="Enter detailed description of requirements"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={tenderFormData.department} onValueChange={(value) => setTenderFormData({...tenderFormData, department: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT Department">IT Department</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Procurement">Procurement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tender_type">Tender Type</Label>
                  <Select value={tenderFormData.tender_type} onValueChange={(value) => setTenderFormData({...tenderFormData, tender_type: value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tender type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open Tender</SelectItem>
                      <SelectItem value="limited">Limited Tender</SelectItem>
                      <SelectItem value="single_source">Single Source</SelectItem>
                      <SelectItem value="framework">Framework Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_value">Estimated Value</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    value={tenderFormData.estimated_value}
                    onChange={(e) => setTenderFormData({...tenderFormData, estimated_value: parseFloat(e.target.value) || 0})}
                    placeholder="Enter estimated value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={tenderFormData.currency} onValueChange={(value) => setTenderFormData({...tenderFormData, currency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submission_deadline">Submission Deadline</Label>
                  <Input
                    id="submission_deadline"
                    type="datetime-local"
                    value={tenderFormData.submission_deadline}
                    onChange={(e) => setTenderFormData({...tenderFormData, submission_deadline: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_date">Opening Date</Label>
                  <Input
                    id="opening_date"
                    type="datetime-local"
                    value={tenderFormData.opening_date}
                    onChange={(e) => setTenderFormData({...tenderFormData, opening_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={tenderFormData.contact_person}
                    onChange={(e) => setTenderFormData({...tenderFormData, contact_person: e.target.value})}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={tenderFormData.contact_email}
                    onChange={(e) => setTenderFormData({...tenderFormData, contact_email: e.target.value})}
                    placeholder="Contact email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={tenderFormData.contact_phone}
                    onChange={(e) => setTenderFormData({...tenderFormData, contact_phone: e.target.value})}
                    placeholder="Contact phone"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTenderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTender}>
                Create Tender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Tender Dialog */}
        <Dialog open={isViewTenderOpen} onOpenChange={setIsViewTenderOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTender?.title}</DialogTitle>
              <DialogDescription>
                {selectedTender?.tender_number} - {selectedTender?.category}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTender && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="bids">Bids</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Description</Label>
                        <p className="mt-1">{selectedTender.description}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Department</Label>
                        <p className="mt-1">{selectedTender.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Type</Label>
                        <p className="mt-1">{selectedTender.tender_type.replace('_', ' ').toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Estimated Value</Label>
                        <p className="mt-1 text-lg font-semibold">{formatCurrency(selectedTender.estimated_value)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Submission Deadline</Label>
                        <p className="mt-1">{selectedTender.submission_deadline ? formatDate(selectedTender.submission_deadline) : 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Opening Date</Label>
                        <p className="mt-1">{selectedTender.opening_date ? formatDate(selectedTender.opening_date) : 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="items" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenderItems.filter(item => item.tender_id === selectedTender.id).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.item_name}</div>
                              <div className="text-sm text-gray-500">{item.item_code}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell>{formatNumber(item.quantity)} {item.unit_of_measure}</TableCell>
                          <TableCell>{formatCurrency(item.estimated_unit_price)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.estimated_total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="bids" className="mt-4">
                  <div className="space-y-4">
                    {bids.filter(bid => bid.tender_id === selectedTender.id).map((bid) => (
                      <Card key={bid.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{bid.vendor_name}</h4>
                            <p className="text-sm text-gray-500">{bid.vendor_email}</p>
                            <p className="text-lg font-bold text-green-600 mt-2">{formatCurrency(bid.bid_amount)}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={bid.is_compliant ? 'default' : 'destructive'}>
                              {bid.is_compliant ? 'Compliant' : 'Non-Compliant'}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-2">
                              Submitted: {formatDate(bid.submission_date)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-4">
                  <div className="space-y-4">
                    {documents.filter(doc => doc.tender_id === selectedTender.id).map((doc) => (
                      <Card key={doc.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <h4 className="font-medium">{doc.document_name}</h4>
                              <p className="text-sm text-gray-500">
                                {doc.document_type} • {formatFileSize(doc.file_size)} • {formatDate(doc.upload_date)}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-2" />
                            Download
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewTenderOpen(false)}>
                Close
              </Button>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Tender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TenderManagement;
