import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Package } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatDateDMY(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

interface StockTransactionItem {
  id: string;
  item_master_id: string;
  estimated_unit_price?: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  // Item details from the view (already joined)
  nomenclature: string;
  category_id: string;
  sub_category_id: string;
  sub_category_name: string;
  // Organizational information from the view
  office_ids?: string;
  wing_ids?: string;
  dec_ids?: string;
  unit?: string;
}

interface TenderInfo {
  id: string;
  title: string;
  reference_number: string;
  tender_number?: string;
  tender_date?: string;
  created_at?: string;
  vendor_name?: string;
  office_names?: string;
  wing_names?: string;
  dec_names?: string;
}

const StockAcquisitionReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenderInfo, setTenderInfo] = useState<TenderInfo | null>(null);
  const [stockItems, setStockItems] = useState<StockTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Get tender basic information from SQL Server
      const tenderResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tenders/${id}`);
      
      if (!tenderResponse.ok) {
        throw new Error('Tender not found');
      }
      
      const tender = await tenderResponse.json();

      // Step 2: Get stock transactions with all joined data from the SQL Server view
      const stockResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/view-stock-transactions-clean?tender_id=${id}`);
      
      if (!stockResponse.ok) {
        throw new Error(`Failed to fetch stock transactions: ${stockResponse.statusText}`);
      }
      
      const stockTransactions = await stockResponse.json();

      // Debug: Show all field names and values in the first record from the view
      if (stockTransactions && stockTransactions.length > 0) {
        const firstRecord = stockTransactions[0];
        Object.keys(firstRecord).forEach(key => {
          });
      }

      if (!stockTransactions || stockTransactions.length === 0) {
        setTenderInfo(tender);
        setStockItems([]);
        return;
      }

      // Step 3: Process the data directly from the SQL Server view (no additional queries needed)
      const enrichedItems: StockTransactionItem[] = [];

      for (const stockItem of stockTransactions) {
        const processedItem: StockTransactionItem = {
          id: stockItem.id,
          item_master_id: stockItem.item_master_id,
          actual_unit_price: parseFloat(stockItem.actual_unit_price) || 0,
          total_quantity_received: parseInt(stockItem.total_quantity_received) || 0,
          pricing_confirmed: stockItem.pricing_confirmed || false,
          nomenclature: stockItem.nomenclature || 'Unknown Item',
          category_id: stockItem.category_id || '',
          sub_category_id: stockItem.sub_category_id || '',
          sub_category_name: stockItem.sub_category_name || 'Unknown Category',
          unit: 'Units' // You can add unit to the view if needed
        };

        enrichedItems.push(processedItem);
      }

      // Step 4: Get vendor and office information - names are already resolved in View_tenders
      // Debug: Log the entire tender object
      // Use vendor information from tender data or set default
      let vendorName = tender.vendor_name || 'Unknown Vendor';

      // Use the already resolved names from View_tenders
      let officeNames = tender.office_names || '';
      let wingNames = tender.wing_names || '';
      let decNames = tender.dec_names || '';

      // Set final data
      setTenderInfo({
        ...tender,
        vendor_name: vendorName,
        office_names: officeNames,
        wing_names: wingNames,
        dec_names: decNames
      });
      setStockItems(enrichedItems);

      } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'PKR 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExport = () => {
    };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock acquisition report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Error: {error}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!tenderInfo) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Tender not found</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              Stock Acquisition Report
            </h1>
          </div>
          <p className="text-gray-600">
            Detailed report for tender: {tenderInfo.title || 'Untitled'}
          </p>
        </div>
        <div className="flex gap-3 ml-6">
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tender Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tender Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Tender Number</div>
              <div className="text-lg font-semibold">{tenderInfo.tender_number || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Reference Number</div>
              <div className="text-lg font-semibold">{tenderInfo.reference_number || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Tender Date</div>
              <div className="text-lg font-semibold">{formatDateDMY(tenderInfo.tender_date)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Vendor</div>
              <div className="text-lg font-semibold">{tenderInfo.vendor_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Offices</div>
              <div className="text-lg font-semibold">{tenderInfo.office_names || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Wings</div>
              <div className="text-lg font-semibold">{tenderInfo.wing_names || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">DECs</div>
              <div className="text-lg font-semibold">{tenderInfo.dec_names || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Created Date</div>
              <div className="text-lg font-semibold">{formatDateDMY(tenderInfo.created_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Items ({stockItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No stock transactions found for this tender</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Details</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.nomenclature}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{item.sub_category_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.total_quantity_received}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.unit || 'Units'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatCurrency(item.actual_unit_price)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatCurrency(item.actual_unit_price * item.total_quantity_received)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={item.pricing_confirmed 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {item.pricing_confirmed ? 'Confirmed' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {stockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Total Items</div>
                <div className="text-2xl font-bold">{stockItems.length}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Quantity</div>
                <div className="text-2xl font-bold">
                  {stockItems.reduce((sum, item) => sum + item.total_quantity_received, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Actual Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    stockItems.reduce((sum, item) => 
                      sum + (item.actual_unit_price * item.total_quantity_received), 0
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockAcquisitionReport;
