import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import { Upload, FileText } from 'lucide-react';

interface POItem {
  id: string;
  item_id: string;
  item_name: string;
  specifications?: string;
  ordered_quantity: number;
  received_quantity: number;
  pending_quantity: number;
  unit_price: number;
  delivery_status: string;
}

interface DeliveryItem {
  receipt_line_id: string;
  po_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  quality_status: 'good' | 'damaged' | 'rejected' | 'partial';
  remarks?: string;
  serial_numbers?: string[];
  serial_numbers_input?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  vendor_name: string;
  total_amount: number;
  status: string;
  tender_id: string;
  tender_type: string;
}

const createReceiptLine = (item: POItem): DeliveryItem => ({
  receipt_line_id: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  po_item_id: item.id,
  item_id: item.item_id,
  item_name: item.item_name,
  quantity: 0,
  quality_status: 'good',
  remarks: '',
  serial_numbers: [],
  serial_numbers_input: ''
});

const ReceiveDelivery: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { getCurrentUserId } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState('');
  const [deliveryChalan, setDeliveryChalan] = useState('');
  const [challanFile, setChallanFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPODetails();
  }, [poId]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get PO basic info
      const poResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}`);
      if (!poResponse.ok) throw new Error('Failed to fetch PO details');
      const poData = await poResponse.json();
      setPo(poData);

      // Get PO fulfillment details
      const fulfillmentResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}/fulfillment`);
      if (!fulfillmentResponse.ok) throw new Error('Failed to fetch fulfillment data');
      const fulfillmentData = await fulfillmentResponse.json();
      const items = fulfillmentData.items;
      setPoItems(items);

      // Initialize delivery items (only pending items)
      const pendingItems = items
        .filter((item: POItem) => item.pending_quantity > 0)
        .map((item: POItem) => createReceiptLine(item));
      
      setDeliveryItems(pendingItems);
    } catch (err: any) {
      console.error('Error fetching PO details:', err);
      setError(err.response?.data?.error || 'Failed to load purchase/supply order details');
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryItem = (index: number, field: keyof DeliveryItem, value: any) => {
    const updated = [...deliveryItems];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryItems(updated);
  };

  const getEnteredQuantityForPOItem = (poItemId: string, excludeIndex?: number) => {
    return deliveryItems.reduce((sum, item, index) => {
      if (item.po_item_id !== poItemId || index === excludeIndex) return sum;
      return sum + (item.quantity || 0);
    }, 0);
  };

  const addReceiptSplit = (poItem: POItem) => {
    setDeliveryItems(prev => [...prev, createReceiptLine(poItem)]);
  };

  const removeReceiptSplit = (index: number) => {
    const poItemId = deliveryItems[index]?.po_item_id;
    const splitCount = deliveryItems.filter(item => item.po_item_id === poItemId).length;

    if (splitCount <= 1) {
      setDeliveryItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: 0,
          quality_status: 'good',
          remarks: '',
          serial_numbers_input: '',
          serial_numbers: []
        };
        return updated;
      });
      return;
    }

    setDeliveryItems(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSerialNumberInput = (index: number, input: string) => {
    // Preserve raw input for editing UX; parse separately for payload
    const serialNumbers = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    setDeliveryItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        serial_numbers_input: input,
        serial_numbers: serialNumbers
      };
      return updated;
    });
  };

  const handleCSVImport = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Parse CSV - handle both comma and newline separated values
      const serialNumbers = text
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      setDeliveryItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          serial_numbers_input: serialNumbers.join('\n'),
          serial_numbers: serialNumbers
        };
        return updated;
      });
    };
    reader.readAsText(file);
  };

  const handleCreateDelivery = async () => {
    try {
      // Validate required fields
      if (!deliveryPersonnel.trim()) {
        setError('Delivery Personnel is required');
        return;
      }
      
      if (!deliveryChalan.trim()) {
        setError('Delivery Challan/Invoice Number is required');
        return;
      }

      // Validate delivery items
      const itemsToDeliver = deliveryItems.filter(item => item.quantity > 0);
      
      if (itemsToDeliver.length === 0) {
        setError('Please enter quantities for at least one item');
        return;
      }

      // Validate quantities don't exceed pending
      for (const poItem of poItems) {
        const totalForItem = itemsToDeliver
          .filter(item => item.po_item_id === poItem.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (totalForItem > poItem.pending_quantity) {
          setError(`Total received quantity for ${poItem.item_name} exceeds pending quantity (${poItem.pending_quantity})`);
          return;
        }
      }

      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Create delivery with FormData to support file upload
      const formData = new FormData();
      formData.append('delivery_date', deliveryDate);
      formData.append('delivery_personnel', deliveryPersonnel);
      formData.append('delivery_chalan', deliveryChalan);
      formData.append('notes', notes);
      
      // Add challan file if selected
      if (challanFile) {
        formData.append('challan_file', challanFile);
      }
      
      // Add items as JSON string
      const itemsData = itemsToDeliver.map(item => ({
        po_item_id: item.po_item_id,
        item_master_id: item.item_id,
        item_name: item.item_name,
        quantity_delivered: item.quantity,
        quality_status: item.quality_status,
        remarks: item.remarks,
        serial_numbers: item.serial_numbers || []
      }));
      formData.append('items', JSON.stringify(itemsData));

      const createResponse = await fetch(`${getApiBaseUrl()}/deliveries/for-po/${poId}`, {
        method: 'POST',
        body: formData // Don't set Content-Type, let browser set it with boundary
      });
      if (!createResponse.ok) {
        let createError = 'Failed to create delivery';

        try {
          const errorData = await createResponse.json();
          createError = errorData.details || errorData.error || createError;
        } catch {
          // Keep the default message when the response is not JSON.
        }

        throw new Error(createError);
      }
      const createData = await createResponse.json();

      const deliveryId = createData.id;
      setSuccess(`Delivery created successfully: ${createData.delivery_number}`);

      // Confirm receipt to trigger stock transaction
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error('Current user session is missing. Please log in again and retry.');
      }

      const receiveResponse = await fetch(`${getApiBaseUrl()}/deliveries/${deliveryId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_by: currentUserId,
          receiving_date: new Date().toISOString(),
          notes
        })
      });

      if (!receiveResponse.ok) {
        let receiveError = 'Failed to receive delivery';

        try {
          const errorData = await receiveResponse.json();
          receiveError = errorData.details || errorData.error || receiveError;
        } catch {
          // Fall back to the default message when the response is not JSON.
        }

        throw new Error(receiveError);
      }

      const receiveData = await receiveResponse.json();

      setSuccess(
        `✅ Delivery received successfully!\n` +
        `Acquisition Number: ${receiveData.acquisition_number}\n` +
        `${receiveData.total_items} item(s) added to inventory`
      );

      // Navigate back to tender with POs filtered after 2 seconds
      setTimeout(() => {
        navigate(getBackPath());
      }, 2000);

    } catch (err: any) {
      console.error('Error creating delivery:', err);
      setError(err.message || 'Failed to create delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const getQualityBadge = (status: string) => {
    const badges = {
      good: 'bg-green-100 text-green-800',
      damaged: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      partial: 'bg-blue-100 text-blue-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getBackPath = () => {
    if (po?.tender_id) {
      return `/dashboard/purchase-orders?tenderId=${po.tender_id}`;
    }
    return '/dashboard/purchase-orders';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading purchase/supply order...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Purchase/Supply order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receive Delivery</h1>
            <p className="text-gray-600 mt-1">PO: {po.po_number}</p>
          </div>
          <button
            onClick={() => navigate(getBackPath())}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to POs
          </button>
        </div>
      </div>

      {/* PO Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Purchase/Supply Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vendor</p>
            <p className="font-medium">{po.vendor_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">PO Date</p>
            <p className="font-medium">{new Date(po.po_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-medium">Rs. {po.total_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              po.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {po.status}
            </span>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 whitespace-pre-line">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 whitespace-pre-line">{success}</p>
        </div>
      )}

      {/* Delivery Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Date *
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Personnel *
            </label>
            <input
              type="text"
              value={deliveryPersonnel}
              onChange={(e) => setDeliveryPersonnel(e.target.value)}
              placeholder="Name of person delivering goods"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Challan/Invoice Number *
            </label>
            <input
              type="text"
              value={deliveryChalan}
              onChange={(e) => setDeliveryChalan(e.target.value)}
              placeholder="Vendor's challan or invoice number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Challan Scanned Copy
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setChallanFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {challanFile && (
                <button
                  type="button"
                  onClick={() => setChallanFile(null)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Upload scanned challan image or PDF (max 10MB)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery notes"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Items to Receive */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Items to Receive</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter quantities for items being delivered. Only items with pending quantities are shown.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordr
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recd
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recv Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SNo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryItems.map((deliveryItem, index) => {
                const poItem = poItems.find(pi => pi.id === deliveryItem.po_item_id);
                if (!poItem) return null;
                const enteredByOtherSplits = getEnteredQuantityForPOItem(poItem.id, index);
                const maxForThisSplit = Math.max(poItem.pending_quantity - enteredByOtherSplits, 0);
                const splitCount = deliveryItems.filter(item => item.po_item_id === poItem.id).length;

                return (
                  <tr key={deliveryItem.receipt_line_id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {deliveryItem.item_name}
                      </div>
                      {poItem.specifications && (
                        <div className="text-xs text-gray-500 mt-1">
                          {poItem.specifications}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {poItem.ordered_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {poItem.received_quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-medium text-blue-600">
                        {poItem.pending_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={maxForThisSplit}
                        value={deliveryItem.quantity}
                        onChange={(e) => {
                          const nextQuantity = parseInt(e.target.value) || 0;
                          updateDeliveryItem(index, 'quantity', Math.min(nextQuantity, maxForThisSplit));
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      {splitCount > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Max: {maxForThisSplit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={deliveryItem.quality_status}
                        onChange={(e) => updateDeliveryItem(index, 'quality_status', e.target.value)}
                        className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${getQualityBadge(deliveryItem.quality_status)}`}
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="rejected">Rejected</option>
                        <option value="partial">Partial</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={deliveryItem.remarks}
                        onChange={(e) => updateDeliveryItem(index, 'remarks', e.target.value)}
                        placeholder="Optional"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <textarea
                            value={deliveryItem.serial_numbers_input ?? ''}
                            onChange={(e) => handleSerialNumberInput(index, e.target.value)}
                            placeholder="Enter serial numbers (one per line)"
                            rows={3}
                            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCSVImport(index, file);
                              e.target.value = ''; // Reset file input
                            }}
                            className="hidden"
                            id={`csv-upload-${index}`}
                          />
                          <label
                            htmlFor={`csv-upload-${index}`}
                            className="cursor-pointer px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center gap-1 text-sm"
                            title="Import from CSV"
                          >
                            <Upload className="w-4 h-4" />
                            CSV
                          </label>
                        </div>
                        {deliveryItem.serial_numbers && deliveryItem.serial_numbers.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {deliveryItem.serial_numbers.length} serial number(s) entered
                            {deliveryItem.quantity > 0 && deliveryItem.serial_numbers.length !== deliveryItem.quantity && (
                              <span className="text-amber-600 ml-1">
                                (Expected: {deliveryItem.quantity})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => addReceiptSplit(poItem)}
                          disabled={getEnteredQuantityForPOItem(poItem.id) >= poItem.pending_quantity}
                          className="px-3 py-2 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-200 disabled:hover:bg-white"
                        >
                          Add Split
                        </button>
                        {splitCount > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReceiptSplit(index)}
                            className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {deliveryItems.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">All items for this purchase/supply order have been fully received.</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate(getBackPath())}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateDelivery}
          disabled={submitting || deliveryItems.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing...' : 'Confirm Receipt & Update Inventory'}
        </button>
      </div>
    </div>
  );
};

export default ReceiveDelivery;
