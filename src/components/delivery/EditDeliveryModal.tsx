import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

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

interface EditDeliveryModalProps {
  delivery: Delivery;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditDeliveryModal({ delivery, onClose, onSuccess }: EditDeliveryModalProps) {
  const [formData, setFormData] = useState({
    delivery_personnel: delivery.delivery_personnel || '',
    delivery_chalan: delivery.delivery_chalan || '',
    notes: delivery.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/deliveries/${delivery.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_personnel: formData.delivery_personnel,
          delivery_chalan: formData.delivery_chalan,
          notes: formData.notes,
          po_id: delivery.po_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update delivery`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Error updating delivery:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Edit Delivery: {delivery.delivery_number}</h2>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <CardContent className="pt-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Read-only delivery info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">PO Number</label>
                <p className="text-slate-900 font-medium">{delivery.po_number}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Delivery Date</label>
                <p className="text-slate-900 font-medium">
                  {new Date(delivery.delivery_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <p className="text-slate-900 font-medium capitalize">{delivery.delivery_status}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Total Items</label>
                <p className="text-slate-900 font-medium">{delivery.total_quantity}</p>
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Delivery Personnel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="delivery_personnel"
                value={formData.delivery_personnel}
                onChange={handleChange}
                placeholder="e.g., Zahid Khan"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Delivery Challan Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="delivery_chalan"
                value={formData.delivery_chalan}
                onChange={handleChange}
                placeholder="e.g., CH-0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
