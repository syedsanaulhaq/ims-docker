import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have proper types
import autoTable from 'jspdf-autotable';
import { 
  ShoppingCart,
  Package, 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Edit, 
  Eye,
  Truck,
  DollarSign,
  BarChart3,
  Calendar,
  Plus,
  Save,
  X,
  MapPin,
  User,
  CalendarDays,
  Receipt,
  Printer,
  Download,
  FileDown
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StockTransactionItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  item_name?: string;
  nomenclature?: string;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  type: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryItem {
  id: string;
  delivery_id: string;
  item_master_id: string;
  item_name: string;
  quantity_delivered: number;
  quantity_damaged?: number;
  quantity_short?: number;
  unit_price: number;
  condition: 'Good' | 'Damaged' | 'Partial' | 'Short';
  remarks?: string;
  batch_number?: string;
  expiry_date?: string;
}

interface DeliveryInfo {
  id: string;
  tender_id: string;
  delivery_number: string;
  delivery_date: string;
  supplier_name: string;
  supplier_reference: string;
  received_by: string;
  delivery_location: string;
  total_items: number;
  delivery_status: 'Pending' | 'Partial' | 'Complete' | 'Damaged';
  notes?: string;
  created_at: string;
  items: DeliveryItem[];
}

interface TenderStockSummary {
  tender_id: string;
  tender_title?: string;
  tender_number?: string;
  total_items: number;
  confirmed_items: number;
  pending_items: number;
  total_estimated_value: number;
  total_actual_value: number;
  pricing_completion_rate: number;
  has_deliveries: number; // 0 = Pending, 1 = Partial, 2 = Complete
  created_at: string;
}

interface AcquisitionStats {
  total_tenders: number;
  total_items: number;
  confirmed_pricing_items: number;
  pending_pricing_items: number;
  total_estimated_value: number;
  total_actual_value: number;
  average_price_variance: number;
  total_deliveries: number;
  pending_deliveries: number;
}

const EnhancedStockAcquisitionWithDelivery: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<'all' | 'finalized' | 'pending'>('all');
  
  // State for dashboard data
  const [stats, setStats] = useState<AcquisitionStats>({
    total_tenders: 0,
    total_items: 0,
    confirmed_pricing_items: 0,
    pending_pricing_items: 0,
    total_estimated_value: 0,
    total_actual_value: 0,
    average_price_variance: 0,
    total_deliveries: 0,
    pending_deliveries: 0
  });
  
  const [tenderSummaries, setTenderSummaries] = useState<TenderStockSummary[]>([]);
  const [selectedTender, setSelectedTender] = useState<string | null>(null);
  const [selectedTenderInfo, setSelectedTenderInfo] = useState<any>(null);
  const [stockTransactionItems, setStockTransactionItems] = useState<StockTransactionItem[]>([]);
  const [editedItems, setEditedItems] = useState<{ [key: string]: { actual_unit_price: number; remarks?: string } }>({});
  
  // Delivery management state
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [newDeliveryItem, setNewDeliveryItem] = useState<Partial<DeliveryItem>>({});
  const [showAddDeliveryItem, setShowAddDeliveryItem] = useState(false);
  const [activeTab, setActiveTab] = useState('delivery');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stock acquisition statistics
      const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/stock-acquisition/dashboard-stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch tender summaries from stock transactions
      const summariesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/stock-acquisition/tender-summaries`);
      if (summariesResponse.ok) {
        const summariesData = await summariesResponse.json();
        setTenderSummaries(summariesData);
      }

      } catch (err) {
      console.error('❌ Error loading stock acquisition data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTenderDetails = async (tenderId: string) => {
    try {
      let items: StockTransactionItem[] = [];
      
      // Load stock transaction items
      const itemsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/stock-acquisition/items/${tenderId}`);
      if (itemsResponse.ok) {
        items = await itemsResponse.json();
        setStockTransactionItems(items);
      }

      // Load tender info
      const tenderResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tenders/${tenderId}`);
      if (tenderResponse.ok) {
        const tender = await tenderResponse.json();
        setSelectedTenderInfo(tender);
      }

      // Load delivery info if exists
      const deliveryResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/deliveries/by-tender/${tenderId}`);
      if (deliveryResponse.ok) {
        const delivery = await deliveryResponse.json();
        setDeliveryInfo(delivery);
      } else {
        setDeliveryInfo(null);
      }

      setSelectedTender(tenderId);
      
      // Initialize edited items state
      const initialEdits: { [key: string]: { actual_unit_price: number; remarks?: string } } = {};
      items.forEach((item: StockTransactionItem) => {
        initialEdits[item.id] = {
          actual_unit_price: item.actual_unit_price,
          remarks: item.remarks || ''
        };
      });
      setEditedItems(initialEdits);
      
    } catch (err) {
      console.error('❌ Error loading tender details:', err);
      setError('Failed to load tender details');
    }
  };

  const saveAllItemPrices = async () => {
    try {
      const updates = Object.entries(editedItems).map(([itemId, data]) => ({
        id: itemId,
        actual_unit_price: data.actual_unit_price,
        remarks: data.remarks,
        pricing_confirmed: true
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stock-acquisition/update-multiple-prices`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        await loadDashboardData();
        setSelectedTender(null);
        alert('All item prices updated successfully!');
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (err) {
      console.error('❌ Error updating prices:', err);
      alert('Failed to update prices');
    }
  };

  const updateItemPrice = (itemId: string, field: 'actual_unit_price' | 'remarks', value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'actual_unit_price' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const saveDeliveryInfo = async () => {
    if (!deliveryInfo || !selectedTender) return;

    try {
      const url = deliveryInfo.id 
        ? `${import.meta.env.VITE_API_URL}/api/deliveries/${deliveryInfo.id}`
        : `${import.meta.env.VITE_API_URL}/api/deliveries`;
      
      const method = deliveryInfo.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...deliveryInfo,
          tender_id: selectedTender
        }),
      });

      if (response.ok) {
        setEditingDelivery(false);
        alert('Delivery information saved successfully!');
        // Reload delivery data
        await loadTenderDetails(selectedTender);
      } else {
        throw new Error('Failed to save delivery info');
      }
    } catch (err) {
      console.error('❌ Error saving delivery info:', err);
      alert('Failed to save delivery info');
    }
  };

  const addDeliveryItem = () => {
    if (!deliveryInfo || !newDeliveryItem.item_name) return;

    const newItem: DeliveryItem = {
      id: Date.now().toString(),
      delivery_id: deliveryInfo.id || '',
      item_master_id: newDeliveryItem.item_master_id || '',
      item_name: newDeliveryItem.item_name || '',
      quantity_delivered: newDeliveryItem.quantity_delivered || 0,
      quantity_damaged: newDeliveryItem.quantity_damaged || 0,
      quantity_short: newDeliveryItem.quantity_short || 0,
      unit_price: newDeliveryItem.unit_price || 0,
      condition: newDeliveryItem.condition || 'Good',
      remarks: newDeliveryItem.remarks || '',
      batch_number: newDeliveryItem.batch_number || '',
      expiry_date: newDeliveryItem.expiry_date || ''
    };

    setDeliveryInfo(prev => prev ? {
      ...prev,
      items: [...prev.items, newItem]
    } : null);

    setNewDeliveryItem({});
    setShowAddDeliveryItem(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPricingStatusBadge = (confirmed: boolean) => {
    if (confirmed) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmed
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDeliveryStatusBadge = (status: string) => {
    const statusColors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Partial': 'bg-blue-100 text-blue-800 border-blue-200',
      'Complete': 'bg-green-100 text-green-800 border-green-200',
      'Damaged': 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const filteredTenders = tenderSummaries.filter(tender => {
    // Search filter
    const matchesSearch = (tender.tender_title?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (tender.tender_number?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
    
    // Delivery status filter
    if (activeDeliveryTab === 'finalized') {
      // has_deliveries === 2 means all deliveries are finalized (Complete)
      return matchesSearch && tender.has_deliveries === 2;
    } else if (activeDeliveryTab === 'pending') {
      // has_deliveries === 0 (Pending) or 1 (Partial) means not all deliveries are finalized
      return matchesSearch && (tender.has_deliveries === 0 || tender.has_deliveries === 1);
    }
    
    // 'all' tab - show everything
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading stock acquisition data...</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = (preview: boolean = false) => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Stock Acquisition Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Finalized Tenders', pageWidth / 2, 28, { align: 'center' });
    
    // Date and time
    doc.setFontSize(10);
    const now = new Date().toLocaleDateString('en-PK', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${now}`, pageWidth / 2, 35, { align: 'center' });
    
    // Summary Statistics
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, 45);
    
    const summaryData = [
      ['Total Tenders', stats.total_tenders.toString()],
      ['Total Items', `${stats.total_items} (${stats.confirmed_pricing_items} confirmed)`],
      ['Estimated Value', formatCurrency(stats.total_estimated_value)],
      ['Actual Value', formatCurrency(stats.total_actual_value)]
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    
    // Tenders Table
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Details', 14, finalY + 10);
    
    const tableData = filteredTenders.map(tender => [
      `${tender.tender_title || 'N/A'}\n${tender.tender_number || ''}`,
      `${tender.total_items} items\n(${tender.confirmed_items} confirmed, ${tender.pending_items} pending)`,
      formatCurrency(tender.total_estimated_value),
      formatCurrency(tender.total_actual_value),
      `${tender.pricing_completion_rate.toFixed(1)}%`,
      tender.has_deliveries === 2 ? 'Complete' : tender.has_deliveries === 1 ? 'Partial' : 'Pending',
      formatDate(tender.created_at)
    ]);
    
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Tender', 'Items', 'Est. Value', 'Actual Value', 'Completion', 'Deliveries', 'Created']],
      body: tableData,
      theme: 'striped',
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: function (data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });
    
    if (preview) {
      // Open in new tab for preview
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } else {
      // Download
      const filename = `Stock_Acquisition_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Hide UI elements */
          button, .search-input, nav, aside, footer {
            display: none !important;
          }
          
          /* Adjust layout for print */
          .print-container {
            padding: 20px;
          }
          
          /* Table styling for print */
          table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          /* Card adjustments */
          .print-card {
            border: 1px solid #ddd;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          
          /* Text color adjustments */
          * {
            color: black !important;
          }
          
          .badge {
            border: 1px solid #333;
            padding: 2px 6px;
            border-radius: 3px;
          }
        }
      `}</style>
      <div className="p-6 space-y-6 print-container">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Acquisition & Delivery Management</h1>
          <p className="text-muted-foreground">
            Manage pricing for finalized tenders, track deliveries, and update actual costs
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => generatePDF(true)} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={() => generatePDF(false)} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_tenders}</div>
            <p className="text-xs text-muted-foreground">
              From finalized tenders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_items}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmed_pricing_items} pricing confirmed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_deliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed deliveries
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_deliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting finalization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by tender title or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Status Tabs */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <Tabs value={activeDeliveryTab} onValueChange={(value) => setActiveDeliveryTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                All Tenders
                <Badge variant="secondary" className="ml-1">
                  {tenderSummaries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finalized" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Finalized
                <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">
                  {tenderSummaries.filter(t => t.has_deliveries === 2).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
                <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                  {tenderSummaries.filter(t => t.has_deliveries === 0 || t.has_deliveries === 1).length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">Stock Acquisition Report</h1>
          <h2 className="text-xl mb-1">Finalized Tenders</h2>
          <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
          <div className="border p-3 rounded">
            <div className="font-semibold">Total Tenders</div>
            <div className="text-2xl">{stats.total_tenders}</div>
          </div>
          <div className="border p-3 rounded">
            <div className="font-semibold">Total Items</div>
            <div className="text-2xl">{stats.total_items}</div>
            <div className="text-xs">{stats.confirmed_pricing_items} confirmed</div>
          </div>
          <div className="border p-3 rounded">
            <div className="font-semibold">Estimated Value</div>
            <div className="text-xl">{formatCurrency(stats.total_estimated_value)}</div>
          </div>
          <div className="border p-3 rounded">
            <div className="font-semibold">Actual Value</div>
            <div className="text-xl">{formatCurrency(stats.total_actual_value)}</div>
          </div>
        </div>
      </div>

      {/* Tender Summaries Table */}
      <Card className="print-card">
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {activeDeliveryTab === 'finalized' && 'Finalized Tenders'}
            {activeDeliveryTab === 'pending' && 'Pending Tenders (Deliveries Not Finalized)'}
            {activeDeliveryTab === 'all' && 'All Finalized Tenders in Stock Acquisition'}
            <Badge variant="outline">{filteredTenders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Pricing Status</TableHead>
                  <TableHead>Estimated Value</TableHead>
                  <TableHead>Actual Value</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                      No finalized tenders found in stock acquisition system
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenders.map((tender) => (
                    <TableRow key={tender.tender_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tender.tender_title || 'Untitled'}</div>
                          <div className="text-sm text-gray-500">{tender.tender_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{tender.total_items}</div>
                          <div className="text-sm text-gray-500">items</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-green-600 font-medium">{tender.confirmed_items} confirmed</div>
                          <div className="text-yellow-600 text-sm">{tender.pending_items} pending</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tender.total_estimated_value)}</TableCell>
                      <TableCell>{formatCurrency(tender.total_actual_value)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`font-medium ${getCompletionColor(tender.pricing_completion_rate)}`}>
                            {tender.pricing_completion_rate.toFixed(1)}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${tender.pricing_completion_rate}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tender.has_deliveries === 2 ? (
                          <Badge className="bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        ) : tender.has_deliveries === 1 ? (
                          <Badge className="bg-amber-500 text-white border-amber-600 hover:bg-amber-600">
                            <Truck className="w-3 h-3 mr-1" />
                            Partial
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-400 text-white border-slate-500 hover:bg-slate-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(tender.created_at)}</TableCell>
                      <TableCell className="no-print">
                        <div className="flex items-center gap-2">
                          {tender.has_deliveries === 2 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/dashboard/stock-acquisition-report/${tender.tender_id}`)}
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Report
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/dashboard/stock-acquisition/${tender.tender_id}`)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Manage
                            </Button>
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

      {/* Add Delivery Item Modal */}
      <Dialog open={showAddDeliveryItem} onOpenChange={setShowAddDeliveryItem}>
        <DialogContent className="max-w-2xl no-print">
          <DialogHeader>
            <DialogTitle>Add Delivery Item</DialogTitle>
            <DialogDescription>
              Add a new item to the delivery with quantities and condition details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={newDeliveryItem.item_name || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, item_name: e.target.value}))}
                placeholder="Item nomenclature"
              />
            </div>
            <div>
              <Label htmlFor="quantity_delivered">Quantity Delivered</Label>
              <Input
                id="quantity_delivered"
                type="number"
                value={newDeliveryItem.quantity_delivered || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, quantity_delivered: parseInt(e.target.value) || 0}))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="quantity_damaged">Quantity Damaged</Label>
              <Input
                id="quantity_damaged"
                type="number"
                value={newDeliveryItem.quantity_damaged || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, quantity_damaged: parseInt(e.target.value) || 0}))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="quantity_short">Quantity Short</Label>
              <Input
                id="quantity_short"
                type="number"
                value={newDeliveryItem.quantity_short || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, quantity_short: parseInt(e.target.value) || 0}))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="unit_price">Unit Price</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={newDeliveryItem.unit_price || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, unit_price: parseFloat(e.target.value) || 0}))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={newDeliveryItem.condition || 'Good'}
                onValueChange={(value) => setNewDeliveryItem(prev => ({...prev, condition: value as any}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={newDeliveryItem.batch_number || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, batch_number: e.target.value}))}
                placeholder="BATCH-001"
              />
            </div>
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={newDeliveryItem.expiry_date || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, expiry_date: e.target.value}))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="item_remarks">Remarks</Label>
              <Textarea
                id="item_remarks"
                value={newDeliveryItem.remarks || ''}
                onChange={(e) => setNewDeliveryItem(prev => ({...prev, remarks: e.target.value}))}
                placeholder="Additional notes about this item..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={addDeliveryItem} className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
            <Button variant="outline" onClick={() => setShowAddDeliveryItem(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default EnhancedStockAcquisitionWithDelivery;