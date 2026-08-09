// Enhanced Stock Acquisition Report - Shows current data + unified inventory
// This is a PREVIEW of how the enhanced system will work
// Your current report continues to work exactly as before

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, Package, ArrowLeft, Layers } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import { supabase } from '@/integrations/supabase/client';
import { Tender } from '@/types/tender';
import { itemMasterApi } from '@/services/itemMasterApi';

// Helper to format date as dd/mm/yyyy (same as your current version)
function formatDateDMY(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const EnhancedStockAcquisitionReport: React.FC = () => {
  const { intOfficeID } = useParams<{ intOfficeID: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryLevels, setInventoryLevels] = useState<{ [key: string]: any }>({});
  const [showUnifiedView, setShowUnifiedView] = useState(false);

  useEffect(() => {
    if (intOfficeID) {
      fetchData();
    }
  }, [intOfficeID]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 🔄 EXACT SAME LOGIC AS YOUR CURRENT WORKING VERSION
      // This preserves all your current functionality
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .select(`
          *,
          items:tender_items(*)
        `)
        .eq('intOfficeID', intOfficeID)
        .single();

      if (tenderError) throw tenderError;

      // Fetch vendor/office/wing info (same as current)
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

      // Office and wing info (same logic as current)
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

      tenderData.vendorInfo = vendorInfo;
      tenderData.officeInfo = officeInfo;
      tenderData.wingInfo = wingInfo;

      // Stock transactions (same as current)
      const { data: stockTransactions, error: stockError } = await supabase
        .from('stock_transactions')
        .select('*')
        .or(`tender_ref.eq.${tenderData.tenderNumber},tender_ref.eq.${tenderData.intOfficeID}`);

      // Process items (same logic as current)
      if (tenderData.items) {
        const enhancedItems = tenderData.items.map(item => {
          const itemTransactions = stockTransactions?.filter(st => 
            st.item === item.nomenclature || 
            st.item.toLowerCase().includes(item.nomenclature.toLowerCase()) ||
            item.nomenclature.toLowerCase().includes(st.item.toLowerCase())
          ) || [];
          
          let actualQuantity = 0;
          let actualUnitPrice = 0;
          
          if (itemTransactions.length > 0) {
            actualQuantity = itemTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
            const actualTotalValue = itemTransactions.reduce((sum, tx) => sum + (tx.total_value || 0), 0);
            actualUnitPrice = actualQuantity > 0 ? actualTotalValue / actualQuantity : (item.estimatedUnitPrice || 0);
          } else {
            actualQuantity = item.quantity_received || item.quantityReceived || 0;
            actualUnitPrice = item.actual_unit_price || item.actualUnitPrice || item.estimatedUnitPrice || 0;
          }
          
          return {
            ...item,
            quantityReceived: actualQuantity,
            actualUnitPrice: actualUnitPrice,
            stockTransactions: itemTransactions
          };
        });
        
        tenderData.items = enhancedItems;
      }

      setTender(tenderData);

      // 🆕 NEW: ALSO FETCH UNIFIED INVENTORY LEVELS (Optional Enhancement)
      if (tenderData.items) {
        const inventoryData: { [key: string]: any } = {};
        
        for (const item of tenderData.items) {
          try {
            // Try to get unified inventory level for this item
            const { data: inventory, error: invError } = await supabase
              .from('inventory_stock')
              .select('*')
              .or(`item_master_id.eq.${item.item_master_id || item.nomenclature},nomenclature.ilike.%${item.nomenclature}%`)
              .limit(1)
              .single();
            
            if (!invError && inventory) {
              inventoryData[item.nomenclature] = inventory;
            }
          } catch (error) {
            // Ignore errors - unified inventory is optional enhancement
          }
        }
        
        setInventoryLevels(inventoryData);
      }

    } catch (error: any) {
      
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 SAME CALCULATION FUNCTIONS AS YOUR CURRENT VERSION
  const calculateTotalValue = () => {
    if (!tender?.items) return 0;
    return tender.items.reduce((total, item) => {
      const qty = item.quantityReceived || 0;
      const price = item.actualUnitPrice || item.estimatedUnitPrice || 0;
      return total + (qty * price);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ErrorState message="Tender not found" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced nav with unified inventory toggle */}
      <nav className="w-full bg-white border-b px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">Enhanced Stock Acquisition Report</div>
          <div className="flex gap-2">
            <Button 
              variant={showUnifiedView ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowUnifiedView(!showUnifiedView)}
            >
              <Layers className="w-4 h-4 mr-2" />
              {showUnifiedView ? 'Current View' : 'Unified View'}
            </Button>
            <Button variant="outline" size="icon" title="Export to Excel">
              <Download />
            </Button>
            <Button variant="outline" size="icon" title="Print Report" onClick={() => window.print()}>
              <Printer />
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
          <a href="/stock-transactions" className="text-blue-700 hover:underline">Back to Stock Transactions</a>
          <a href="/tenders/" className="text-blue-700 hover:underline">All Tenders</a>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              Enhanced Stock Acquisition Report
              {showUnifiedView && <Badge variant="secondary">Unified Inventory View</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Same header info as your current version */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="font-semibold text-lg">{tender.title}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reference Number</div>
                <div className="font-semibold">{(tender as any).reference_number || '-'}</div>
              </div>
              {/* ... All other header fields same as current ... */}
              <div>
                <div className="text-xs text-muted-foreground">Actual Received Value (Live Data)</div>
                <div>Rs. {calculateTotalValue().toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div>{(tender as any).vendorInfo?.vendor_name || '-'}</div>
              </div>
            </div>

            {/* Enhanced Items Table */}
            <div className="mb-6">
              <div className="font-semibold mb-2">
                {showUnifiedView ? 'Stock Acquisition Items (Unified Inventory)' : 'Stock Acquisition Items (Current System)'}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Nomenclature</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Received Quantity</th>
                      {showUnifiedView && (
                        <>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Current Stock</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Total Issued</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Unit Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tender.items && tender.items.length > 0 ? (
                      tender.items.map((item, idx) => {
                        const actualQuantity = item.quantityReceived || 0;
                        const actualPrice = item.actualUnitPrice || item.estimatedUnitPrice || 0;
                        const actualTotal = actualQuantity * actualPrice;
                        const inventory = inventoryLevels[item.nomenclature];
                        
                        return (
                          <tr key={item.intOfficeID} className="border-b last:border-b-0">
                            <td className="px-3 py-2 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2 text-sm">{item.nomenclature}</td>
                            <td className="px-3 py-2 text-sm">{actualQuantity}</td>
                            {showUnifiedView && inventory && (
                              <>
                                <td className="px-3 py-2 text-sm">
                                  <span className={inventory.current_stock < inventory.minimum_stock_level ? 'text-red-600 font-semibold' : ''}>
                                    {inventory.current_stock}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm">{inventory.total_issued}</td>
                              </>
                            )}
                            {showUnifiedView && !inventory && (
                              <>
                                <td className="px-3 py-2 text-sm text-gray-400">-</td>
                                <td className="px-3 py-2 text-sm text-gray-400">-</td>
                              </>
                            )}
                            <td className="px-3 py-2 text-sm">Rs. {actualPrice.toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm">Rs. {actualTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={showUnifiedView ? 7 : 5} className="text-center text-xs py-4">No items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note about the enhancement */}
            {showUnifiedView && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>🆕 Unified Inventory View:</strong> This shows your acquisition data integrated with overall stock levels. 
                  Items in red are below minimum stock levels and may need reordering.
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EnhancedStockAcquisitionReport;
