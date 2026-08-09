import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';

interface POItem {
  id: number;
  po_id: number;
  item_master_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  specifications?: string;
  nomenclature: string;
  category_name: string;
  unit: string;
  subcategory_name?: string;
}

interface PurchaseOrderDetails {
  id: number;
  po_number: string;
  tender_id: number;
  vendor_id: number;
  po_date: string;
  total_amount: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  tender_title: string;
  tender_reference_number?: string;
  tender_type: string;
  vendor_name: string;
  vendor_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  items: POItem[];
}

interface DeliveryItem {
  id: string;
  delivery_id: string;
  po_item_id: string;
  item_master_id: string;
  delivery_qty: number;
  quality_status: string;
  remarks?: string;
  item_name: string;
  item_code: string;
  unit: string;
  po_quantity: number;
  unit_price: number;
  total_value: number;
}

interface SerialNumber {
  id: string;
  delivery_id: string;
  delivery_item_id: string;
  item_master_id: string;
  serial_number: string;
  notes?: string;
  item_name: string;
  item_code: string;
}

interface Delivery {
  id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  delivery_date: string;
  delivery_status: string;
  received_by: string;
  receiving_date: string;
  received_by_name?: string;
  notes?: string;
  item_count: number;
  total_quantity: number;
  good_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;
  vendor_name: string;
}

interface ReceivingReportProps {
  po: PurchaseOrderDetails;
  onClose: () => void;
}

