import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Calendar
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
  has_deliveries: boolean;
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
}

const EnhancedStockAcquisitionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for dashboard data
  const [stats, setStats] = useState<AcquisitionStats>({
    total_tenders: 0,
    total_items: 0,
    confirmed_pricing_items: 0,
    pending_pricing_items: 0,
    total_estimated_value: 0,
    total_actual_value: 0,
    average_price_variance: 0
  });
  
  const [tenderSummaries, setTenderSummaries] = useState<TenderStockSummary[]>([]);
  const [stockTransactionItems, setStockTransactionItems] = useState<StockTransactionItem[]>([]);
  const [selectedTender, setSelectedTender] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<StockTransactionItem | null>(null);
  const [editActualPrice, setEditActualPrice] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stock acquisition statistics
      const statsResponse = await fetch('http://localhost:3001/api/stock-acquisition/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch tender summaries from stock transactions
      const summariesResponse = await fetch('http://localhost:3001/api/stock-acquisition/tender-summaries');
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

  const loadTenderItems = async (tenderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/stock-acquisition/items/${tenderId}`);
      if (response.ok) {
        const items = await response.json();
        setStockTransactionItems(items);
        setSelectedTender(tenderId);
      }
    } catch (err) {
      console.error('❌ Error loading tender items:', err);
      setError('Failed to load tender items');
    }
  };

  const handleEditPrice = (item: StockTransactionItem) => {
    setEditingItem(item);
    setEditActualPrice(item.actual_unit_price.toString());
  };

  const saveActualPrice = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`http://localhost:3001/api/stock-acquisition/update-price/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actual_unit_price: parseFloat(editActualPrice),
          pricing_confirmed: true
        }),
      });

      if (response.ok) {
        // Refresh the tender items
        if (selectedTender) {
          await loadTenderItems(selectedTender);
        }
        await loadDashboardData();
        setEditingItem(null);
        alert('Actual price updated successfully!');
      } else {
        throw new Error('Failed to update price');
      }
    } catch (err) {
      console.error('❌ Error updating price:', err);
      alert('Failed to update price');
    }
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

  const filteredTenders = tenderSummaries.filter(tender =>
    (tender.tender_title?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (tender.tender_number?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Acquisition Dashboard</h1>
          <p className="text-muted-foreground">
            Manage pricing for finalized tenders and track delivery progress
          </p>
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
            <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_estimated_value)}</div>
            <p className="text-xs text-muted-foreground">
              Initial tender pricing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_actual_value)}</div>
            <p className={`text-xs ${stats.average_price_variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.average_price_variance >= 0 ? '+' : ''}{stats.average_price_variance.toFixed(1)}% variance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by tender title or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tender Summaries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Finalized Tenders in Stock Acquisition
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
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
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
                      <TableCell>{formatDate(tender.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadTenderItems(tender.tender_id)}
                          >
                            <Edit className="w-4 h-4" />
                            Edit Prices
                          </Button>
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

      {/* Tender Items Modal */}
      <Dialog open={selectedTender !== null} onOpenChange={(open) => !open && setSelectedTender(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item Prices</DialogTitle>
            <DialogDescription>
              Update actual prices for items in this tender
            </DialogDescription>
          </DialogHeader>
          
          {stockTransactionItems.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Estimated Price</TableHead>
                    <TableHead>Actual Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qty Received</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockTransactionItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.item_name || item.nomenclature}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.estimated_unit_price)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(item.actual_unit_price)}</div>
                      </TableCell>
                      <TableCell>{getPricingStatusBadge(item.pricing_confirmed)}</TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{item.total_quantity_received}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPrice(item)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Price Modal */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Actual Price</DialogTitle>
            <DialogDescription>
              Update the actual price for: {editingItem?.item_name || editingItem?.nomenclature}
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Estimated Price</label>
                <div className="text-lg">{formatCurrency(editingItem.estimated_unit_price)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Actual Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editActualPrice}
                  onChange={(e) => setEditActualPrice(e.target.value)}
                  placeholder="Enter actual price"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={saveActualPrice} className="flex-1">
                  Save Price
                </Button>
                <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedStockAcquisitionDashboard;