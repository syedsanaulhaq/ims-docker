import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileText, Package, TrendingUp, Calendar, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to format date
const formatDateDMY = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

interface DeliveryRecord {
  intOfficeID: string;
  delivery_number: number;
  tender_intOfficeID: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  CreatedAt: string;
  UpdatedAt: string;
  delivery_items: {
    intOfficeID: string;
    delivery_intOfficeID: string;
    item_master_intOfficeID: string;
    item_strOfficeName: string;
    proper_item_name?: string;
    delivery_qty: number;
    item_masters?: {
      intOfficeID: string;
      nomenclature: string;
    };
  }[];
}

interface TenderData {
  intOfficeID: string;
  tenderNumber: string;
  strOfficeDescription: string;
  vendor_id?: string;
  vendorInfo?: { vendor_strOfficeName: string };
  office_ids?: string[];
  officeInfo?: string;
  wing_ids?: string[];
  wingInfo?: string;
  CreatedAt: string;
  items: TenderItem[];
}

interface TenderItem {
  intOfficeID: string;
  nomenclature: string;
  itemMasterId?: string;
  estimatedUnitPrice: number;
  actualUnitPrice?: number;
  totalQty: number;
  unit: string;
  categoryName?: string;
  subCategoryName?: string;
  deliveredQty?: number;
  deliveries?: any[];
  hasDeliveries?: boolean;
  stockTransactionData?: any;
  pricingConfirmed?: boolean;
  totalQuantityReceived?: number;
}

