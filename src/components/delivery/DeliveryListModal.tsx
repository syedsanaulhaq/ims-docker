import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, Calendar, FileText, User, Edit2, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';
import EditDeliveryModal from './EditDeliveryModal';

interface Delivery {
  id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  delivery_date: string;
  delivery_status: string;
  delivery_personnel?: string;
  delivery_chalan?: string;
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

interface DeliveryListModalProps {
  poId: string;
  poNumber: string;
  vendorName: string;
  onClose: () => void;
}

export default function DeliveryListModal({ poId, poNumber, vendorName, onClose }: DeliveryListModalProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [poId]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/deliveries/by-po/${poId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch deliveries`);
      }
      
      const data = await response.json();
      setDeliveries(data);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching deliveries:', err.message);
      setError(`Failed to load deliveries: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'partial': 'bg-blue-100 text-blue-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (deliveryId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/deliveries/${deliveryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete delivery');
      }

      const result = await response.json();
      alert(result.message || 'Delivery deleted. Items are now available for re-delivery.');
      setDeliveries(deliveries.filter(d => d.id !== deliveryId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('❌ Error deleting delivery:', err.message);
      alert(`Failed to delete delivery: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Loading deliveries...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editingDelivery) {
    return (
      <EditDeliveryModal
        delivery={editingDelivery}
        onClose={() => setEditingDelivery(null)}
        onSuccess={fetchDeliveries}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Deliveries for PO: {poNumber}</h2>
            <p className="text-sm text-gray-600">Vendor: {vendorName}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {deliveries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No deliveries recorded yet for this PO</p>
              <p className="text-sm text-gray-400 mt-2">Deliveries will appear here once items are received</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Layout */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Delivery #</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Delivery Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Personnel</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Challan No</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-900">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Total Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Good</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Damaged</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Rejected</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <React.Fragment key={delivery.id}>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 font-medium text-slate-900">{delivery.delivery_number}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {new Date(delivery.delivery_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {delivery.delivery_personnel || '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {delivery.delivery_chalan || '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge className={getStatusBadge(delivery.delivery_status)}>
                              {delivery.delivery_status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {delivery.total_quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 font-semibold">
                            {delivery.good_quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-yellow-600 font-semibold">
                            {delivery.damaged_quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-semibold">
                            {delivery.rejected_quantity}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingDelivery(delivery)}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm(delivery.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {deleteConfirm === delivery.id && (
                          <tr className="bg-red-50 border-b border-gray-200">
                            <td colSpan={10} className="px-3 py-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-red-600 font-medium">
                                    ⚠️ Delete this delivery?
                                  </p>
                                  <p className="text-xs text-red-500 mt-1">
                                    This will remove all received items and stock acquisitions. Items will return to pending status.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDelete(delivery.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Total: {deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items Received:</span>
                      <span className="ml-2 font-semibold">
                        {deliveries.reduce((sum, d) => sum + d.total_quantity, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
