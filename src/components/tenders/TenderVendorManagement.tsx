import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AddVendorModal from '@/components/vendor/AddVendorModal';

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface TenderVendor {
  id?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_code?: string;
  quoted_amount?: number;
  proposal_document_path?: string;
  proposal_document_name?: string;
  proposal_upload_date?: string;
  proposal_file_size?: number;
  is_awarded: boolean;
  is_successful?: boolean; // Added for successful bidder
  remarks?: string;
}

interface TenderVendorManagementProps {
  tenderId?: string; // Optional - for editing existing tender
  vendors: Vendor[]; // All available vendors
  initialBidders?: TenderVendor[]; // Initial bidders to populate (from parent state)
  onVendorsChange?: (vendors: TenderVendor[]) => void; // Callback for parent component
  onSuccessfulVendorChange?: (vendorId: string | null) => void; // Callback when successful vendor is selected
  onPendingProposalsChange?: (hasPending: boolean) => void; // Callback when pending proposals change
  onItemsChange?: (items: any[]) => void; // Callback when items are updated (e.g., vendor removed)
  onVendorAdded?: () => void; // Callback when a new vendor is created to refresh vendor list
  readOnly?: boolean;
  maxVendors?: number; // Maximum number of vendors allowed (for Petty Purchase)
  minVendors?: number; // Minimum number of vendors required (for multiple quotation)
  procurementMethod?: string; // Procurement method for Petty Purchase
  tenderItems?: any[]; // Optional - tender items to check vendor usage
  tenderType?: string; // Tender type (contract, spot-purchase, annual-tender)
}

