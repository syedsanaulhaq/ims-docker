import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Package } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

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
  estimated_unit_price: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  // Item details from item_masters
  nomenclature: string;
  category_name: string;
  subcategory_name: string;
  unit: string;
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

      // Step 1: Get tender basic information
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();

      if (tenderError) {
        console.error('Tender fetch error:', tenderError);
        throw new Error('Tender not found');
      }

      // Step 2: Get stock transactions for this tender
      const { data: stockTransactions, error: stockError } = await supabase
        .from('stock_transactions_clean')
        .select('*')
        .eq('tender_id', id);

      if (stockError) {
        console.error('Stock transactions fetch error:', stockError);
        throw new Error('Failed to fetch stock transactions');
      }

      if (!stockTransactions || stockTransactions.length === 0) {
        setTenderInfo(tender);
        setStockItems([]);
        return;
      }

      // Step 3: Get item details for each stock transaction
      const enrichedItems: StockTransactionItem[] = [];

      for (const stockItem of stockTransactions) {
        let itemDetails = {
          nomenclature: 'Unknown Item',
          category_name: 'Unknown',
          subcategory_name: 'Unknown',
          unit: 'Units'
        };

        // Get item master details
        if (stockItem.item_master_id) {
          try {
            const { data: itemMaster, error: itemError } = await supabase
              .from('item_masters')
              .select('nomenclature, unit, category_id, sub_category_id')
              .eq('id', stockItem.item_master_id)
              .single();

            if (!itemError && itemMaster) {
              itemDetails.nomenclature = itemMaster.nomenclature || 'Unknown Item';
              itemDetails.unit = itemMaster.unit || 'Units';

              // Get category name if exists
              if (itemMaster.category_id) {
                try {
                  const { data: category, error: catError } = await supabase
                    .from('categories')
                    .select('category_name')
                    .eq('id', itemMaster.category_id)
                    .single();
                  
                  if (!catError && category) {
                    itemDetails.category_name = category.category_name;
                  }
                } catch (catErr) {
                  }
              }

              // Get subcategory name if exists
              if (itemMaster.sub_category_id) {
                try {
                  const { data: subcategory, error: subError } = await supabase
                    .from('subcategories')
                    .select('subcategory_name')
                    .eq('id', itemMaster.sub_category_id)
                    .single();
                  
                  if (!subError && subcategory) {
                    itemDetails.subcategory_name = subcategory.subcategory_name;
                  }
                } catch (subErr) {
                  }
              }
            } else {
              }
          } catch (err) {
            console.error('Error fetching item master:', err);
          }
        }

        // Create enriched item
        enrichedItems.push({
          id: stockItem.id,
          item_master_id: stockItem.item_master_id,
          estimated_unit_price: stockItem.estimated_unit_price || 0,
          actual_unit_price: stockItem.actual_unit_price || 0,
          total_quantity_received: stockItem.total_quantity_received || 0,
          pricing_confirmed: stockItem.pricing_confirmed || false,
          nomenclature: itemDetails.nomenclature,
          category_name: itemDetails.category_name,
          subcategory_name: itemDetails.subcategory_name,
          unit: itemDetails.unit
        });
      }

      // Step 4: Get vendor and office information
      let vendorName = '';
      let officeNames = '';

      if (tender.vendor_id) {
        try {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('vendor_name')
            .eq('intOfficeID', tender.vendor_id)
            .single();
          
          if (vendor) {
            vendorName = vendor.vendor_name;
          }
        } catch (err) {
          }
      }

      if (tender.office_ids && tender.office_ids.length > 0) {
        try {
          const { data: offices } = await supabase
            .from('tblOffices')
            .select('strOfficeName')
            .in('intOfficeID', tender.office_ids);
          
          if (offices && offices.length > 0) {
            officeNames = offices.map(office => office.strOfficeName).join(', ');
          }
        } catch (err) {
          }
      }

      // Set final data
      setTenderInfo({
        ...tender,
        vendor_name: vendorName,
        office_names: officeNames
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
                    <TableHead>Est. Price</TableHead>
                    <TableHead>Actual Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.nomenclature}</div>
                          <div className="text-sm text-gray-500">ID: {item.item_master_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{item.category_name}</div>
                          <div className="text-gray-500">{item.subcategory_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.total_quantity_received}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.unit}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatCurrency(item.estimated_unit_price)}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="text-sm font-medium text-gray-500">Total Estimated Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    stockItems.reduce((sum, item) => 
                      sum + (item.estimated_unit_price * item.total_quantity_received), 0
                    )
                  )}
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