const downloadCSV = (tender: TenderData) => {
  const totalDeliveredValue = tender.items?.reduce((sum, item) => {
    const deliveredQty = item.deliveredQty || 0;
    const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
    return sum + (deliveredQty * actualPrice);
  }, 0) || 0;

  const rows = [
    ['Delivery Report'],
    ['Tender Number', tender.tenderNumber || '-'],
    ['Vendor', tender.vendorInfo?.vendor_name || '-'],
    ['Office(s)', tender.officeInfo || '-'],
    ['Wing(s)', tender.wingInfo || '-'],
    ['Report Generated', formatDateDMY(new Date().toISOString())],
    ['Description', tender.strOfficeDescription || '-'],
    ['Total Delivered Value', formatCurrency(totalDeliveredValue)],
    [],
    ['#', 'Item Name', 'Total Qty', 'Delivered Qty', 'Pending Qty', 'Unit Price', 'Delivered Value', 'Status'],
    ...(tender.items || []).map((item, idx) => {
      const deliveredQty = item.deliveredQty || 0;
      const pendingQty = (item.totalQty || 0) - deliveredQty;
      const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
      const deliveredValue = deliveredQty * actualPrice;
      const status = deliveredQty === 0 ? 'Pending' : 
                    deliveredQty >= (item.totalQty || 0) ? 'Complete' : 'Partial';
      
      return [
        idx + 1,
        item.nomenclature || '',
        item.totalQty || 0,
        deliveredQty,
        pendingQty,
        actualPrice,
        deliveredValue,
        status
      ];
    })
  ];
  
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DeliveryReport-${tender.tenderNumber || tender.intOfficeID}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

const DeliveryReport: React.FC = () => {
  const { intOfficeID } = useParams<{ intOfficeID: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tender, setTender] = useState<TenderData | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (intOfficeID) {
      fetchData();
    }
  }, [intOfficeID]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch tender data
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .select(`
          *,
          items:tender_items(*)
        `)
        .eq('intOfficeID', intOfficeID)
        .single();

      if (tenderError) throw tenderError;

      // Fetch vendor information
      let vendorInfo = null;
      if (tenderData.vendor_id) {
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('vendor_name')
          .eq('intOfficeID', tenderData.vendor_id)
          .single();
        
        if (!vendorError && vendor) {
          vendorInfo = vendor;
        }
      }

      // Fetch office information
      let officeInfo = null;
      if (tenderData.office_ids && tenderData.office_ids.length > 0) {
        const { data: offices, error: officeError } = await supabase
          .from('tblOffices')
          .select('strOfficeName')
          .in('intOfficeID', tenderData.office_ids);
        
        if (!officeError && offices && offices.length > 0) {
          officeInfo = offices.map(o => o.strOfficeName).join(', ');
        }
      }

      // Fetch wing information
      let wingInfo = null;
      if (tenderData.wing_ids && tenderData.wing_ids.length > 0) {
        const { data: wings, error: wingError } = await supabase
          .from('WingsInformation')
          .select('strOfficeName')
          .in('intOfficeID', tenderData.wing_ids);
        
        if (!wingError && wings && wings.length > 0) {
          wingInfo = wings.map(w => w.strOfficeName).join(', ');
        }
      }

      // Add the fetched information to tender data
      tenderData.vendorInfo = vendorInfo;
      tenderData.officeInfo = officeInfo;
      tenderData.wingInfo = wingInfo;
      
      // Map database field strOfficeName to expected interface
      tenderData.tenderNumber = tenderData.tender_number || tenderData.tenderNumber;

      // Fetch stock transactions (where the actual pricing and quantity data is stored)
      const { data: stockTransactions, error: stockError } = await supabase
        .from('stock_transactions_clean')
        .select('*')
        .eq('tender_id', tenderData.intOfficeID)
        .eq('IS_DELETED', false);

      if (stockError) {
        
      }

      // Fetch delivery data for this tender (from deliveries and delivery_items tables)
      const { data: deliveriesData, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          delivery_items(*)
        `)
        .eq('tender_id', tenderData.intOfficeID)
        .order('delivery_number', { ascending: false });

      if (deliveryError) {
        throw deliveryError;
      }

      // Fetch all item_masters to get proper nomenclature
      const { data: itemMastersData, error: itemMastersError } = await supabase
        .from('item_masters')
        .select('intOfficeID, nomenclature');

      if (itemMastersError) {}

      // Create a map for quick lookup of item names
      const itemNamesMap = new Map();
      if (itemMastersData) {
        itemMastersData.forEach(item => {
          itemNamesMap.set(item.intOfficeID, item.nomenclature);
        });
      }

      // Enhance deliveries data with proper item names from item_masters
      const enhancedDeliveriesData = deliveriesData?.map(delivery => ({
        ...delivery,
        delivery_items: delivery.delivery_items?.map(item => {
          const properName = itemNamesMap.get(item.item_master_id);
          return {
            ...item,
            // Use nomenclature from item_masters instead of stored item_name
            proper_item_strOfficeName: properName || item.item_name,
            item_masters: itemMastersData?.find(im => im.intOfficeID === item.item_master_id)
          };
        })
      }));

      setDeliveries(enhancedDeliveriesData || []);

      // Also fetch tender items for base quantities
      const { data: tenderItemsData, error: tenderItemsError } = await supabase
        .from('tender_items')
        .select('*')
        .eq('tender_id', tenderData.intOfficeID);

      if (tenderItemsError) {
        
      }

      // Process items with stock transaction data (this is the source of truth for pricing and quantities)
      if (stockTransactions && stockTransactions.length > 0) {
        const enhancedItems = stockTransactions.map(stockItem => {
          // Find matching tender item for base info
          const tenderItem = tenderItemsData?.find(ti => ti.item_master_id === stockItem.item_master_id) || tenderData.items?.find(ti => ti.itemMasterId === stockItem.item_master_id);
          
          // Calculate delivery quantities from delivery_items
          let totalDeliveredQty = 0;
          let deliveryData: any[] = [];
          
          if (enhancedDeliveriesData && enhancedDeliveriesData.length > 0) {
            enhancedDeliveriesData.forEach(delivery => {
              const deliveryItems = delivery.delivery_items || [];
              deliveryItems.forEach(deliveryItem => {
                if (deliveryItem.item_master_id === stockItem.item_master_id) {
                  totalDeliveredQty += deliveryItem.delivery_qty || 0;
                  deliveryData.push({
                    ...deliveryItem,
                    // Use proper item strOfficeName from item_masters
                    item_strOfficeName: deliveryItem.proper_item_name || deliveryItem.item_masters?.nomenclature || deliveryItem.item_name,
                    delivery_number: delivery.delivery_number,
                    delivery_date: delivery.delivery_date,
                    delivery_chalan: delivery.delivery_chalan,
                    delivery_personnel: delivery.delivery_personnel
                  });
                }
              });
            });
          }
          
          return {
            intOfficeID: stockItem.intOfficeID || stockItem.item_master_id,
            nomenclature: itemNamesMap.get(stockItem.item_master_id) || stockItem.nomenclature || tenderItem?.nomenclature || 'Unknown Item',
            itemMasterId: stockItem.item_master_id,
            estimatedUnitPrice: stockItem.estimated_unit_price || tenderItem?.estimatedUnitPrice || 0,
            actualUnitPrice: stockItem.actual_unit_price || stockItem.estimated_unit_price || 0,
            totalQty: stockItem.quantity || tenderItem?.quantity || tenderItem?.totalQty || 0,
            unit: tenderItem?.unit || 'PCS',
            categoryName: tenderItem?.categoryName,
            subCategoryName: tenderItem?.subCategoryName,
            deliveredQty: totalDeliveredQty,
            deliveries: deliveryData,
            hasDeliveries: deliveryData.length > 0,
            stockTransactionData: stockItem,
            pricingConfirmed: stockItem.pricing_confirmed || false,
            totalQuantityReceived: stockItem.total_quantity_received || 0
          };
        });
        
        tenderData.items = enhancedItems;
      } else if (tenderData.items) {
        // Fallback: No stock transactions yet, use tender items
        const enhancedItems = tenderData.items.map(item => {
          // Calculate delivery quantities from delivery_items
          let totalDeliveredQty = 0;
          let deliveryData: any[] = [];
          
          if (enhancedDeliveriesData && enhancedDeliveriesData.length > 0) {
            enhancedDeliveriesData.forEach(delivery => {
              const deliveryItems = delivery.delivery_items || [];
              deliveryItems.forEach(deliveryItem => {
                if (deliveryItem.item_master_id === item.itemMasterId) {
                  totalDeliveredQty += deliveryItem.delivery_qty || 0;
                  deliveryData.push({
                    ...deliveryItem,
                    // Use proper item strOfficeName from item_masters
                    item_strOfficeName: deliveryItem.proper_item_name || deliveryItem.item_masters?.nomenclature || deliveryItem.item_name,
                    delivery_number: delivery.delivery_number,
                    delivery_date: delivery.delivery_date,
                    delivery_chalan: delivery.delivery_chalan,
                    delivery_personnel: delivery.delivery_personnel
                  });
                }
              });
            });
          }
          
          return {
            ...item,
            // Update nomenclature with proper strOfficeName from item_masters
            nomenclature: itemNamesMap.get(item.itemMasterId) || item.nomenclature,
            deliveredQty: totalDeliveredQty,
            actualUnitPrice: item.estimatedUnitPrice || 0,
            deliveries: deliveryData,
            hasDeliveries: deliveryData.length > 0,
            stockTransactionData: null,
            pricingConfirmed: false,
            totalQuantityReceived: 0
          };
        });
        
        tenderData.items = enhancedItems;
      }

      setTender(tenderData);

    } catch (error: any) {
      
      setError(error.message || 'Failed to load data');
      toast({
        title: "Error",
        strOfficeDescription: "Failed to load delivery report data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery report...</p>
        </div>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error || 'Tender not found'}</p>
          <Button 
            onClick={() => navigate('/transaction-manager')} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transaction Manager
          </Button>
        </div>
      </div>
    );
  }

  const totalDeliveredValue = tender.items?.reduce((sum, item) => {
    const deliveredQty = item.deliveredQty || 0;
    const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
    return sum + (deliveredQty * actualPrice);
  }, 0) || 0;

  const totalPendingValue = tender.items?.reduce((sum, item) => {
    const pendingQty = (item.totalQty || 0) - (item.deliveredQty || 0);
    const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
    return sum + (pendingQty * actualPrice);
  }, 0) || 0;

  const completedItems = tender.items?.filter(item => (item.deliveredQty || 0) >= (item.totalQty || 0)).length || 0;
  const totalItems = tender.items?.length || 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Button 
              onClick={() => navigate('/transaction-manager')} 
              variant="outline" 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Transaction Manager
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Report</h1>
            <p className="text-gray-600 mt-1">Tender: {tender.tenderNumber} - Comprehensive delivery status for tender items</p>
          </div>
          <Button 
            onClick={() => downloadCSV(tender)} 
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-2xl font-bold text-blue-600">{deliveries.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{completedItems}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{totalItems - completedItems}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tender Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Tender Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Tender Number</p>
                <p className="text-lg font-semibold">{tender.tenderNumber}</p>
              </div>
              {tender.vendorInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendor</p>
                  <p className="text-lg font-semibold">{tender.vendorInfo.vendor_name}</p>
                </div>
              )}
              {tender.officeInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Office(s)</p>
                  <p className="text-lg font-semibold">{tender.officeInfo}</p>
                </div>
              )}
              {tender.wingInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Wing(s)</p>
                  <p className="text-lg font-semibold">{tender.wingInfo}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600">Created Date</p>
                <p className="text-lg font-semibold">{formatDateDMY(tender.CreatedAt)}</p>
              </div>
              {tender.strOfficeDescription && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-lg">{tender.strOfficeDescription}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items Delivery Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Items Delivery Status</span>
            </CardTitle>
            <CardDescription>
              Detailed breakdown of delivery status for each item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Delivered Value</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tender.items?.map((item, index) => {
                    const deliveredQty = item.deliveredQty || 0;
                    const pendingQty = (item.totalQty || 0) - deliveredQty;
                    const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
                    const deliveredValue = deliveredQty * actualPrice;
                    const status = deliveredQty === 0 ? 'pending' : 
                                  deliveredQty >= (item.totalQty || 0) ? 'complete' : 'partial';
                    
                    return (
                      <TableRow key={item.intOfficeID}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.nomenclature}</p>
                            {item.categoryName && (
                              <p className="text-sm text-gray-500">{item.categoryName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalQty} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {deliveredQty} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {pendingQty} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(actualPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(deliveredValue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              status === 'complete' ? 'default' : 
                              status === 'partial' ? 'secondary' : 'outline'
                            }
                            className={
                              status === 'complete' ? 'bg-green-100 text-green-800' :
                              status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {status === 'complete' ? 'Complete' :
                             status === 'partial' ? 'Partial' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        {deliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Recent Deliveries</span>
              </CardTitle>
              <CardDescription>
                Latest delivery transactions for this tender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveries.slice(0, 5).map((delivery) => (
                  <div key={delivery.intOfficeID} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">Delivery #{delivery.delivery_number}</h4>
                        <p className="text-sm text-gray-600">
                          <Calendar className="inline w-4 h-4 mr-1" />
                          {formatDateDMY(delivery.delivery_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          <User className="inline w-4 h-4 mr-1" />
                          {delivery.delivery_personnel}
                        </p>
                        {delivery.delivery_chalan && (
                          <p className="text-sm font-medium text-blue-600">
                            Chalan: {delivery.delivery_chalan}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items delivered:</p>
                      <div className="space-y-1">
                        {delivery.delivery_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.proper_item_name || item.item_masters?.nomenclature || item.item_name}</span>
                            <span className="font-medium">{item.delivery_qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {delivery.delivery_notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {delivery.delivery_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {deliveries.length > 5 && (
                  <p className="text-center text-gray-500 text-sm">
                    ... and {deliveries.length - 5} more deliveries
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DeliveryReport;
