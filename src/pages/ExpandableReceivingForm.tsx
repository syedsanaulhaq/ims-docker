import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Package, Calendar, User, FileText, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDMY } from '@/utils/dateUtils';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';

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

interface VisitDetail {
  id: string;
  visit_number: number;
  tender_qty: number;
  received_qty: number;
  pending_qty: number;
  received_by?: string;
  received_date?: string;
  delivery_notes?: string;
  delivery_status: string;
  unit_price: number;
  total_value: number;
  vendor?: string;
  department?: string;
  created_at: string;
}

interface ExpandedVisit {
  received_qty: number;
  received_by: string;
  received_date: string;
  delivery_notes: string;
  delivery_status: string;
}

const ExpandableReceivingForm: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  
  const [acquisitionItems, setAcquisitionItems] = useState<AcquisitionItem[]>([]);
  const [tenderInfo, setTenderInfo] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingVisits, setEditingVisits] = useState<{ [key: string]: ExpandedVisit }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenderId) {
      fetchAcquisitionData();
    }
  }, [tenderId]);

  const fetchAcquisitionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch tender information
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tenderId)
        .single();

      if (tenderError) {
        throw new Error(`Error fetching tender: ${tenderError.message}`);
      }

      setTenderInfo(tender);

      // Fetch acquisition items with visit details using our new function
      const { data: items, error: itemsError } = await supabase
        .rpc('get_acquisition_items_with_visits_fixed', { p_tender_id: tenderId });

      if (itemsError) {
        throw new Error(`Error fetching acquisition items: ${itemsError.message}`);
      }

      setAcquisitionItems(items || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch acquisition data');
      
    } finally {
      setIsLoading(false);
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

  const startEditingVisit = (visitId: string, visit: VisitDetail) => {
    setEditingVisits(prev => ({
      ...prev,
      [visitId]: {
        received_qty: visit.received_qty,
        received_by: visit.received_by || '',
        received_date: visit.received_date || new Date().toISOString().split('T')[0],
        delivery_notes: visit.delivery_notes || '',
        delivery_status: visit.delivery_status
      }
    }));
  };

  const updateEditingVisit = (visitId: string, field: keyof ExpandedVisit, value: string | number) => {
    setEditingVisits(prev => ({
      ...prev,
      [visitId]: {
        ...prev[visitId],
        [field]: value
      }
    }));
  };

  const saveVisitDetails = async (visitId: string) => {
    try {
      setIsSaving(true);
      const visitData = editingVisits[visitId];
      
      if (!visitData) return;

      const { error } = await supabase
        .rpc('save_visit_receiving_details', {
          p_transaction_id: visitId,
          p_received_qty: visitData.received_qty,
          p_received_by: visitData.received_by,
          p_received_date: visitData.received_date,
          p_delivery_notes: visitData.delivery_notes,
          p_delivery_status: visitData.delivery_status
        });

      if (error) {
        throw new Error(`Error saving visit details: ${error.message}`);
      }

      // Remove from editing state
      const newEditingVisits = { ...editingVisits };
      delete newEditingVisits[visitId];
      setEditingVisits(newEditingVisits);

      // Refresh data
      await fetchAcquisitionData();
      
      toast.success('Visit details saved successfully!');

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save visit details');
      
    } finally {
      setIsSaving(false);
    }
  };

  const addNewVisit = async (itemMasterId: string, tenderQty: number) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .rpc('add_new_visit', {
          p_tender_id: tenderId,
          p_item_master_id: itemMasterId,
          p_tender_qty: tenderQty,
          p_received_qty: 0,
          p_received_by: '',
          p_received_date: new Date().toISOString().split('T')[0],
          p_delivery_notes: 'New visit - pending delivery',
          p_unit_price: 0,
          p_vendor: tenderInfo?.vendor || '',
          p_department: 'Procurement'
        });

      if (error) {
        throw new Error(`Error adding new visit: ${error.message}`);
      }

      // Refresh data
      await fetchAcquisitionData();
      
      toast.success('New visit added successfully!');

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add new visit');
      
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return formatDateDMY(dateStr);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAcquisitionData} />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Expandable Receiving Details</h1>
            <p className="text-muted-foreground">
              {tenderInfo?.title || `Tender ${tenderInfo?.tender_number}`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="flex items-center space-x-2">
          <Package className="h-4 w-4" />
          <span>{acquisitionItems.length} Items</span>
        </Badge>
      </div>

      {/* Tender Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Tender Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tender Number</label>
            <p className="font-medium">{tenderInfo?.tender_number || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="font-medium">{tenderInfo?.title || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Badge className={getStatusColor(tenderInfo?.status || 'draft')}>
              {tenderInfo?.status || 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Acquisition Items */}
      <div className="space-y-4">
        {acquisitionItems.map((item) => (
          <Card key={item.item_master_id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleItemExpansion(item.item_master_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedItems.has(item.item_master_id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{item.item_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {item.category} → {item.subcategory}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-right">
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="font-medium">
                      {item.total_received_qty} / {item.total_tender_qty} {item.unit_of_measurement}
                    </p>
                  </div>
                  <Badge className={getStatusColor(item.overall_status)}>
                    {item.overall_status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {expandedItems.has(item.item_master_id) && (
              <CardContent className="border-t">
                <div className="space-y-4">
                  {/* Add New Visit Button */}
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Visit Details</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addNewVisit(item.item_master_id, item.total_tender_qty)}
                      disabled={isSaving}
                    >
                      Add New Visit
                    </Button>
                  </div>

                  {/* Visit Details */}
                  <div className="space-y-3">
                    {item.visit_details.map((visit) => (
                      <div key={visit.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">Visit {visit.visit_number}</Badge>
                            <Badge className={getStatusColor(visit.delivery_status)}>
                              {visit.delivery_status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(visit.created_at)}
                          </div>
                        </div>

                        {editingVisits[visit.id] ? (
                          // Editing Mode
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="text-sm font-medium">Received Quantity</label>
                              <Input
                                type="number"
                                value={editingVisits[visit.id].received_qty}
                                onChange={(e) => updateEditingVisit(visit.id, 'received_qty', Number(e.target.value))}
                                max={visit.tender_qty}
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Received By</label>
                              <Input
                                value={editingVisits[visit.id].received_by}
                                onChange={(e) => updateEditingVisit(visit.id, 'received_by', e.target.value)}
                                placeholder="Person who received"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Received Date</label>
                              <Input
                                type="date"
                                value={editingVisits[visit.id].received_date}
                                onChange={(e) => updateEditingVisit(visit.id, 'received_date', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <Select
                                value={editingVisits[visit.id].delivery_status}
                                onValueChange={(value) => updateEditingVisit(visit.id, 'delivery_status', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="partial">Partial</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2 lg:col-span-4">
                              <label className="text-sm font-medium">Delivery Notes</label>
                              <Textarea
                                value={editingVisits[visit.id].delivery_notes}
                                onChange={(e) => updateEditingVisit(visit.id, 'delivery_notes', e.target.value)}
                                placeholder="Notes about this delivery..."
                                rows={2}
                              />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4 flex space-x-2">
                              <Button
                                onClick={() => saveVisitDetails(visit.id)}
                                disabled={isSaving}
                                className="flex items-center space-x-2"
                              >
                                <Save className="h-4 w-4" />
                                <span>Save</span>
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const newEditingVisits = { ...editingVisits };
                                  delete newEditingVisits[visit.id];
                                  setEditingVisits(newEditingVisits);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Display Mode
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                              <p className="font-medium">
                                {visit.received_qty} / {visit.tender_qty} {item.unit_of_measurement}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Received By</label>
                              <p className="font-medium flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{visit.received_by || 'Not specified'}</span>
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Received Date</label>
                              <p className="font-medium flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(visit.received_date)}</span>
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Value</label>
                              <p className="font-medium">₹{visit.total_value?.toLocaleString() || '0'}</p>
                            </div>
                            {visit.delivery_notes && (
                              <div className="md:col-span-2 lg:col-span-4">
                                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                                <p className="text-sm">{visit.delivery_notes}</p>
                              </div>
                            )}
                            <div className="md:col-span-2 lg:col-span-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingVisit(visit.id, visit)}
                              >
                                Edit Visit Details
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {acquisitionItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No acquisition items found</h3>
            <p className="text-muted-foreground">
              This tender doesn't have any associated acquisition items yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpandableReceivingForm;