export default function ReceivingReport({ po, onClose }: ReceivingReportProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryItems, setDeliveryItems] = useState<Record<string, DeliveryItem[]>>({});
  const [serialNumbers, setSerialNumbers] = useState<Record<string, SerialNumber[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [po.id]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // Fetch all deliveries for this PO
      const deliveriesResponse = await fetch(`http://localhost:3001/api/deliveries/by-po/${po.id}`);
      if (!deliveriesResponse.ok) throw new Error('Failed to fetch deliveries');
      const deliveriesData = await deliveriesResponse.json();
      setDeliveries(deliveriesData);

      // Fetch items for each delivery
      const itemsPromises = deliveriesData.map(async (delivery: Delivery) => {
        const itemsResponse = await fetch(`http://localhost:3001/api/deliveries/${delivery.id}/items`);
        if (!itemsResponse.ok) throw new Error('Failed to fetch delivery items');
        return {
          deliveryId: delivery.id,
          items: await itemsResponse.json()
        };
      });

      const itemsResults = await Promise.all(itemsPromises);
      const itemsMap = itemsResults.reduce((acc, { deliveryId, items }) => {
        acc[deliveryId] = items;
        return acc;
      }, {} as Record<string, DeliveryItem[]>);

      setDeliveryItems(itemsMap);

      // Fetch serial numbers for each delivery
      const serialPromises = deliveriesData.map(async (delivery: Delivery) => {
        const serialResponse = await fetch(`http://localhost:3001/api/deliveries/${delivery.id}/serial-numbers`);
        if (!serialResponse.ok) return { deliveryId: delivery.id, serials: [] };
        return {
          deliveryId: delivery.id,
          serials: await serialResponse.json()
        };
      });

      const serialResults = await Promise.all(serialPromises);
      const serialMap = serialResults.reduce((acc, { deliveryId, serials }) => {
        acc[deliveryId] = serials;
        return acc;
      }, {} as Record<string, SerialNumber[]>);

      setSerialNumbers(serialMap);
      setError(null);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Failed to load receiving report data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getQualityBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'damaged':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalDeliveredQuantity = deliveries.reduce((sum, d) => sum + (d.total_quantity || 0), 0);
  const totalGoodQuantity = deliveries.reduce((sum, d) => sum + (d.good_quantity || 0), 0);
  const totalDamagedQuantity = deliveries.reduce((sum, d) => sum + (d.damaged_quantity || 0), 0);
  const totalRejectedQuantity = deliveries.reduce((sum, d) => sum + (d.rejected_quantity || 0), 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Loading receiving report...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">No deliveries found for this purchase order.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0.5in;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            height: auto !important;
          }
          body * {
            visibility: hidden !important;
          }
          .receiving-report-container, .receiving-report-container * {
            visibility: visible !important;
          }
          .receiving-report-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            max-width: none !important;
            padding: 0.5in !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-xl my-8">
          {/* Header with actions - Hidden on print */}
          <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
            <h2 className="text-xl font-bold text-slate-900">Receiving Report - {po.po_number}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Report Content */}
          <div className="receiving-report-container p-8">
            
            {/* Header Section */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold uppercase">RECEIVING REPORT</h1>
                <h2 className="text-lg font-bold uppercase mt-2">ELECTION COMMISSION OF PAKISTAN</h2>
                <p className="text-sm mt-1">Secretariat, Constitution Avenue, G-5/2, Islamabad</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-300 p-4 rounded">
                <div>
                  <p className="text-sm"><strong>Purchase Order Number:</strong> {po.po_number}</p>
                  <p className="text-sm"><strong>PO Date:</strong> {new Date(po.po_date).toLocaleDateString('en-GB')}</p>
                  <p className="text-sm"><strong>Tender:</strong> {po.tender_title}</p>
                  <p className="text-sm"><strong>Tender Type:</strong> {po.tender_type.replace('-', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm"><strong>Vendor:</strong> {po.vendor_name}</p>
                  {po.vendor_code && <p className="text-sm"><strong>Vendor Code:</strong> {po.vendor_code}</p>}
                  <p className="text-sm"><strong>Total Deliveries:</strong> {deliveries.length}</p>
                  <p className="text-sm"><strong>Report Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="mb-6 border border-slate-300 p-4 rounded bg-slate-50">
              <h3 className="text-base font-bold mb-3">Delivery Summary</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Delivered</p>
                  <p className="text-lg font-bold">{totalDeliveredQuantity.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-green-600">Good Quality</p>
                  <p className="text-lg font-bold text-green-700">{totalGoodQuantity.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-yellow-600">Damaged</p>
                  <p className="text-lg font-bold text-yellow-700">{totalDamagedQuantity.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-red-600">Rejected</p>
                  <p className="text-lg font-bold text-red-700">{totalRejectedQuantity.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Deliveries Detail */}
            {deliveries.map((delivery, deliveryIndex) => {
              const items = deliveryItems[delivery.id] || [];
              
              return (
                <div key={delivery.id} className="mb-8 border border-slate-300 rounded overflow-hidden page-break-inside-avoid">
                  {/* Delivery Header */}
                  <div className="bg-slate-100 p-4 border-b border-slate-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-base font-bold mb-2">Delivery #{deliveryIndex + 1}: {delivery.delivery_number}</h3>
                        <p className="text-sm"><strong>Delivery Date:</strong> {new Date(delivery.delivery_date).toLocaleDateString('en-GB')}</p>
                        {delivery.receiving_date && (
                          <p className="text-sm"><strong>Received Date:</strong> {new Date(delivery.receiving_date).toLocaleDateString('en-GB')}</p>
                        )}
                      </div>
                      <div>
                        {delivery.received_by_name && (
                          <p className="text-sm"><strong>Received By:</strong> {delivery.received_by_name}</p>
                        )}
                        <p className="text-sm"><strong>Status:</strong> <span className="capitalize">{delivery.delivery_status}</span></p>
                        <p className="text-sm"><strong>Items:</strong> {delivery.item_count}</p>
                      </div>
                    </div>
                    {delivery.notes && (
                      <div className="mt-2">
                        <p className="text-sm"><strong>Notes:</strong> {delivery.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Delivery Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-300">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">No.</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Item Code</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Item Description</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Ordered Qty</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Delivered Qty</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Unit</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Quality</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">Unit Price</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 border-r border-slate-200">{index + 1}</td>
                            <td className="py-2 px-3 font-mono text-xs border-r border-slate-200">{item.item_code}</td>
                            <td className="py-2 px-3 border-r border-slate-200">
                              {item.item_name}
                              {item.remarks && (
                                <span className="block text-xs text-gray-600 mt-1">Note: {item.remarks}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right border-r border-slate-200">{item.po_quantity}</td>
                            <td className="py-2 px-3 text-right font-semibold border-r border-slate-200">{item.delivery_qty}</td>
                            <td className="py-2 px-3 border-r border-slate-200">{item.unit}</td>
                            <td className="py-2 px-3 border-r border-slate-200">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getQualityBadgeColor(item.quality_status)}`}>
                                {item.quality_status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right border-r border-slate-200">Rs. {item.unit_price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold">Rs. {item.total_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right font-bold">Delivery Subtotal:</td>
                          <td className="py-2 px-3 text-right font-bold">{delivery.total_quantity || 0}</td>
                          <td colSpan={3} className="py-2 px-3 text-right font-bold">Total Value:</td>
                          <td className="py-2 px-3 text-right font-bold">
                            Rs. {items.reduce((sum, item) => sum + item.total_value, 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Serial Numbers Section */}
                  {serialNumbers[delivery.id] && serialNumbers[delivery.id].length > 0 && (
                    <div className="bg-blue-50 p-4 border-t border-slate-300">
                      <h4 className="font-semibold text-sm mb-2 text-blue-900">Serial Numbers</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Group serial numbers by item */}
                        {Array.from(new Set(serialNumbers[delivery.id].map(sn => sn.item_master_id))).map(itemId => {
                          const itemSerials = serialNumbers[delivery.id].filter(sn => sn.item_master_id === itemId);
                          const firstSerial = itemSerials[0];
                          return (
                            <div key={itemId} className="bg-white rounded p-3 border border-blue-200">
                              <p className="font-medium text-sm text-gray-900 mb-1">{firstSerial.item_name}</p>
                              <p className="text-xs text-gray-500 mb-2">Code: {firstSerial.item_code}</p>
                              <div className="flex flex-wrap gap-1">
                                {itemSerials.map((sn, idx) => (
                                  <span 
                                    key={sn.id} 
                                    className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
                                    title={sn.notes || ''}
                                  >
                                    {sn.serial_number}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{itemSerials.length} serial number(s)</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Summary */}
            <div className="border-t-2 border-slate-900 pt-4 mt-6">
              <h3 className="text-base font-bold mb-3">Overall Receiving Summary</h3>
              <table className="w-full text-sm border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-4 font-semibold bg-slate-50">Total Purchase Order Value:</td>
                    <td className="py-2 px-4 text-right">Rs. {po.total_amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-4 font-semibold bg-slate-50">Number of Deliveries:</td>
                    <td className="py-2 px-4 text-right">{deliveries.length}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-4 font-semibold bg-slate-50">Total Items Delivered:</td>
                    <td className="py-2 px-4 text-right">{totalDeliveredQuantity.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-4 font-semibold bg-slate-50 text-green-700">Good Quality Items:</td>
                    <td className="py-2 px-4 text-right text-green-700 font-semibold">{totalGoodQuantity.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-4 font-semibold bg-slate-50 text-yellow-700">Damaged Items:</td>
                    <td className="py-2 px-4 text-right text-yellow-700 font-semibold">{totalDamagedQuantity.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold bg-slate-50 text-red-700">Rejected Items:</td>
                    <td className="py-2 px-4 text-right text-red-700 font-semibold">{totalRejectedQuantity.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures Section */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="border-t border-slate-900 pt-2 mt-16">
                  <p className="text-sm font-semibold">Store Keeper</p>
                  <p className="text-xs text-gray-600">Prepared By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-900 pt-2 mt-16">
                  <p className="text-sm font-semibold">Wing Supervisor</p>
                  <p className="text-xs text-gray-600">Verified By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-900 pt-2 mt-16">
                  <p className="text-sm font-semibold">Assistant Director (Admn)</p>
                  <p className="text-xs text-gray-600">Approved By</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-600">
              <p>This is a computer generated Receiving Report - {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
