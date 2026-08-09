import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl } from '@/services/invmisApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AddVendorModalProps {
  open?: boolean;
  onClose: () => void;
  onSuccess: (vendorData: any) => void;
}

export default function AddVendorModal({ open = true, onClose, onSuccess }: AddVendorModalProps) {
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Pakistan',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.vendor_name) {
      setError('Vendor name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create vendor');
      }

      const result = await response.json();
      
      // Return the newly created vendor with the generated ID
      onSuccess({
        id: result.vendorId,
        ...formData
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>
            Create a new vendor to add as a bidder
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div>
              <Label htmlFor="vendor_name">
                Vendor Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                placeholder="Enter vendor name"
                required
                disabled={loading}
              />
            </div>

            {/* Vendor Code */}
            <div>
              <Label htmlFor="vendor_code">Vendor Code</Label>
              <Input
                id="vendor_code"
                value={formData.vendor_code}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                placeholder="e.g., VEN-001"
                disabled={loading}
              />
            </div>

            {/* Contact Person */}
            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Primary contact name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="vendor@example.com"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+92-XXX-XXXXXXX"
                disabled={loading}
              />
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="City name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Address - Full Width */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Complete address"
              disabled={loading}
            />
          </div>

          {/* Country */}
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              placeholder="Country"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
