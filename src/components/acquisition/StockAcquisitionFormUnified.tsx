import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Save, 
  Calendar, 
  User, 
  FileText, 
  Package,
  Lock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { stockAcquisitionService, Delivery, AcquisitionItem } from '@/services/stockAcquisitionService';

interface StockAcquisitionFormProps {
  tenderId: string;
  onSave?: () => void;
  currentUserId?: string; // For tracking who finalizes
}

export const StockAcquisitionFormUnified: React.FC<StockAcquisitionFormProps> = ({ 
  tenderId, 
  onSave,
  currentUserId 
}) => {
  const [acquisitions, setAcquisitions] = useState<Delivery[]>([]);
  const [selectedAcquisition, setSelectedAcquisition] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Form data for tender-level fields
  const [formData, setFormData] = useState({
    tender_date: '',
    supplier_name: '',
    purchase_order_no: '',
    invoice_no: '',
    general_notes: ''
  });

  useEffect(() => {
    loadAcquisitions();
  }, [tenderId]);

  const loadAcquisitions = async () => {
    try {
      setLoading(true);
      const data = await stockAcquisitionService.getAcquisitionByTenderId(tenderId);
      setAcquisitions(data);
      
      if (data.length > 0) {
        // Select the first acquisition by default
        setSelectedAcquisition(data[0]);
        updateFormData(data[0]);
      }
    } catch (error) {
      console.error('Error loading acquisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (acquisition: Delivery) => {
    setFormData({
      tender_date: acquisition.delivery_date || '',
      supplier_name: acquisition.delivery_personnel || '',
      purchase_order_no: '',
      invoice_no: '',
      general_notes: acquisition.delivery_notes || ''
    });
  };

  const handleSave = async () => {
    if (!selectedAcquisition) return;

    try {
      setSaving(true);
      
      const updateData: Partial<Delivery> = {
        delivery_date: formData.tender_date,
        delivery_personnel: formData.supplier_name,
        delivery_notes: formData.general_notes,
      };

      await stockAcquisitionService.updateAcquisition(selectedAcquisition.id, updateData);
      
      // Reload data
      await loadAcquisitions();
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving acquisition:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedAcquisition || !currentUserId) {
      alert('Cannot finalize: Missing acquisition or user information');
      return;
    }

    const confirmFinalize = window.confirm(
      `Are you sure you want to finalize this acquisition?\n\n` +
      `Once finalized, you will not be able to make any further edits.\n` +
      `This action cannot be undone.`
    );

    if (!confirmFinalize) return;

    try {
      setFinalizing(true);
      
      const result = await stockAcquisitionService.finalizeAcquisition(
        selectedAcquisition.id, 
        currentUserId
      );

      if (result.success) {
        alert(`✅ ${result.message}`);
        // Reload acquisitions to reflect finalized status
        await loadAcquisitions();
      }
    } catch (error) {
      console.error('Error finalizing acquisition:', error);
      alert(`❌ Failed to finalize acquisition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFinalizing(false);
    }
  };

  const isFinalized = selectedAcquisition ? stockAcquisitionService.isFinalized(selectedAcquisition) : false;
  const finalizationInfo = selectedAcquisition ? stockAcquisitionService.getFinalizationInfo(selectedAcquisition) : { isFinalized: false, reason: 'none' };
  const hasChanges = selectedAcquisition && (
    formData.tender_date !== (selectedAcquisition.delivery_date || '') ||
    formData.supplier_name !== (selectedAcquisition.delivery_personnel || '') ||
    formData.general_notes !== (selectedAcquisition.delivery_notes || '')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading acquisitions...</p>
        </div>
      </div>
    );
  }

  if (acquisitions.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Acquisitions Found</h3>
        <p className="text-gray-600">No stock acquisitions found for this tender.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Acquisition
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Acquisition Status Header */}
      {selectedAcquisition && (
        <Card className={`border-l-4 ${isFinalized ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {isFinalized ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span className="font-medium">
                    {isFinalized ? 
                      (finalizationInfo.reason === 'tender' ? 'Tender Finalized' : 'Delivery Finalized') 
                      : 'Draft Acquisition'}
                  </span>
                </div>
                <Badge variant={isFinalized ? 'default' : 'secondary'}>
                  Delivery #{selectedAcquisition.delivery_number}
                </Badge>
              </div>

              {isFinalized && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Lock className="h-4 w-4" />
                  <span>
                    {finalizationInfo.reason === 'tender' 
                      ? 'Locked - Tender is finalized' 
                      : 'Locked from editing'}
                  </span>
                </div>
              )}
            </div>

            {isFinalized && (
              <div className="mt-3 text-sm text-gray-600">
                {finalizationInfo.reason === 'tender' ? (
                  <p>🔒 This acquisition cannot be edited because the tender has been finalized.</p>
                ) : finalizationInfo.reason === 'delivery' && 'finalizedAt' in finalizationInfo && finalizationInfo.finalizedAt ? (
                  <p>Finalized on: {new Date(finalizationInfo.finalizedAt).toLocaleString()}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acquisition Selection */}
      {acquisitions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acquisitions.map((acquisition) => {
                const isSelected = selectedAcquisition?.id === acquisition.id;
                const acquisitionFinalized = stockAcquisitionService.isFinalized(acquisition);

                return (
                  <Card 
                    key={acquisition.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedAcquisition(acquisition);
                      updateFormData(acquisition);
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Delivery #{acquisition.delivery_number}</span>
                        {acquisitionFinalized && <Lock className="h-4 w-4 text-green-600" />}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {acquisition.delivery_date || 'No date'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {acquisition.delivery_personnel || 'No personnel'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Acquisition Form */}
      {selectedAcquisition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Acquisition Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Delivery Date
                </label>
                <Input
                  type="date"
                  value={formData.tender_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, tender_date: e.target.value }))}
                  disabled={isFinalized}
                  className={isFinalized ? 'bg-gray-100' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Delivery Personnel
                </label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="Enter delivery personnel name"
                  disabled={isFinalized}
                  className={isFinalized ? 'bg-gray-100' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purchase/Supply Order No.</label>
                <Input
                  value={formData.purchase_order_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_order_no: e.target.value }))}
                  placeholder="Enter PO number"
                  disabled={isFinalized}
                  className={isFinalized ? 'bg-gray-100' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Invoice No.</label>
                <Input
                  value={formData.invoice_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
                  placeholder="Enter invoice number"
                  disabled={isFinalized}
                  className={isFinalized ? 'bg-gray-100' : ''}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">General Notes</label>
              <Textarea
                value={formData.general_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, general_notes: e.target.value }))}
                placeholder="Enter any additional notes about this acquisition"
                rows={3}
                disabled={isFinalized}
                className={isFinalized ? 'bg-gray-100' : ''}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex space-x-2">
                {hasChanges && !isFinalized && (
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {!isFinalized && (
                  <Button 
                    onClick={handleFinalize} 
                    disabled={finalizing || !currentUserId}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    {finalizing ? 'Finalizing...' : 'Finalize Acquisition'}
                  </Button>
                )}

                {isFinalized && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Acquisition Finalized
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Finalization:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Once finalized, all fields will be locked and cannot be edited</li>
                <li>• Finalization creates an audit trail with timestamp and user</li>
                <li>• Use this feature when the acquisition is complete and verified</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAcquisitionFormUnified;
