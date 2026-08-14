import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  ArrowLeft, 
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Eye,
  TrendingUp
} from 'lucide-react';

interface StockQuantity {
  opening_balance_entry_id?: string;
  item_master_id: string;
  group_number?: number | null;
  item_code: string;
  nomenclature: string;
  category_name: string;
  unit: string;
  opening_balance_quantity: number;
  new_acquisition_quantity: number;
  total_quantity: number;
  total_received: number;
  total_issued: number;
  last_transaction_date: string;
  acquisition_count: number;
  opening_balance_count: number;
  new_acquisition_count: number;
}

interface StockDetailSummary {
  opening_balance_procured?: number;
  opening_balance_issued?: number;
  opening_balance_remaining?: number;
  opening_balance_count?: number;
  acquisition_procured?: number;
  acquisition_issued?: number;
  acquisition_remaining?: number;
  acquisition_count?: number;
  pending_count?: number;
  pending_quantity?: number;
  total_procured?: number;
  total_issued?: number;
  total_stock?: number;
}

const StockQuantitiesPage: React.FC = () => {
  const [quantities, setQuantities] = useState<StockQuantity[]>([]);
  const [filteredQuantities, setFilteredQuantities] = useState<StockQuantity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [detailItem, setDetailItem] = useState<StockQuantity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSummary, setDetailSummary] = useState<StockDetailSummary | null>(null);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadQuantities();
  }, []);

  useEffect(() => {
    filterQuantities();
  }, [quantities, searchTerm, selectedStatus]);

  const loadQuantities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/stock-breakdown?show_zero_stock=true`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stock quantities: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stock breakdown');
      }
      
      setQuantities(data.inventory);
    } catch (error) {
      console.error('Error loading stock quantities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock quantities');
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetails = async (item: StockQuantity) => {
    setDetailItem(item);
    setDetailLoading(true);
    setDetailSummary(null);
    setDetailHistory([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/current-stock/${item.item_master_id}/history`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load item details: ${response.statusText}`);
      }

      const data = await response.json();
      setDetailSummary(data.summary || null);
      setDetailHistory(data.history || []);
    } catch (error) {
      console.error('Error loading item details:', error);
      setDetailSummary(null);
      setDetailHistory([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const filterQuantities = () => {
    let filtered = quantities;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_code.toLowerCase().includes(search) ||
        item.nomenclature.toLowerCase().includes(search) ||
        (item.category_name || '').toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (selectedStatus === 'out-of-stock') {
      filtered = filtered.filter(item => item.total_quantity === 0);
    } else if (selectedStatus === 'low-stock') {
      filtered = filtered.filter(item => item.total_quantity > 0 && item.total_quantity < 10);
    } else if (selectedStatus === 'in-stock') {
      filtered = filtered.filter(item => item.total_quantity >= 10);
    } else if (selectedStatus === 'has-opening-balance') {
      filtered = filtered.filter(item => item.opening_balance_quantity > 0);
    }

    setFilteredQuantities(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Out of Stock
        </Badge>
      );
    } else if (quantity < 10) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <Package className="h-3 w-3 mr-1" />
          In Stock
        </Badge>
      );
    }
  };

  const getQuantityColor = (quantity: number): string => {
    if (quantity === 0) return 'text-red-600 font-bold';
    if (quantity < 10) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  // Calculate summary statistics
  const stats = {
    total: filteredQuantities.length,
    totalQuantity: filteredQuantities.reduce((sum, q) => sum + q.total_quantity, 0),
    openingBalance: filteredQuantities.reduce((sum, q) => sum + q.opening_balance_quantity, 0),
    newAcquisitions: filteredQuantities.reduce((sum, q) => sum + q.new_acquisition_quantity, 0),
    outOfStock: filteredQuantities.filter(q => q.total_quantity === 0).length,
    lowStock: filteredQuantities.filter(q => q.total_quantity > 0 && q.total_quantity < 10).length,
    inStock: filteredQuantities.filter(q => q.total_quantity >= 10).length
  };

  const statusOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'out-of-stock', label: 'Out of Stock' },
    { value: 'low-stock', label: 'Low Stock (<10)' },
    { value: 'in-stock', label: 'In Stock (≥10)' },
    { value: 'has-opening-balance', label: 'Has Opening Balance' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Loading stock quantities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Error Loading Stock Quantities</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={loadQuantities}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/inventory-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Stock Quantities
            </h1>
            <p className="text-gray-600">Current stock levels and inventory status</p>
          </div>
        </div>
        <Button onClick={loadQuantities} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.openingBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">New Acquisitions</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.newAcquisitions)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats.totalQuantity)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by item code, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Quantities Table */}
      {filteredQuantities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock quantities found</p>
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search criteria</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock Quantities</span>
              <Badge variant="outline">{filteredQuantities.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Procured</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">Opening Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider">New Aquissition</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider font-bold">Total Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuantities.map((item) => (
                    <tr key={item.opening_balance_entry_id || item.item_master_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.nomenclature}</div>
                          <div className="text-sm text-gray-500">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{item.category_name || 'N/A'}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700 font-medium">
                        {formatNumber(item.total_received)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700 font-medium">
                        {formatNumber(item.total_issued)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-base font-semibold text-purple-600">
                          {formatNumber(item.opening_balance_quantity)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-base font-semibold text-blue-600">
                          {formatNumber(item.new_acquisition_quantity)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className={`text-lg font-bold ${getQuantityColor(item.total_quantity)}`}>
                          {formatNumber(item.total_quantity)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(item.total_quantity)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(item.last_transaction_date)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="outline" size="icon" onClick={() => loadItemDetails(item)} aria-label="Open item details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailItem ? `${detailItem.nomenclature} (${detailItem.item_code})` : 'Item Details'}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-gray-600">Loading details...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Opening Balance</p>
                    <p className="text-2xl font-bold text-purple-600">{formatNumber(detailSummary?.opening_balance_remaining ?? detailItem?.opening_balance_quantity ?? 0)}</p>
                    <p className="text-xs text-gray-500">Procured: {formatNumber(detailSummary?.opening_balance_procured ?? detailItem?.total_received ?? 0)} | Issued: {formatNumber(detailSummary?.opening_balance_issued ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">New Acquisition</p>
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(detailSummary?.acquisition_remaining ?? detailItem?.new_acquisition_quantity ?? 0)}</p>
                    <p className="text-xs text-gray-500">Procured: {formatNumber(detailSummary?.acquisition_procured ?? 0)} | Issued: {formatNumber(detailSummary?.acquisition_issued ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{formatNumber(detailSummary?.pending_quantity ?? 0)}</p>
                    <p className="text-xs text-gray-500">Requests: {formatNumber(detailSummary?.pending_count ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Procured</p>
                    <p className="text-xl font-bold text-green-600">{formatNumber(detailSummary?.total_procured ?? detailItem?.total_received ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Issued</p>
                    <p className="text-xl font-bold text-red-600">{formatNumber(detailSummary?.total_issued ?? detailItem?.total_issued ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Stock</p>
                    <p className="text-xl font-bold text-green-700">{formatNumber(detailSummary?.total_stock ?? detailItem?.total_quantity ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Opening Entries</p>
                    <p className="text-xl font-bold text-gray-700">{formatNumber(detailSummary?.opening_balance_count ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Movement</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left">Delivery / Acquisition</th>
                        <th className="p-3 text-left">Source</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailHistory.length === 0 ? (
                        <tr>
                          <td className="p-4 text-center text-gray-500" colSpan={4}>No movement history found</td>
                        </tr>
                      ) : detailHistory.map((row, index) => (
                        <tr key={`${row.delivery_number || row.acquisition_number || index}`} className="border-t">
                          <td className="p-3">{row.delivery_number || row.acquisition_number || 'N/A'}</td>
                          <td className="p-3">{row.po_number || row.delivery_personnel || 'Opening Balance'}</td>
                          <td className="p-3 text-right">{formatNumber(row.delivery_qty || 0)}</td>
                          <td className="p-3">{formatDate(row.receiving_date || row.acquisition_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockQuantitiesPage;
