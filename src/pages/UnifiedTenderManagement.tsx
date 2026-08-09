import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have proper types
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft,
  Package, 
  Truck,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  Eye,
  CheckCircle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

interface TenderInfo {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
}

const UnifiedTenderManagement: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [tenderInfo, setTenderInfo] = useState<TenderInfo | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  
  // Collapsible states
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});
  const [deliveriesCollapsed, setDeliveriesCollapsed] = useState(true); // Default collapsed
  
  // Add item dialog state
  const [addItemDialog, setAddItemDialog] = useState<{
    isOpen: boolean;
    deliveryId: string | null;
    selectedItem: string;
    quantity: string;
  }>({
    isOpen: false,
    deliveryId: null,
    selectedItem: '',
    quantity: '1'
  });
  
  // New delivery state
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    delivery_number: '',
    delivery_personnel: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_notes: '',
    delivery_chalan: ''
  });

  // Serial number dialog state
  const [serialNumberDialog, setSerialNumberDialog] = useState<{
    isOpen: boolean;
    deliveryId: string;
    deliveryItemId: string;
    itemMasterId: string;
    itemName: string;
    quantity: number;
  }>({
    isOpen: false,
    deliveryId: '',
    deliveryItemId: '',
    itemMasterId: '',
    itemName: '',
    quantity: 0
  });
  const [serialNumberInput, setSerialNumberInput] = useState('');

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
        
        // Initialize editing prices
        const prices: Record<string, number> = {};
        tender.items?.forEach((item: TenderItem) => {
          // Use actual_unit_price if it exists (even if 0), otherwise use estimated_unit_price
          prices[item.id] = (item.actual_unit_price !== null && item.actual_unit_price !== undefined) 
            ? item.actual_unit_price 
            : item.estimated_unit_price;
        });
        setEditingPrices(prices);
        
        // Debug log to see what prices are being loaded
        }

      // Load deliveries
      const deliveryResponse = await fetch(`http://localhost:3001/api/deliveries/by-tender/${tenderId}`);
      if (deliveryResponse.ok) {
        const deliveriesData = await deliveryResponse.json();
        const deliveriesArray = Array.isArray(deliveriesData) ? deliveriesData : [deliveriesData];
        setDeliveries(deliveriesArray);
      } else {
        setDeliveries([]);
      }
      
    } catch (error) {
      console.error('Error loading tender data:', error);
    } finally {
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
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateReceivedQuantity = (itemMasterId: string) => {
    return deliveries.reduce((total, delivery) => {
      const deliveryItem = delivery.items?.find(item => item.item_master_id === itemMasterId);
      return total + (deliveryItem?.delivery_qty || 0);
    }, 0);
  };

  const getQuantityStatus = (estimated: number, received: number) => {
    if (received === 0) return { status: 'pending', color: 'text-gray-500' };
    if (received < estimated) return { status: 'partial', color: 'text-yellow-600' };
    if (received === estimated) return { status: 'complete', color: 'text-green-600' };
    return { status: 'excess', color: 'text-red-600' };
  };

  const getDeliveryStatus = (delivery: Delivery) => {
    if (delivery.is_finalized) return 'Finalized';
    
    // Check if all items in this delivery are fully accounted for
    if (!delivery.items || delivery.items.length === 0) return 'Pending';
    
    // Calculate if all tender items have been delivered considering this delivery
    const allItemsDelivered = tenderItems.every(tenderItem => {
      const receivedQty = calculateReceivedQuantity(tenderItem.item_master_id);
      return receivedQty >= tenderItem.quantity;
    });
    
    return allItemsDelivered ? 'Complete' : 'Pending';
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/stock-acquisition/update-price/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          actual_unit_price: newPrice, 
          pricing_confirmed: true 
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        setTenderItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, actual_unit_price: newPrice }
            : item
        ));
        alert('Price updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ Price update failed:', errorData);
        alert('Failed to update price');
      }
    } catch (error) {
      console.error('❌ Error updating price:', error);
      alert('Failed to update price');
    }
  };

  const createNewDelivery = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDelivery,
          tender_id: tenderId,
          delivery_number: parseInt(newDelivery.delivery_number)
        })
      });

      if (response.ok) {
        await loadTenderData(); // Reload to get the new delivery
        setShowNewDelivery(false);
        setNewDelivery({
          delivery_number: '',
          delivery_personnel: '',
          delivery_date: new Date().toISOString().split('T')[0],
          delivery_notes: '',
          delivery_chalan: ''
        });
        alert('Delivery created successfully!');
      }
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Failed to create delivery');
    }
  };

  const openAddItemDialog = (deliveryId: string) => {
    setAddItemDialog({
      isOpen: true,
      deliveryId,
      selectedItem: '',
      quantity: '1'
    });
  };

  const addItemToDelivery = async () => {
    try {
      if (!addItemDialog.deliveryId || !addItemDialog.selectedItem) {
        alert('Please select an item and specify quantity');
        return;
      }

      const quantity = parseInt(addItemDialog.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      // Find the selected tender item to get the item name
      const selectedTenderItem = tenderItems.find(item => item.item_master_id === addItemDialog.selectedItem);
      if (!selectedTenderItem) {
        alert('Selected item not found in tender items');
        return;
      }

      // Find the current delivery to get existing items
      const currentDelivery = deliveries.find(d => d.id === addItemDialog.deliveryId);
      if (!currentDelivery) {
        alert('Delivery not found');
        return;
      }

      // Check if item already exists in this delivery
      const existingItem = currentDelivery.items?.find(item => item.item_master_id === addItemDialog.selectedItem);
      if (existingItem) {
        alert('This item is already in the delivery. Please edit the existing item instead.');
        return;
      }

      // Prepare all items (existing + new)
      const existingItems = currentDelivery.items || [];
      const newItem = {
        item_master_id: addItemDialog.selectedItem,
        item_name: selectedTenderItem.nomenclature,
        delivery_qty: quantity
      };

      const allItems = [...existingItems.map(item => ({
        item_master_id: item.item_master_id,
        item_name: item.item_name,
        delivery_qty: item.delivery_qty
      })), newItem];

      const requestData = {
        delivery_id: addItemDialog.deliveryId,
        items: allItems
      };

      const response = await fetch('http://localhost:3001/api/delivery-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        await loadTenderData(); // Reload to show the new item
        setAddItemDialog({
          isOpen: false,
          deliveryId: null,
          selectedItem: '',
          quantity: '1'
        });
        alert('Item added to delivery successfully!');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          console.error('❌ Server error response:', errorData);
          errorMessage = errorData.error || errorData.message || `Server returned ${response.status}`;
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
        alert(`Failed to add item: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Error adding item to delivery:', error);
      alert('Failed to add item to delivery. Please check the console for details.');
    }
  };

  const handleAddSerialNumbers = async () => {
    if (!serialNumberInput.trim()) {
      alert('Please enter at least one serial number');
      return;
    }

    // Split by newlines or commas, trim whitespace, and filter empty strings
    const serialNumbers = serialNumberInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serialNumbers.length === 0) {
      alert('Please enter valid serial numbers');
      return;
    }

    if (serialNumbers.length > serialNumberDialog.quantity) {
      alert(`You can only add ${serialNumberDialog.quantity} serial number(s) for this item`);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/delivery-item-serial-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_id: serialNumberDialog.deliveryId,
          delivery_item_id: serialNumberDialog.deliveryItemId,
          item_master_id: serialNumberDialog.itemMasterId,
          serial_numbers: serialNumbers
        })
      });

      if (response.ok) {
        await loadTenderData(); // Reload to show the new serial numbers
        setSerialNumberDialog({
          isOpen: false,
          deliveryId: '',
          deliveryItemId: '',
          itemMasterId: '',
          itemName: '',
          quantity: 0
        });
        setSerialNumberInput('');
        alert(`${serialNumbers.length} serial number(s) added successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to add serial numbers: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding serial numbers:', error);
      alert('Failed to add serial numbers');
    }
  };

  const deleteDelivery = async (deliveryId: string, deliveryNumber: string) => {
    if (!confirm(`Are you sure you want to delete Delivery #${deliveryNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/deliveries/${deliveryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await loadTenderData(); // Reload to refresh the deliveries list
        alert('Delivery deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete delivery: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting delivery:', error);
      alert('Failed to delete delivery');
    }
  };

  const finalizeAllDeliveries = async () => {
    // Get all non-finalized deliveries
    const pendingDeliveries = deliveries.filter(d => !d.is_finalized);
    
    if (pendingDeliveries.length === 0) {
      alert('ℹ️ No pending deliveries to finalize.');
      return;
    }

    const deliveryList = pendingDeliveries.map(d => `  • Delivery #${d.delivery_number}`).join('\n');
    
    if (!confirm(`Are you sure you want to FINALIZE ALL DELIVERIES for this tender?\n\n${pendingDeliveries.length} pending deliveries will be finalized:\n${deliveryList}\n\nThis will:\n- Mark all deliveries as complete\n- CANNOT be undone\n\nProceed with finalization?`)) {
      return;
    }

    try {
      // Get current user ID from session
      const sessionResponse = await fetch('http://localhost:3001/api/session');
      const session = await sessionResponse.json();
      const currentUserId = session.userId || 'SYSTEM-USER-ID';
      
      let successCount = 0;
      const errors: string[] = [];

      // Finalize each delivery
      for (const delivery of pendingDeliveries) {
        try {
          const response = await fetch(`http://localhost:3001/api/deliveries/${delivery.id}/finalize`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              finalized_by: currentUserId
            })
          });

          if (response.ok) {
            const result = await response.json();
            successCount++;
          } else {
            const errorData = await response.json();
            errors.push(`Delivery #${delivery.delivery_number}: ${errorData.details || errorData.error}`);
          }
        } catch (error) {
          errors.push(`Delivery #${delivery.delivery_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Reload data
      await loadTenderData();

      // Show results
      if (successCount === pendingDeliveries.length) {
        alert(`✅ ALL ${successCount} DELIVERIES FINALIZED SUCCESSFULLY!`);
      } else if (successCount > 0) {
        alert(`⚠️ PARTIALLY COMPLETED\n\n✅ ${successCount} deliveries finalized\n❌ ${errors.length} failed:\n\n${errors.join('\n')}`);
      } else {
        alert(`❌ FINALIZATION FAILED\n\nNo deliveries were finalized.\n\nErrors:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Error finalizing deliveries:', error);
      alert('❌ Failed to finalize deliveries. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = (preview: boolean = false) => {
    if (!tenderInfo) return;

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Detail Report', pageWidth / 2, 20, { align: 'center' });
    
    // Tender Info
    doc.setFontSize(14);
    doc.text(tenderInfo.title, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${tenderInfo.reference_number}`, pageWidth / 2, 35, { align: 'center' });
    
    const now = new Date().toLocaleDateString('en-PK', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${now}`, pageWidth / 2, 42, { align: 'center' });
    
    // Summary Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Summary', 14, 52);
    
    const summaryData = [
      ['Tender Reference', tenderInfo.reference_number],
      ['Status', tenderInfo.status],
      ['Estimated Value', formatCurrency(tenderInfo.estimated_value)],
      ['Total Items', tenderItems.length.toString()],
      ['Total Deliveries', deliveries.length.toString()]
    ];
    
    autoTable(doc, {
      startY: 57,
      head: [['Field', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    
    // Tender Items Table
    const finalY1 = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Items', 14, finalY1 + 10);
    
    const itemsData = tenderItems.map(item => {
      const receivedQty = calculateReceivedQuantity(item.item_master_id);
      return [
        item.nomenclature,
        item.quantity.toString(),
        receivedQty.toString(),
        formatCurrency(item.estimated_unit_price),
        formatCurrency(item.actual_unit_price || item.estimated_unit_price),
        formatCurrency((item.actual_unit_price || item.estimated_unit_price) * item.quantity)
      ];
    });
    
    autoTable(doc, {
      startY: finalY1 + 15,
      head: [['Item', 'Quantity', 'Received', 'Est. Price', 'Actual Price', 'Total']],
      body: itemsData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
    
    // Deliveries Section
    if (deliveries.length > 0) {
      const finalY2 = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Deliveries', 14, finalY2 + 10);
      
      const deliveriesData = deliveries.map(delivery => [
        `#${delivery.delivery_number}`,
        delivery.delivery_personnel,
        formatDate(delivery.delivery_date),
        `${delivery.items?.length || 0} items`,
        getDeliveryStatus(delivery),
        delivery.delivery_notes || '-'
      ]);
      
      autoTable(doc, {
        startY: finalY2 + 15,
        head: [['Delivery #', 'Personnel', 'Date', 'Items', 'Status', 'Notes']],
        body: deliveriesData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 85 }
        },
        margin: { left: 14, right: 14 }
      });
    }
    
    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} of ${pageCount}`,
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
      const filename = `Tender_${tenderInfo.reference_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading tender information...</p>
        </div>
      </div>
    );
  }

  // Check if all deliveries are finalized (Report Mode)
  const allDeliveriesFinalized = deliveries.length > 0 && deliveries.every(d => d.is_finalized);
  const isReportMode = allDeliveriesFinalized;

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
          
          .print\\:hidden, .no-print {
            display: none !important;
          }
          
          button, nav, aside, footer {
            display: none !important;
          }
          
          * {
            color: black !important;
          }
        }
      `}</style>
      <div className="container mx-auto p-6 max-w-6xl print-container">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold mb-2">Tender Detail Report</h1>
            <h2 className="text-xl mb-1">{tenderInfo?.title}</h2>
            <p className="text-sm text-gray-600">Reference: {tenderInfo?.reference_number}</p>
            <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 print:hidden">
          <Button variant="outline" onClick={() => navigate('/dashboard/stock-acquisition-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stock Acquisition
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{tenderInfo?.title}</h1>
            <p className="text-gray-600">{tenderInfo?.reference_number}</p>
            {isReportMode && (
              <Badge className="mt-2 bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                All Deliveries Finalized - Report View
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {/* Finalize All Deliveries Button - Only show if not in report mode */}
            {!isReportMode && deliveries.filter(d => !d.is_finalized).length > 0 && (
              <Button 
                onClick={finalizeAllDeliveries} 
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize All Deliveries ({deliveries.filter(d => !d.is_finalized).length})
              </Button>
            )}
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
          {!isReportMode && (
            <Badge variant="outline">
              {tenderInfo?.status}
            </Badge>
          )}
        </div>

      <div className="space-y-6">
        {/* Deliveries Section */}
        <Collapsible
          open={!deliveriesCollapsed}
          onOpenChange={(open) => setDeliveriesCollapsed(!open)}
        >
          <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-emerald-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    {deliveriesCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <Truck className="w-5 h-5" />
                    Deliveries ({deliveries.length})
                    {isReportMode && (
                      <Badge className="ml-2 bg-green-100 text-green-800 border-green-300">
                        All Finalized
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 print:hidden">
                    {!isReportMode && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent collapsible trigger
                          setShowNewDelivery(true);
                        }} 
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Delivery
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
            {/* New Delivery Form - Only show if not in report mode */}
            {!isReportMode && showNewDelivery && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Create New Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Delivery Number</Label>
                      <Input
                        value={newDelivery.delivery_number}
                        onChange={(e) => setNewDelivery(prev => ({...prev, delivery_number: e.target.value}))}
                        placeholder="e.g., 1001"
                      />
                    </div>
                    <div>
                      <Label>Personnel</Label>
                      <Input
                        value={newDelivery.delivery_personnel}
                        onChange={(e) => setNewDelivery(prev => ({...prev, delivery_personnel: e.target.value}))}
                        placeholder="Delivery person"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newDelivery.delivery_date}
                        onChange={(e) => setNewDelivery(prev => ({...prev, delivery_date: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Chalan Number</Label>
                      <Input
                        value={newDelivery.delivery_chalan}
                        onChange={(e) => setNewDelivery(prev => ({...prev, delivery_chalan: e.target.value}))}
                        placeholder="Chalan #"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={newDelivery.delivery_notes}
                      onChange={(e) => setNewDelivery(prev => ({...prev, delivery_notes: e.target.value}))}
                      placeholder="Delivery notes..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <Button onClick={createNewDelivery} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewDelivery(false)} size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Deliveries */}
            {deliveries.map((delivery) => (
              <Collapsible
                key={delivery.id}
                open={isReportMode || openDeliveries[delivery.id]}
                onOpenChange={(open) => !isReportMode && setOpenDeliveries(prev => ({...prev, [delivery.id]: open}))}
              >
                <Card className={isReportMode ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : ''}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className={isReportMode ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!isReportMode && (openDeliveries[delivery.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                          <div>
                            <h3 className="font-medium">Delivery #{delivery.delivery_number}</h3>
                            <p className="text-sm text-gray-600">{delivery.delivery_personnel} - {formatDate(delivery.delivery_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={delivery.is_finalized ? 'default' : getDeliveryStatus(delivery) === 'Complete' ? 'default' : 'secondary'} 
                                 className={isReportMode ? 'bg-green-600 text-white border-green-700' : ''}>
                            {getDeliveryStatus(delivery)}
                          </Badge>
                          <Badge variant="outline">
                        {delivery.items?.length || 0} items
                      </Badge>
                      {/* Delete button hidden - prevents accidental deletion */}
                      {/* {!isReportMode && !delivery.is_finalized && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDelivery(delivery.id, delivery.delivery_number);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete delivery"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )} */}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Delivery Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm text-gray-600">Chalan:</span>
                          <p className="font-medium">{delivery.delivery_chalan}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Notes:</span>
                          <p className="font-medium">{delivery.delivery_notes}</p>
                        </div>
                      </div>

                      {/* Delivery Actions - Only show if not in report mode and not finalized */}
                      {/* Delete button hidden - prevents accidental deletion */}
                  {/* {!isReportMode && !delivery.is_finalized && (
                        <div className="flex justify-end mb-4 print:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDelivery(delivery.id, delivery.delivery_number)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Delivery
                          </Button>
                        </div>
                      )} */}

                      {/* Delivery Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Items in this delivery</h4>
                          {!isReportMode && !delivery.is_finalized && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAddItemDialog(delivery.id)}
                              className="print:hidden"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Item
                            </Button>
                          )}
                        </div>
                        
                        {delivery.items && delivery.items.length > 0 ? (
                          <div className="space-y-2">
                            {delivery.items.map((item) => (
                              <div key={item.id} className={`border rounded p-3 ${isReportMode ? 'bg-white border-green-200' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-bold">{item.item_name}</h5>
                                    <p className="text-sm text-gray-600">Quantity: {item.delivery_qty}</p>
                                  </div>
                                  {!isReportMode && !delivery.is_finalized && (
                                    <div className="flex gap-1 print:hidden">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSerialNumberDialog({
                                            isOpen: true,
                                            deliveryId: delivery.id,
                                            deliveryItemId: item.id,
                                            itemMasterId: item.item_master_id,
                                            itemName: item.item_name,
                                            quantity: item.delivery_qty
                                          });
                                        }}
                                        title="Add Serial Numbers"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {/* Remove item */}}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Serial Numbers */}
                                {item.serial_numbers && item.serial_numbers.length > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-sm font-medium mb-1">Serial Numbers:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.serial_numbers.map((serial) => (
                                        <Badge key={serial.id} variant="outline" className="text-xs">
                                          {serial.serial_number}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No items in this delivery</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

            {deliveries.length === 0 && !showNewDelivery && (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No deliveries yet</h3>
                <p className="text-sm">Create your first delivery to get started</p>
              </div>
            )}
          </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tender Items Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Tender Items ({tenderItems.length})
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Total Items</div>
                  <div className="font-bold">{tenderItems.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Fully Delivered</div>
                  <div className="font-bold text-green-600">
                    {tenderItems.filter(item => calculateReceivedQuantity(item.item_master_id) >= item.quantity).length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Pending</div>
                  <div className="font-bold text-orange-600">
                    {tenderItems.filter(item => calculateReceivedQuantity(item.item_master_id) < item.quantity).length}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenderItems.map((item) => {
                const receivedQty = calculateReceivedQuantity(item.item_master_id);
                const qtyStatus = getQuantityStatus(item.quantity, receivedQty);
                
                return (
                  <div key={item.id} className="border rounded p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold">{item.nomenclature}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <div>
                            <span className="text-sm text-gray-600">Estimated Qty:</span>
                            <span className="ml-1 font-medium">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Received Qty:</span>
                            <span className={`ml-1 font-medium ${qtyStatus.color}`}>
                              {receivedQty}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Remaining:</span>
                            <span className={`ml-1 font-medium ${item.quantity - receivedQty > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {Math.max(0, item.quantity - receivedQty)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{item.specifications}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* Add to available deliveries */}}
                          title="Add to delivery"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quantity Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Delivery Progress</span>
                        <span>{receivedQty} / {item.quantity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            qtyStatus.status === 'complete' ? 'bg-green-500' :
                            qtyStatus.status === 'partial' ? 'bg-yellow-500' :
                            qtyStatus.status === 'excess' ? 'bg-red-500' :
                            'bg-gray-300'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (receivedQty / item.quantity) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-sm text-gray-600">Estimated Unit Price:</span>
                        <p className="font-medium">{formatCurrency(item.estimated_unit_price)}</p>
                        <p className="text-xs text-gray-500">
                          Total: {formatCurrency(item.estimated_unit_price * item.quantity)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Actual Unit Price:</span>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editingPrices[item.id] !== undefined ? editingPrices[item.id] : item.estimated_unit_price}
                            onChange={(e) => setEditingPrices(prev => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="text-sm"
                            placeholder={item.estimated_unit_price.toString()}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateItemPrice(item.id, editingPrices[item.id] || item.estimated_unit_price)}
                            disabled={(editingPrices[item.id] || item.estimated_unit_price) === item.actual_unit_price}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                        </div>
                        {(item.actual_unit_price === null || item.actual_unit_price === undefined) && (
                          <p className="text-xs text-amber-600 mt-1">Using estimated price - save to confirm actual price</p>
                        )}
                        {(item.actual_unit_price !== null && item.actual_unit_price !== undefined) && (
                          <p className="text-xs text-green-600 mt-1">Actual price saved ✓</p>
                        )}
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Actual Total Price:</span>
                        <p className="font-medium text-blue-600">
                          {formatCurrency((editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price) * receivedQty)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price)} × {receivedQty} received
                        </p>
                        {receivedQty === 0 && (
                          <p className="text-xs text-amber-600">No deliveries yet</p>
                        )}
                      </div>
                    </div>
                </div>
                );
              })}
            </div>
            
            {/* Tender Value Summary */}
            {tenderItems.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Tender Value Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Estimated Total Value:</span>
                    <p className="font-bold text-lg">
                      {formatCurrency(
                        tenderItems.reduce((total, item) => total + (item.estimated_unit_price * item.quantity), 0)
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Based on estimated quantities</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Actual Paid Value:</span>
                    <p className="font-bold text-lg text-blue-600">
                      {formatCurrency(
                        tenderItems.reduce((total, item) => {
                          const actualUnitPrice = editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price;
                          const receivedQty = calculateReceivedQuantity(item.item_master_id);
                          return total + (actualUnitPrice * receivedQty);
                        }, 0)
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Based on received quantities</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Savings/Overrun:</span>
                    <span className={`font-medium ${
                      tenderItems.reduce((total, item) => {
                        const actualUnitPrice = editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price;
                        const receivedQty = calculateReceivedQuantity(item.item_master_id);
                        return total + (actualUnitPrice * receivedQty);
                      }, 0) <= tenderItems.reduce((total, item) => total + (item.estimated_unit_price * item.quantity), 0)
                      ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        tenderItems.reduce((total, item) => total + (item.estimated_unit_price * item.quantity), 0) -
                        tenderItems.reduce((total, item) => {
                          const actualUnitPrice = editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price;
                          const receivedQty = calculateReceivedQuantity(item.item_master_id);
                          return total + (actualUnitPrice * receivedQty);
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Pending Value:</span>
                    <span className="text-xs text-orange-600 font-medium">
                      {formatCurrency(
                        tenderItems.reduce((total, item) => {
                          const actualUnitPrice = editingPrices[item.id] || item.actual_unit_price || item.estimated_unit_price;
                          const receivedQty = calculateReceivedQuantity(item.item_master_id);
                          const pendingQty = Math.max(0, item.quantity - receivedQty);
                          return total + (actualUnitPrice * pendingQty);
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Item Dialog */}
      <Dialog 
        open={addItemDialog.isOpen} 
        onOpenChange={(open) => setAddItemDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Delivery</DialogTitle>
            <DialogDescription>
              Select an item from the tender to add to this delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Item</Label>
              <Select
                value={addItemDialog.selectedItem}
                onValueChange={(value) => {
                  setAddItemDialog(prev => ({ ...prev, selectedItem: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item from tender" />
                </SelectTrigger>
                <SelectContent>
                  {tenderItems.map((item) => (
                    <SelectItem key={item.id} value={item.item_master_id}>
                      {item.nomenclature} (Available: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Debug info */}
              {addItemDialog.selectedItem && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {addItemDialog.selectedItem}
                </p>
              )}
            </div>
            
            <div>
              <Label>Quantity to Deliver</Label>
              <Input
                type="number"
                min="1"
                value={addItemDialog.quantity}
                onChange={(e) => setAddItemDialog(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setAddItemDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button onClick={addItemToDelivery}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Serial Number Dialog */}
      <Dialog 
        open={serialNumberDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setSerialNumberDialog({
              isOpen: false,
              deliveryId: '',
              deliveryItemId: '',
              itemMasterId: '',
              itemName: '',
              quantity: 0
            });
            setSerialNumberInput('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Serial Numbers</DialogTitle>
            <DialogDescription>
              Add serial numbers for <strong>{serialNumberDialog.itemName}</strong> (Quantity: {serialNumberDialog.quantity})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="serial-numbers">Serial Numbers</Label>
              <p className="text-sm text-gray-500 mb-2">
                Enter one serial number per line or separate with commas (max {serialNumberDialog.quantity})
              </p>
              <Textarea
                id="serial-numbers"
                placeholder="SN001&#10;SN002&#10;SN003"
                value={serialNumberInput}
                onChange={(e) => setSerialNumberInput(e.target.value)}
                rows={6}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                {serialNumberInput.split(/[\n,]+/).filter(s => s.trim()).length} / {serialNumberDialog.quantity} serial numbers entered
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSerialNumberDialog({
                    isOpen: false,
                    deliveryId: '',
                    deliveryItemId: '',
                    itemMasterId: '',
                    itemName: '',
                    quantity: 0
                  });
                  setSerialNumberInput('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSerialNumbers}>
                <Plus className="w-4 h-4 mr-2" />
                Add Serial Numbers
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default UnifiedTenderManagement;