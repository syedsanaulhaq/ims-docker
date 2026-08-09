import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have proper types
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft,
  Package, 
  Truck,
  Printer,
  Download,
  Eye,
  CheckCircle,
  Calendar,
  User,
  FileText,
  DollarSign,
  Hash
} from 'lucide-react';

// Types
interface TenderItem {
  id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_amount: number;
  specifications: string;
  remarks: string;
}

interface DeliveryItem {
  id: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  serial_numbers: SerialNumber[];
}

interface SerialNumber {
  id: string;
  serial_number: string;
  notes?: string;
}

interface Delivery {
  id: string;
  delivery_number: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes: string;
  delivery_chalan: string;
  items: DeliveryItem[];
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
}

interface TenderInfo {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
  created_at: string;
  finalized_at?: string;
}

const TenderAcquisitionReport: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [tenderInfo, setTenderInfo] = useState<TenderInfo | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  // Load data
  useEffect(() => {
    if (tenderId) {
      loadTenderData();
    }
  }, [tenderId]);

  const loadTenderData = async () => {
    try {
      setLoading(true);
      
      // Load tender info
      const tenderResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      if (tenderResponse.ok) {
        const tender = await tenderResponse.json();
        setTenderInfo(tender);
        setTenderItems(tender.items || []);
      }

      // Load deliveries
      const deliveryResponse = await fetch(`http://localhost:3001/api/deliveries/by-tender/${tenderId}`);
      if (deliveryResponse.ok) {
        const deliveriesData = await deliveryResponse.json();
        const deliveriesArray = Array.isArray(deliveriesData) ? deliveriesData : [deliveriesData];
        setDeliveries(deliveriesArray);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading tender data:', err);
      setLoading(false);
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalEstimated = () => {
    return tenderItems.reduce((sum, item) => sum + (item.estimated_unit_price * item.quantity), 0);
  };

  const calculateTotalActual = () => {
    return tenderItems.reduce((sum, item) => sum + (item.actual_unit_price * item.quantity), 0);
  };

  const calculateReceivedQuantity = (itemMasterId: string) => {
    return deliveries.reduce((total, delivery) => {
      const deliveryItem = delivery.items?.find(i => i.item_master_id === itemMasterId);
      return total + (deliveryItem?.delivery_qty || 0);
    }, 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = (preview: boolean = false) => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('STOCK ACQUISITION REPORT', pageWidth / 2, 20, { align: 'center' });
    
    // Tender Info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(tenderInfo?.title || '', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Reference: ${tenderInfo?.reference_number || ''}`, pageWidth / 2, 36, { align: 'center' });
    doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, 42, { align: 'center' });
    
    // Summary Section
    let yPos = 55;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TENDER SUMMARY', 14, yPos);
    
    const summaryData = [
      ['Status', tenderInfo?.status || 'N/A'],
      ['Created Date', formatDate(tenderInfo?.created_at || '')],
      ['Finalized Date', formatDate(tenderInfo?.finalized_at || '')],
      ['Total Items', tenderItems.length.toString()],
      ['Total Deliveries', deliveries.length.toString()],
      ['Estimated Value', formatCurrency(calculateTotalEstimated())],
      ['Actual Value', formatCurrency(calculateTotalActual())],
    ];
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Field', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
      margin: { left: 14, right: pageWidth / 2 + 10 },
      tableWidth: pageWidth / 2 - 20
    });
    
    // Items Table
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TENDER ITEMS', 14, yPos);
    
    const itemsData = tenderItems.map(item => [
      item.nomenclature,
      item.quantity.toString(),
      calculateReceivedQuantity(item.item_master_id).toString(),
      formatCurrency(item.estimated_unit_price),
      formatCurrency(item.actual_unit_price),
      formatCurrency(item.actual_unit_price * item.quantity)
    ]);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Ordered Qty', 'Received Qty', 'Est. Price', 'Actual Price', 'Total']],
      body: itemsData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
    
    // Deliveries Section
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    deliveries.forEach((delivery, index) => {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`DELIVERY #${delivery.delivery_number}`, 14, yPos);
      
      const deliveryInfo = [
        ['Personnel', delivery.delivery_personnel],
        ['Date', formatDate(delivery.delivery_date)],
        ['Chalan', delivery.delivery_chalan],
        ['Status', delivery.is_finalized ? 'Finalized' : 'Pending'],
      ];
      
      autoTable(doc, {
        startY: yPos + 5,
        body: deliveryInfo,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 },
        margin: { left: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 5;
      
      if (delivery.items && delivery.items.length > 0) {
        const deliveryItemsData = delivery.items.map(item => [
          item.item_name,
          item.delivery_qty.toString(),
          item.serial_numbers?.length > 0 ? item.serial_numbers.map(s => s.serial_number).join(', ') : 'N/A'
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Item Name', 'Quantity', 'Serial Numbers']],
          body: deliveryItemsData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
          margin: { left: 20, right: 14 }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    });
    
    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} of ${pageCount} | Stock Acquisition Report | ${tenderInfo?.reference_number}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    if (preview) {
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } else {
      const filename = `Stock_Acquisition_${tenderInfo?.reference_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-lg font-medium">Loading acquisition report...</p>
        </div>
      </div>
    );
  }

  const totalEstimated = calculateTotalEstimated();
  const totalActual = calculateTotalActual();

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
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
          
          .no-print {
            display: none !important;
          }
          
          button, nav, aside, footer {
            display: none !important;
          }
          
          * {
            color: black !important;
          }
          
          .bg-green-50 {
            background-color: #f0fdf4 !important;
          }
          
          .border-green-200 {
            border-color: #86efac !important;
          }
        }
      `}</style>
      
      <div className="container mx-auto p-6 max-w-7xl print-container">
        {/* Header - Screen Only */}
        <div className="flex items-center gap-4 mb-6 no-print">
          <Button variant="outline" onClick={() => navigate('/dashboard/stock-acquisition-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-green-700">Stock Acquisition Report</h1>
            <p className="text-gray-600">Complete finalized tender report</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => generatePDF(true)} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview PDF
            </Button>
            <Button onClick={() => generatePDF(false)} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Print Header - Print Only */}
        <div className="hidden print:block mb-8 text-center border-b-2 border-green-600 pb-4">
          <h1 className="text-4xl font-bold mb-2 text-green-700">STOCK ACQUISITION REPORT</h1>
          <h2 className="text-2xl font-semibold mb-1">{tenderInfo?.title}</h2>
          <p className="text-lg">Reference: {tenderInfo?.reference_number}</p>
          <p className="text-sm text-gray-600">Generated on {formatDateTime(new Date().toISOString())}</p>
        </div>

        {/* Tender Information Card */}
        <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              Tender Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Hash className="w-4 h-4" />
                  <span className="font-medium">Reference Number</span>
                </div>
                <p className="text-lg font-bold">{tenderInfo?.reference_number}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Created Date</span>
                </div>
                <p className="text-lg">{formatDate(tenderInfo?.created_at || '')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Finalized Date</span>
                </div>
                <p className="text-lg">{formatDate(tenderInfo?.finalized_at || '')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Total Items</span>
                </div>
                <p className="text-lg font-bold">{tenderItems.length}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Truck className="w-4 h-4" />
                  <span className="font-medium">Total Deliveries</span>
                </div>
                <p className="text-lg font-bold">{deliveries.length}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Status</span>
                </div>
                <Badge className="bg-green-600 text-white text-sm">
                  {tenderInfo?.status}
                </Badge>
              </div>
            </div>
            {tenderInfo?.description && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm text-gray-600 mb-1 font-medium">Description:</p>
                <p className="text-gray-800">{tenderInfo.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Estimated Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalEstimated)}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Actual Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalActual)}</div>
            </CardContent>
          </Card>
          <Card className={totalActual < totalEstimated ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalActual < totalEstimated ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalActual - totalEstimated)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {totalActual < totalEstimated ? 'Savings' : 'Over Budget'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tender Items Table */}
        <Card className="mb-6 border-green-200">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Tender Items ({tenderItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-green-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ordered Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Received Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Est. Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actual Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenderItems.map((item, index) => {
                    const receivedQty = calculateReceivedQuantity(item.item_master_id);
                    const isComplete = receivedQty >= item.quantity;
                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.nomenclature}</div>
                          {item.specifications && (
                            <div className="text-xs text-gray-500 mt-1">{item.specifications}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${isComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                            {receivedQty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.estimated_unit_price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.actual_unit_price)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          {formatCurrency(item.actual_unit_price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-green-50 border-t-2 border-green-600">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-900">TOTAL:</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
                      {formatCurrency(totalActual)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Section */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Details ({deliveries.length} Deliveries)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-white">
                {/* Delivery Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-green-200">
                  <div>
                    <h3 className="text-lg font-bold text-green-700">Delivery #{delivery.delivery_number}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{delivery.delivery_personnel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(delivery.delivery_date)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Finalized
                  </Badge>
                </div>

                {/* Delivery Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Chalan Number:</span>
                    <p className="font-semibold">{delivery.delivery_chalan}</p>
                  </div>
                  {delivery.delivery_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Notes:</span>
                      <p className="text-gray-800">{delivery.delivery_notes}</p>
                    </div>
                  )}
                  {delivery.finalized_at && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Finalized On:</span>
                      <p className="font-semibold text-green-700">{formatDateTime(delivery.finalized_at)}</p>
                    </div>
                  )}
                </div>

                {/* Delivery Items */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Items Delivered ({delivery.items?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {delivery.items && delivery.items.length > 0 ? (
                      delivery.items.map((item) => (
                        <div key={item.id} className="bg-white border border-green-200 rounded p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-bold text-gray-900">{item.item_name}</h5>
                              <p className="text-sm text-gray-600 mt-1">Quantity Delivered: <span className="font-semibold text-green-600">{item.delivery_qty}</span></p>
                            </div>
                          </div>
                          
                          {/* Serial Numbers */}
                          {item.serial_numbers && item.serial_numbers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-2">Serial Numbers:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.serial_numbers.map((serial) => (
                                  <Badge key={serial.id} variant="outline" className="bg-green-50 border-green-300 text-green-800">
                                    {serial.serial_number}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No items in this delivery</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-600 rounded no-print">
          <p className="text-sm text-gray-700">
            <strong className="text-green-700">Note:</strong> This is a finalized stock acquisition report. All deliveries have been completed and verified. 
            No further modifications can be made to this tender.
          </p>
        </div>
      </div>
    </>
  );
};

export default TenderAcquisitionReport;
