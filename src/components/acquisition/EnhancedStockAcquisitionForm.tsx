import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Save, Calendar, User, FileText, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface AcquisitionSummary {
  total_items: number;
  pending_items: number;
  partial_items: number;
  completed_items: number;
  total_visits: number;
  completion_percentage: number;
}

interface StockAcquisitionFormProps {
  tenderId: string;
  tenderTitle?: string;
  onSave?: () => void;
}

export const StockAcquisitionForm: React.FC<StockAcquisitionFormProps> = ({ 
  tenderId, 
  tenderTitle,
  onSave 
}) => {
  const [items, setItems] = useState<AcquisitionItem[]>([]);
  const [summary, setSummary] = useState<AcquisitionSummary | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Main form data (tender-level fields only)
  const [formData, setFormData] = useState({
    tender_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    purchase_order_no: '',
    invoice_no: '',
    general_notes: ''
  });

  useEffect(() => {
    if (tenderId) {
      loadAcquisitionData();
    }
  }, [tenderId]);

  const loadAcquisitionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load acquisition items with visit details
      const { data: itemsData, error: itemsError } = await supabase
        .rpc('get_acquisition_items_with_visits_fixed', { p_tender_id: tenderId });

      if (itemsError) {
        
        throw itemsError;
      }

      // Load acquisition summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_acquisition_summary', { p_tender_id: tenderId });

      if (summaryError) {
        
        throw summaryError;
      }

      setItems(itemsData || []);
      setSummary(summaryData?.[0] || null);

      // Auto-expand items with pending or partial status
      const autoExpand = new Set<string>();
      (itemsData || []).forEach((item: AcquisitionItem) => {
        if (item.overall_status === 'pending' || item.overall_status === 'partial') {
          autoExpand.add(item.item_master_id);
        }
      });
      setExpandedItems(autoExpand);

    } catch (error: any) {
      
      setError(error.message || 'Failed to load acquisition data');
      toast.error('Failed to load acquisition data');
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
    transactionId: string,
    receivedQty: number,
    receivedBy: string,
    receivedDate: string,
    deliveryNotes: string
  ) => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .rpc('save_visit_receiving_details', {
          p_transaction_id: transactionId,
          p_received_qty: receivedQty,
          p_received_by: receivedBy || null,
          p_received_date: receivedDate || null,
          p_delivery_notes: deliveryNotes || null
        });

      if (error) throw error;
      
      toast.success('Receiving details updated successfully');
      
      // Reload data to show updated status
      await loadAcquisitionData();
      
      if (onSave) onSave();
      
    } catch (error: any) {
      
      toast.error('Failed to update receiving details');
    } finally {
      setSaving(false);
    }
  };

  const addNewVisit = async (itemMasterId: string, pendingQty: number) => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .rpc('add_new_visit', {
          p_tender_id: tenderId,
          p_item_master_id: itemMasterId,
          p_tender_qty: pendingQty,
          p_received_qty: 0
        });

      if (error) throw error;
      
      toast.success('New visit added successfully');
      
      // Reload data to show new visit and auto-expand the item
      await loadAcquisitionData();
      
      // Ensure the item is expanded to show the new visit
      setExpandedItems(prev => new Set([...prev, itemMasterId]));
      
    } catch (error: any) {
      
      toast.error('Failed to add new visit');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      partial: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Package },
      completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle }
    };

    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-gray-500">Loading acquisition data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={loadAcquisitionData} className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Acquisition Overview</span>
              <div className="text-2xl font-bold text-primary">
                {summary.completion_percentage}%
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total_items}</div>
                <div className="text-sm text-gray-500">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.completed_items}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.partial_items}</div>
                <div className="text-sm text-gray-500">Partial</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.pending_items}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total_visits}</div>
                <div className="text-sm text-gray-500">Total Visits</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clean Main Form - Tender Level Fields Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {tenderTitle ? `${tenderTitle} - Acquisition Details` : 'Stock Acquisition Details'}
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
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No acquisition items found for this tender.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.item_master_id} className="border rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
                  {/* Compact Item Row */}
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    onClick={() => toggleItemExpansion(item.item_master_id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedItems.has(item.item_master_id) ? 
                        <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      }
                      <div>
                        <div className="font-medium text-gray-900">{item.item_name}</div>
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
                          {item.total_pending_qty > 0 ? `${item.total_pending_qty} pending` : 'Complete'}
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
                      {item.visit_details.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No visits recorded yet.
                        </div>
                      ) : (
                        item.visit_details.map((visit) => (
                          <VisitReceivingForm
                            key={visit.id}
                            visit={visit}
                            onSave={(receivedQty, receivedBy, receivedDate, notes) =>
                              updateVisitReceivingDetails(visit.id, receivedQty, receivedBy, receivedDate, notes)
                            }
                            saving={saving}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Separate component for visit receiving details
interface VisitReceivingFormProps {
  visit: VisitDetail;
  onSave: (receivedQty: number, receivedBy: string, receivedDate: string, notes: string) => void;
  saving: boolean;
}

const VisitReceivingForm: React.FC<VisitReceivingFormProps> = ({ visit, onSave, saving }) => {
  const [formData, setFormData] = useState({
    received_qty: visit.received_qty,
    received_by: visit.received_by || '',
    received_date: visit.received_date || '',
    delivery_notes: visit.delivery_notes || ''
  });

  const handleSave = () => {
    onSave(
      formData.received_qty,
      formData.received_by,
      formData.received_date,
      formData.delivery_notes
    );
  };

  const hasChanges = 
    formData.received_qty !== visit.received_qty ||
    formData.received_by !== (visit.received_by || '') ||
    formData.received_date !== (visit.received_date || '') ||
    formData.delivery_notes !== (visit.delivery_notes || '');

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4 border">
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
            step="0.01"
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
  const configs = {
    pending: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
    partial: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Package },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle }
  };

  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default StockAcquisitionForm;