const TenderVendorManagement: React.FC<TenderVendorManagementProps> = ({
  tenderId,
  vendors,
  initialBidders = [],
  onVendorsChange,
  onSuccessfulVendorChange,
  onPendingProposalsChange,
  onItemsChange,
  onVendorAdded,
  readOnly = false,
  maxVendors,
  minVendors,
  procurementMethod,
  tenderItems = [],
  tenderType
}) => {
  const [tenderVendors, setTenderVendors] = useState<TenderVendor[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<TenderVendor | null>(null);
  const [uploadingProposal, setUploadingProposal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  
  // Store pending proposal files for vendors (before tender is saved)
  const [pendingProposals, setPendingProposals] = useState<{ [vendorId: string]: File }>({});

  // Form state for add/edit dialog
  const [formData, setFormData] = useState({
    vendor_id: '',
    quoted_amount: '',
    remarks: ''
  });
  
  // Proposal files state for add dialog (support multiple files)
  const [proposalFiles, setProposalFiles] = useState<File[]>([]);
  
  // Ref to track if we've already loaded vendors for the current tender
  const loadedTenderIdRef = useRef<string | null>(null);

  // Load tender vendors if tender ID is provided (editing mode)
  useEffect(() => {
    if (tenderId && loadedTenderIdRef.current !== tenderId) {
      // Only load if we haven't loaded this tender yet
      loadedTenderIdRef.current = tenderId;
      loadTenderVendors();
    } else if (!tenderId && initialBidders.length > 0 && loadedTenderIdRef.current === null) {
      // If no tenderId but have initial bidders, use them (only once)
      setTenderVendors(initialBidders);
      loadedTenderIdRef.current = 'initialized';
    }
  }, [tenderId]);

  // Notify parent component when vendors change
  useEffect(() => {
    if (onVendorsChange) {
      onVendorsChange(tenderVendors);
    }
  }, [tenderVendors, onVendorsChange]);

  // Notify parent when pending proposals change
  useEffect(() => {
    if (onPendingProposalsChange) {
      onPendingProposalsChange(Object.keys(pendingProposals).length > 0);
    }
  }, [pendingProposals, onPendingProposalsChange]);

  // Upload all pending proposals after tender is saved
  useEffect(() => {
    if (tenderId && Object.keys(pendingProposals).length > 0) {
      uploadPendingProposals();
    }
  }, [tenderId]);

  const uploadPendingProposals = async () => {
    const vendorIds = Object.keys(pendingProposals);
    
    for (const vendorId of vendorIds) {
      const file = pendingProposals[vendorId];
      await handleUploadProposal(vendorId, file);
    }
  };

  const loadTenderVendors = async () => {
    if (!tenderId) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`);
      if (response.ok) {
        const data = await response.json();
        const apiVendors = Array.isArray(data) ? data : data.vendors || data.data || [];
        
        // Merge API vendors with initial bidders (API takes priority if same vendor_id)
        const mergedVendors = [...apiVendors];
        
        // Add initial bidders that aren't already in API results
        for (const bidder of initialBidders) {
          if (!mergedVendors.find(v => v.vendor_id === bidder.vendor_id)) {
            mergedVendors.push(bidder);
          }
        }
        
        setTenderVendors(mergedVendors);
      } else {
        // Still use initial bidders if API fails
        if (initialBidders.length > 0) {
          setTenderVendors(initialBidders);
        }
        setError('Failed to load vendors');
      }
    } catch (err) {
      console.error('❌ Error loading tender vendors:', err);
      // Still use initial bidders if fetch fails
      if (initialBidders.length > 0) {
        setTenderVendors(initialBidders);
      }
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async () => {
    if (!formData.vendor_id) {
      setError('Please select a bidder');
      return;
    }

    const selectedVendorInfo = vendors.find(v => v.id === formData.vendor_id);
    if (!selectedVendorInfo) return;

    // Check if vendor already added
    if (tenderVendors.some(tv => tv.vendor_id === formData.vendor_id)) {
      setError('This bidder is already added');
      return;
    }

    // Petty Purchase vendor count validation
    if (maxVendors && tenderVendors.length >= maxVendors) {
      if (procurementMethod === 'single_quotation') {
        setError('Single Quotation allows only 1 vendor');
      } else {
        setError(`Maximum ${maxVendors} vendors allowed`);
      }
      return;
    }

    const newVendor: TenderVendor = {
      vendor_id: formData.vendor_id,
      vendor_name: selectedVendorInfo.vendor_name,
      vendor_code: selectedVendorInfo.vendor_code,
      quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : undefined,
      remarks: formData.remarks, // Use remarks field
      is_awarded: false
    };

    if (tenderId) {
      // If tender exists, save to backend
      try {
        const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newVendor)
        });

        if (response.ok) {
          const savedVendor = await response.json();
          
          // If proposal files are selected, upload them all
          if (proposalFiles.length > 0 && savedVendor.vendor_id) {
            for (const file of proposalFiles) {
              await handleUploadProposalForVendor(savedVendor.vendor_id, file);
            }
          }
          
          // Reload vendors to get updated data
          await loadTenderVendors();
          resetForm();
          setShowAddDialog(false);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to add bidder');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add bidder');
      }
    } else {
      // If tender doesn't exist yet, just add to local state
      setTenderVendors([...tenderVendors, newVendor]);
      resetForm();
      setShowAddDialog(false);
      
      // Notify parent component
      if (onVendorsChange) {
        onVendorsChange([...tenderVendors, newVendor]);
      }
    }
  };

  const handleUpdateVendor = async () => {
    if (!selectedVendor || !tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${selectedVendor.vendor_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : null,
            remarks: formData.remarks
          })
        }
      );

      if (response.ok) {
        const updatedVendor = await response.json();
        setTenderVendors(tenderVendors.map(tv => 
          tv.vendor_id === selectedVendor.vendor_id ? updatedVendor : tv
        ));
        resetForm();
        setShowEditDialog(false);
        setSelectedVendor(null);
      } else {
        throw new Error('Failed to update bidder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bidder');
    }
  };

  const handleUploadProposal = async (vendorId: string, file: File) => {
    if (!tenderId) {
      // Store file temporarily for upload after tender is saved
      setPendingProposals(prev => ({
        ...prev,
        [vendorId]: file
      }));
      return;
    }

    setUploadingProposal(vendorId);
    const formData = new FormData();
    formData.append('proposal', file);

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/proposal`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update the vendor in local state immediately
        setTenderVendors(tenderVendors.map(tv => 
          tv.vendor_id === vendorId 
            ? {
                ...tv,
                proposal_document_name: data.vendor.proposal_document_name,
                proposal_document_path: data.vendor.proposal_document_path,
                proposal_upload_date: data.vendor.proposal_upload_date,
                proposal_file_size: data.vendor.proposal_file_size
              }
            : tv
        ));
        
        // Remove from pending proposals
        setPendingProposals(prev => {
          const updated = { ...prev };
          delete updated[vendorId];
          return updated;
        });
        
        setUploadingProposal(null);
      } else {
        throw new Error('Failed to upload proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload proposal');
      setUploadingProposal(null);
    }
  };
  
  // Helper function for uploading proposal during add
  const handleUploadProposalForVendor = async (vendorId: string, file: File) => {
    return handleUploadProposal(vendorId, file);
  };

  const handleDownloadProposal = async (vendorId: string) => {
    if (!tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/proposal/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proposal_${vendorId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download proposal');
    }
  };

  const handleViewProposal = async (vendorId: string) => {
    if (!tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/proposal/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Open in new window/tab
        window.open(url, '_blank');
        // Clean up after a delay to ensure the window has loaded
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        throw new Error('Failed to view proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view proposal');
    }
  };

  const handleMarkSuccessful = (vendorId: string, isSuccessful: boolean) => {
    // CONTRACT TENDER & Petty Purchase: Only allow ONE successful bidder
    if ((tenderType === 'contract' || tenderType === 'spot-purchase') && isSuccessful) {
      const currentSuccessful = tenderVendors.find(tv => tv.is_successful && tv.vendor_id !== vendorId);
      if (currentSuccessful) {
        const tenderLabel = tenderType === 'spot-purchase' ? 'Petty Purchase' : 'Contract Tender';
        const confirmed = window.confirm(
          `⚠️ ${tenderLabel} Restriction\n\n${tenderLabel}s can only have ONE successful bidder.\n\nCurrently selected: ${currentSuccessful.vendor_name}\n\nDo you want to replace it with the new selection?`
        );
        if (!confirmed) return;
      }
    }

    // If deselecting a vendor, check if they have items assigned and warn
    if (!isSuccessful) {
      const itemsWithVendor = tenderItems.filter(item => {
        if (!item.vendor_ids) return false;
        
        // Handle both string (comma-separated) and array formats
        if (typeof item.vendor_ids === 'string') {
          const vendorIds = item.vendor_ids.split(',').map(id => id.trim());
          return vendorIds.includes(vendorId);
        } else if (Array.isArray(item.vendor_ids)) {
          return item.vendor_ids.includes(vendorId);
        }
        return false;
      });

      if (itemsWithVendor.length > 0) {
        const itemCount = itemsWithVendor.length;
        const confirmed = window.confirm(
          `⚠️ Warning!\n\nThis vendor is assigned to ${itemCount} item${itemCount > 1 ? 's' : ''}.\n\nIf you deselect this vendor as a successful bidder, it will be removed from ${itemCount} item${itemCount > 1 ? 's' : ''} when you save the tender.\n\nAre you sure you want to proceed?`
        );
        if (!confirmed) return;
      }
    }

    // Update frontend state
    // For contract tender & Petty Purchase: uncheck all others when checking one
    setTenderVendors(tenderVendors.map(tv => ({
      ...tv,
      is_successful: tv.vendor_id === vendorId 
        ? isSuccessful 
        : ((tenderType === 'contract' || tenderType === 'spot-purchase') && isSuccessful ? false : tv.is_successful)
    })));
  };

  const handleRemoveVendor = async (vendorId: string) => {
    // Check if vendor is used in any items
    const vendorUsedInItems = tenderItems.some(item => {
      if (!item.vendor_ids) return false;
      
      // Handle both string (comma-separated) and array formats
      if (typeof item.vendor_ids === 'string') {
        const vendorIds = item.vendor_ids.split(',').map(id => id.trim());
        return vendorIds.includes(vendorId);
      } else if (Array.isArray(item.vendor_ids)) {
        return item.vendor_ids.includes(vendorId);
      }
      return false;
    });

    if (vendorUsedInItems) {
      setError(`Cannot remove this vendor because it's already assigned to items. Please remove it from all items first.`);
      return;
    }

    if (!confirm('Are you sure you want to remove this bidder?')) return;

    if (tenderId) {
      try {
        const response = await fetch(
          `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setTenderVendors(tenderVendors.filter(tv => tv.vendor_id !== vendorId));
          setError(null); // Clear any previous errors
        } else {
          throw new Error('Failed to remove bidder');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove bidder');
      }
    } else {
      // Just remove from local state
      setTenderVendors(tenderVendors.filter(tv => tv.vendor_id !== vendorId));
      setError(null); // Clear any previous errors
    }
  };

  const openEditDialog = (vendor: TenderVendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendor_id: vendor.vendor_id,
      quoted_amount: vendor.quoted_amount?.toString() || '',
      remarks: vendor.remarks || ''
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      quoted_amount: '',
      remarks: ''
    });
    setProposalFiles([]);
    setError(null);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Participating Bidders
            <Badge variant="outline">{tenderVendors.length}</Badge>
            {procurementMethod === 'single_quotation' && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                Single Quotation: Max 1 vendor
              </Badge>
            )}
            {procurementMethod === 'multiple_quotation' && (
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">
                Multiple Quotation: Exactly 3 vendors required
              </Badge>
            )}
          </span>
          {!readOnly && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => resetForm()}
                  disabled={maxVendors ? tenderVendors.length >= maxVendors : false}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Bidder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bidder to Tender</DialogTitle>
                  <DialogDescription>
                    Select a bidder and optionally add their quoted amount and remarks
                  </DialogDescription>
                </DialogHeader>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vendor">Bidder *</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={formData.vendor_id} 
                        onValueChange={(value) => setFormData({...formData, vendor_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bidder" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors
                            .filter(v => !tenderVendors.some(tv => tv.vendor_id === v.id))
                            .map(vendor => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.vendor_name} {vendor.vendor_code && `(${vendor.vendor_code})`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddVendorModal(true)}
                        className="flex-shrink-0"
                        title="Add new vendor"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="proposal_file">Proposal Documents (Multiple allowed)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="proposal_file"
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            setProposalFiles(Array.from(files));
                          }
                        }}
                        className="flex-1"
                      />
                      {proposalFiles.length > 0 && (
                        <Badge variant="outline" className="bg-green-50">
                          <FileText className="w-3 h-3 mr-1" />
                          {proposalFiles.length} file{proposalFiles.length > 1 ? 's' : ''} selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload proposal (PDF, DOC, DOCX, XLS, XLSX - Max 10MB)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="quoted_amount">Quoted Amount (Rs) <span className="text-gray-400 text-xs">(Optional)</span></Label>
                    <Input
                      id="quoted_amount"
                      type="number"
                      step="0.01"
                      value={formData.quoted_amount}
                      onChange={(e) => setFormData({...formData, quoted_amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks">Additional Remarks <span className="text-gray-400 text-xs">(Optional)</span></Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      placeholder="Additional notes about this bidder's proposal..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVendor}>
                    Add Bidder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Vendor count validation warning */}
        {minVendors && tenderVendors.length < minVendors && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {procurementMethod === 'multiple_quotation' 
                ? `Multiple Quotation requires exactly 3 vendors. Currently ${tenderVendors.length} vendor(s) added.`
                : `Minimum ${minVendors} vendor(s) required. Currently ${tenderVendors.length} vendor(s) added.`
              }
            </AlertDescription>
          </Alert>
        )}
        
        {maxVendors && tenderVendors.length >= maxVendors && procurementMethod === 'single_quotation' && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ Single vendor added as required for Single Quotation
            </AlertDescription>
          </Alert>
        )}
        
        {minVendors && maxVendors && tenderVendors.length === minVendors && procurementMethod === 'multiple_quotation' && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ All 3 vendors added as required for Multiple Quotation
            </AlertDescription>
          </Alert>
        )}
        
        {tenderVendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No bidders added yet</p>
            {!readOnly && <p className="text-sm">Click "Add Bidder" to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bidder Name</TableHead>
                  <TableHead>Bidder Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>
                    Successful Bidder
                    {tenderType === 'contract' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        One Only
                      </Badge>
                    )}
                    {tenderType === 'annual-tender' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Multiple Allowed
                      </Badge>
                    )}
                  </TableHead>
                  {!readOnly && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenderVendors.map((vendor) => {
                  // Debug log for vendor data including is_successful
                  return (
                  <TableRow key={vendor.vendor_id}>
                    <TableCell className="font-medium">
                      {vendor.vendor_name}
                    </TableCell>
                    <TableCell>{vendor.vendor_code || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {vendor.remarks ? (
                          <p className="text-sm truncate" title={vendor.remarks}>
                            {vendor.remarks}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-sm">No description</span>
                        )}
                        {vendor.quoted_amount && (
                          <p className="text-xs text-gray-500 mt-1">
                            Amount: {formatCurrency(vendor.quoted_amount)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.proposal_document_name ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 w-fit">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                            <span className="text-xs text-gray-500 truncate max-w-[150px]" title={vendor.proposal_document_name}>
                              {vendor.proposal_document_name}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewProposal(vendor.vendor_id)}
                              title="View Proposal"
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadProposal(vendor.vendor_id)}
                              title="Download Proposal"
                              className="text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ) : pendingProposals[vendor.vendor_id] ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 w-fit">
                              <FileText className="w-3 h-3 mr-1" />
                              Ready to Upload
                            </Badge>
                            <span className="text-xs text-gray-500 truncate max-w-[150px]" title={pendingProposals[vendor.vendor_id].name}>
                              {pendingProposals[vendor.vendor_id].name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Will be uploaded when tender is saved
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Pending
                          </Badge>
                          {!readOnly && (
                            <label className="cursor-pointer">
                              <Upload className="w-4 h-4 text-blue-600" />
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                multiple
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files) {
                                    Array.from(files).forEach(file => {
                                      handleUploadProposal(vendor.vendor_id, file);
                                    });
                                  }
                                }}
                                disabled={uploadingProposal === vendor.vendor_id}
                              />
                            </label>
                          )}
                        </div>
                      )}
                      {uploadingProposal === vendor.vendor_id && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={vendor.is_successful || false}
                          onChange={(e) => handleMarkSuccessful(vendor.vendor_id, e.target.checked)}
                          disabled={readOnly}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        {vendor.is_successful && (
                          <Badge className="bg-blue-600 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Successful
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(vendor)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVendor(vendor.vendor_id)}
                            className="text-red-600 hover:text-red-700"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor Information</DialogTitle>
              <DialogDescription>
                Update quoted amount and remarks for {selectedVendor?.vendor_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_quoted_amount">Quoted Amount (Rs)</Label>
                <Input
                  id="edit_quoted_amount"
                  type="number"
                  step="0.01"
                  value={formData.quoted_amount}
                  onChange={(e) => setFormData({...formData, quoted_amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="edit_remarks">Remarks</Label>
                <Textarea
                  id="edit_remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedVendor(null); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVendor}>
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>

    {/* Add Vendor Modal */}
    {showAddVendorModal && (
      <AddVendorModal
        open={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        onSuccess={(vendorData) => {
          // Notify parent to refresh vendors list
          if (onVendorAdded) {
            onVendorAdded();
          }
          // Auto-select the newly created vendor
          setFormData(prev => ({ ...prev, vendor_id: vendorData.id }));
          setShowAddVendorModal(false);
        }}
      />
    )}
  </>
  );
};

export default TenderVendorManagement;
