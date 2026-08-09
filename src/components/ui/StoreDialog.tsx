import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { storesLocalService, CreateStoreRequest } from '@/services/storesLocalService';
import { useApiInventoryData } from '@/hooks/useApiInventoryData';

interface StoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreCreated?: (store: any) => void;
}

const StoreDialog: React.FC<StoreDialogProps> = ({ open, onOpenChange, onStoreCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { offices, officesLoading } = useApiInventoryData();
  const [formData, setFormData] = useState<CreateStoreRequest>({
    store_name: '',
    description: '',
    address: '',
    office_id: undefined,
  });

  const handleInputChange = (field: keyof CreateStoreRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Store name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the store using local service
      const data = await storesLocalService.create({
        store_name: formData.store_name,
        description: formData.description || null,
        address: formData.address || null,
        office_id: formData.office_id || null,
      });

      toast({
        title: "Success",
        description: "Store created successfully",
      });

      if (onStoreCreated) {
        onStoreCreated(data);
      }

      // Reset form and close dialog
      setFormData({
        store_name: '',
        description: '',
        address: '',
        office_id: undefined,
      });
      onOpenChange(false);
    } catch (error: any) {
      
      toast({
        title: "Error",
        description: error.message || "Failed to create store",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      store_name: '',
      description: '',
      address: '',
      office_id: undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Store</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="store_name">Store Name *</Label>
            <Input
              id="store_name"
              type="text"
              value={formData.store_name}
              onChange={(e) => handleInputChange('store_name', e.target.value)}
              placeholder="Enter store name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter store description (optional)"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter store address (optional)"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="office_id">Office</Label>
            <select
              id="office_id"
              name="office_id"
              aria-label="Select Office"
              value={formData.office_id || ''}
              onChange={(e) => handleInputChange('office_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={officesLoading}
            >
              <option value="">Select Office (optional)</option>
              {offices?.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} {office.office_code ? `(${office.office_code})` : ''}
                </option>
              ))}
            </select>
            {officesLoading && (
              <p className="text-sm text-muted-foreground mt-1">Loading offices...</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Store'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreDialog;
