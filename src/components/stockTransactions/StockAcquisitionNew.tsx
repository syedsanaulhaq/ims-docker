import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Truck, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tender, TenderItem } from '@/types/tender';
import DeliveryManager from './DeliveryManagerClean';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Delivery interfaces
interface DeliveryItem {
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
}

interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_items: DeliveryItem[];
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
}

// Component props
interface StockAcquisitionProps {
  tender: Tender;
  onItemsUpdate?: (items: TenderItem[]) => void;
  onAcquisitionComplete?: () => void;
}

const StockAcquisition: React.FC<StockAcquisitionProps> = ({ 
  tender, 
  onItemsUpdate, 
  onAcquisitionComplete 
}) => {
  const { toast } = useToast();
  
  // State management
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [actualPrices, setActualPrices] = useState<Record<string, number>>({});
  const [showDeliveryManager, setShowDeliveryManager] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load deliveries from localStorage
  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(`deliveries_${tender.id}`);
      if (stored) {
        const parsedDeliveries = JSON.parse(stored);
        setDeliveries(Array.isArray(parsedDeliveries) ? parsedDeliveries : []);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  // Load actual prices from localStorage
  const loadActualPrices = async () => {
    try {
      const stored = localStorage.getItem(`actual_prices_${tender.id}`);
      if (stored) {
        const parsedPrices = JSON.parse(stored);
        setActualPrices(parsedPrices || {});
      }
    } catch (error) {
      
    }
  };

  // Initial data loading
  useEffect(() => {
    loadDeliveries();
    loadActualPrices();
  }, [tender.id]);

  // Calculate delivery quantities per item
  const deliveryQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    
    deliveries.forEach(delivery => {
      if (delivery.delivery_items && Array.isArray(delivery.delivery_items)) {
        delivery.delivery_items.forEach(item => {
          if (!quantities[item.item_master_id]) {
            quantities[item.item_master_id] = 0;
          }
          quantities[item.item_master_id] += item.delivery_qty;
        });
      }
    });
    
    return quantities;
  }, [deliveries]);

  // Handle actual price changes
  const handleActualPriceChange = (itemId: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const updatedPrices = { ...actualPrices, [itemId]: numericValue };
    setActualPrices(updatedPrices);
    
    // Save to localStorage
    localStorage.setItem(`actual_prices_${tender.id}`, JSON.stringify(updatedPrices));
    
    toast({
      title: "Price Updated",
      description: "Actual unit price has been saved",
    });
  };

  // Get item status and progress
  const getItemStatus = (item: TenderItem) => {
    const delivered = deliveryQuantities[item.itemMasterId] || 0;
    const remaining = item.quantity - delivered;
    const progress = item.quantity > 0 ? (delivered / item.quantity) * 100 : 0;
    
    if (delivered === 0) {
      return { 
        status: 'Not Started', 
        variant: 'secondary' as const, 
        progress: 0,
        color: 'bg-gray-200' 
      };
    } else if (remaining > 0) {
      return { 
        status: `${Math.round(progress)}% Complete`, 
        variant: 'default' as const, 
        progress,
        color: 'bg-blue-500' 
      };
    } else {
      return { 
        status: 'Complete', 
        variant: 'default' as const, 
        progress: 100,
        color: 'bg-green-500' 
      };
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalEstimatedValue = 0;
    let totalActualValue = 0;
    let totalDeliveredValue = 0;
    let completedItems = 0;
    let partialItems = 0;
    let pendingItems = 0;

    tender.items.forEach(item => {
      const estimatedUnitPrice = (item.estimatedUnitPrice || 0) / item.quantity;
      const actualUnitPrice = actualPrices[item.itemMasterId] || 0;
      const delivered = deliveryQuantities[item.itemMasterId] || 0;
      
      totalEstimatedValue += item.estimatedUnitPrice || 0;
      totalActualValue += actualUnitPrice * item.quantity;
      totalDeliveredValue += actualUnitPrice * delivered;
      
      if (delivered === 0) {
        pendingItems++;
      } else if (delivered < item.quantity) {
        partialItems++;
      } else {
        completedItems++;
      }
    });

    return {
      totalEstimatedValue,
      totalActualValue,
      totalDeliveredValue,
      completedItems,
      partialItems,
      pendingItems,
      totalDeliveries: deliveries.length
    };
  }, [tender.items, actualPrices, deliveryQuantities, deliveries]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-6 w-6 text-blue-600" />
                  <span>Stock Acquisition Management</span>
                </CardTitle>
                <CardDescription>
                  Track stock acquisition through delivery records for tender: <strong>{tender.tenderNumber}</strong>
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowDeliveryManager(!showDeliveryManager)}
                className={`${showDeliveryManager ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'} hover:bg-blue-700 hover:text-white`}
                variant={showDeliveryManager ? 'default' : 'outline'}
              >
                <Truck className="h-4 w-4 mr-2" />
                {showDeliveryManager ? 'Hide' : 'Manage'} Deliveries
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Delivery Manager */}
        {showDeliveryManager && (
          <Card>
            <CardContent className="pt-6">
              <DeliveryManager 
                tender={tender}
                onDeliveryUpdate={() => {
                  loadDeliveries();
                  toast({
                    title: "Deliveries Updated",
                    description: "Stock acquisition data has been refreshed",
                  });
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estimated Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalEstimatedValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Actual Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.totalActualValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Delivered Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(summary.totalDeliveredValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.totalDeliveries}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Items Overview</CardTitle>
            <CardDescription>
              Progress summary: {summary.completedItems} completed, {summary.partialItems} in progress, {summary.pendingItems} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.completedItems}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.partialItems}</div>
                <div className="text-sm text-blue-700">In Progress</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{summary.pendingItems}</div>
                <div className="text-sm text-gray-700">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Items Details</CardTitle>
            <CardDescription>
              Detailed view of all tender items with delivery progress and pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-lg">Loading acquisition data...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Tender Qty</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Est. Unit Price</TableHead>
                      <TableHead>Actual Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tender.items.map((item) => {
                      const delivered = deliveryQuantities[item.itemMasterId] || 0;
                      const remaining = item.quantity - delivered;
                      const estimatedUnitPrice = (item.estimatedUnitPrice || 0) / item.quantity;
                      const actualUnitPrice = actualPrices[item.itemMasterId] || 0;
                      const totalValue = actualUnitPrice * item.quantity;
                      const { status, progress, color } = getItemStatus(item);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="max-w-xs">
                              <div className="font-semibold">{item.nomenclature}</div>
                              {item.specifications && (
                                <div className="text-xs text-gray-500 truncate">
                                  {item.specifications}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="default" 
                              className={`font-mono ${delivered > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {delivered}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`font-mono ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}
                            >
                              {remaining}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(estimatedUnitPrice)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={actualPrices[item.itemMasterId] || ''}
                              onChange={(e) => setActualPrices(prev => ({
                                ...prev,
                                [item.itemMasterId]: parseFloat(e.target.value) || 0
                              }))}
                              onBlur={(e) => handleActualPriceChange(item.itemMasterId, e.target.value)}
                              placeholder="Enter price"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(totalValue)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant="outline">
                                {status}
                              </Badge>
                              {progress > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${color}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        {deliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>
                Latest delivery records for this tender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveries.slice(-6).reverse().map((delivery) => (
                  <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline">
                          Delivery #{delivery.delivery_number}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(delivery.delivery_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Personnel:</span>
                          <span className="text-sm">{delivery.delivery_personnel}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>{delivery.delivery_items?.length || 0}</strong> item types delivered
                        </div>
                        {delivery.delivery_notes && (
                          <div className="text-xs text-gray-500 italic">
                            "{delivery.delivery_notes}"
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default StockAcquisition;
