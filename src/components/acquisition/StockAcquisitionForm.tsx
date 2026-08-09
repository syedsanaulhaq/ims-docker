import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Save, Calendar, User, FileText, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface VisitDetail {
  id: string;
  visit_number: number;
  tender_qty: number;
  received_qty: number;
  pending_qty: number;
  received_by?: string;
  received_date?: string;
  delivery_notes?: string;
  delivery_status: 'pending' | 'partial' | 'completed' | 'cancelled';
  created_at: string;
}

interface AcquisitionItem {
  item_master_id: string;
  item_name: string;
  category: string;
  subcategory: string;
  unit_of_measurement: string;
  total_tender_qty: number;
  total_received_qty: number;
  total_pending_qty: number;
  overall_status: string;
  visit_details: VisitDetail[];
}

interface StockAcquisitionFormProps {
  tenderId: string;
  onSave?: () => void;
}

export const StockAcquisitionForm: React.FC<StockAcquisitionFormProps> = ({ 
  tenderId, 
  onSave 
}) => {
  const [items, setItems] = useState<AcquisitionItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Main form data (tender-level fields only)
  const [formData, setFormData] = useState({
    tender_date: '',
    supplier_name: '',
    purchase_order_no: '',
    invoice_no: '',
    general_notes: ''
  });

  useEffect(() => {
    loadAcquisitionItems();
  }, [tenderId]);

  const loadAcquisitionItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_acquisition_items_with_visits_fixed', { p_tender_id: tenderId });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const updateVisitReceivingDetails = async (
    acquisitionId: string,
    receivedQty: number,
    receivedBy: string,
    receivedDate: string,
    deliveryNotes: string
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .rpc('save_visit_receiving_details', {
          p_acquisition_id: acquisitionId,
          p_received_qty: receivedQty,
          p_received_by: receivedBy || null,
          p_received_date: receivedDate || null,
          p_delivery_notes: deliveryNotes || null
        });

      if (error) throw error;
      
      // Reload data to show updated status
      await loadAcquisitionItems();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  const addNewVisit = async (itemId: string, pendingQty: number) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .rpc('add_new_acquisition_visit', {
          p_item_master_id: itemId,
          p_tender_id: tenderId,
          p_max_qty: pendingQty
        });

      if (error) throw error;
      
      // Reload data to show new visit
      await loadAcquisitionItems();
    } catch (error) {
      
    } finally {
      setSaving(false);
    }
  };

  function getStatusBadge(status: string) {
    const colors = {
      pending: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || colors.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading acquisition data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Clean Main Form - Tender Level Fields Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Acquisition Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tender Date</label>
              <Input
                type="date"
                value={formData.tender_date}
                onChange={(e) => setFormData(prev => ({ ...prev, tender_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supplier Name</label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="Enter supplier name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase/Supply Order No.</label>
              <Input
                value={formData.purchase_order_no}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_order_no: e.target.value }))}
                placeholder="Enter PO number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice No.</label>
              <Input
                value={formData.invoice_no}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
                placeholder="Enter invoice number"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">General Notes</label>
              <Textarea
                value={formData.general_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, general_notes: e.target.value }))}
                placeholder="Any general notes about this acquisition..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items with Expandable Receiving Details */}
      <Card>
        <CardHeader>
          <CardTitle>Items & Receiving Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.item_master_id} className="border rounded-lg p-4">
                {/* Compact Item Row */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                  onClick={() => toggleItemExpansion(item.item_master_id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedItems.has(item.item_master_id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    <div>
                      <div className="font-medium">{item.item_name}</div>
                      <div className="text-sm text-gray-500">
                        {item.category} • {item.subcategory} • {item.unit_of_measurement}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {item.total_received_qty} / {item.total_tender_qty}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.total_pending_qty} pending
                      </div>
                    </div>
                    {getStatusBadge(item.overall_status)}
                  </div>
                </div>

                {/* Expandable Section - ALL Receiving Details */}
                {expandedItems.has(item.item_master_id) && (
                  <div className="mt-4 pl-6 border-l-2 border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900">Delivery Visits</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addNewVisit(item.item_master_id, item.total_pending_qty)}
                        disabled={saving || item.total_pending_qty <= 0}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Visit
                      </Button>
                    </div>

                    {/* Visit Details */}
                    {item.visit_details.map((visit) => (
                      <VisitReceivingForm
                        key={visit.id}
                        visit={visit}
                        onSave={(receivedQty, receivedBy, receivedDate, notes) =>
                          updateVisitReceivingDetails(visit.id, receivedQty, receivedBy, receivedDate, notes)
                        }
                        saving={saving}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Separate component for visit receiving details
interface VisitReceivingFormProps {
  visit: VisitDetail;
  onSave: (receivedQty: number, receivedBy: string, receivedDate: string, notes: string, unitPrice?: number) => void;
  saving: boolean;
}

const VisitReceivingForm: React.FC<VisitReceivingFormProps> = ({ visit, onSave, saving }) => {
  const [formData, setFormData] = useState({
    received_qty: visit.received_qty,
    received_by: visit.received_by || '',
    received_date: visit.received_date || '',
    delivery_notes: visit.delivery_notes || ''
  });

  const hasChanges = 
    formData.received_qty !== visit.received_qty ||
    formData.received_by !== (visit.received_by || '') ||
    formData.received_date !== (visit.received_date || '') ||
    formData.delivery_notes !== (visit.delivery_notes || '');

  const handleSave = () => {
    onSave(
      formData.received_qty, 
      formData.received_by, 
      formData.received_date, 
      formData.delivery_notes
    );
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Visit #{visit.visit_number}</span>
          {getStatusBadge(visit.delivery_status)}
        </div>
        <div className="text-sm text-gray-500">
          {visit.tender_qty} ordered • {visit.pending_qty} pending
        </div>
      </div>

      {/* All Receiving Fields in Expandable Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1 text-sm font-medium mb-1">
            <Package className="h-4 w-4" />
            Received Quantity
          </label>
          <Input
            type="number"
            value={formData.received_qty}
            onChange={(e) => setFormData(prev => ({ ...prev, received_qty: parseFloat(e.target.value) || 0 }))}
            max={visit.tender_qty}
            min={0}
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium mb-1">
            <User className="h-4 w-4" />
            Received By
          </label>
          <Input
            value={formData.received_by}
            onChange={(e) => setFormData(prev => ({ ...prev, received_by: e.target.value }))}
            placeholder="Name of person who received"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium mb-1">
            <Calendar className="h-4 w-4" />
            Received Date
          </label>
          <Input
            type="date"
            value={formData.received_date}
            onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium mb-1">
            <FileText className="h-4 w-4" />
            Delivery Notes
          </label>
          <Textarea
            value={formData.delivery_notes}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
            placeholder="Any notes about this delivery..."
            rows={2}
          />
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

function getStatusBadge(status: string) {
  const colors = {
    pending: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <Badge className={colors[status as keyof typeof colors] || colors.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default StockAcquisitionForm;
