import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreateVendorRequest } from '@/types/vendor';

// Form validation schema
const vendorFormSchema = z.object({
  vendor_code: z.string().min(1, 'Vendor code is required').max(50, 'Vendor code must be 50 characters or less'),
  vendor_name: z.string().min(1, 'Vendor name is required').max(200, 'Vendor name must be 200 characters or less'),
  contact_person: z.string().max(100, 'Contact person must be 100 characters or less').optional(),
  email: z.string().email('Invalid email format').max(100, 'Email must be 100 characters or less').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone must be 20 characters or less').optional(),
  address: z.string().optional(),
  city: z.string().max(100, 'City must be 100 characters or less').optional(),
  country: z.string().max(100, 'Country must be 100 characters or less').optional(),
  tax_number: z.string().max(50, 'Tax number must be 50 characters or less').optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  onSubmit: (data: CreateVendorRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateVendorRequest>;
}

const VendorForm: React.FC<VendorFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendor_code: initialData?.vendor_code || '',
      vendor_name: initialData?.vendor_name || '',
      contact_person: initialData?.contact_person || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      country: initialData?.country || '',
      tax_number: initialData?.tax_number || '',
      status: initialData?.status || 'Active',
    }
  });

  const statusValue = watch('status');

  const handleFormSubmit = async (data: VendorFormData) => {
    try {
      // Clean up empty strings
      const cleanedData: CreateVendorRequest = {
        vendor_code: data.vendor_code,
        vendor_name: data.vendor_name,
        contact_person: data.contact_person?.trim() || undefined,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        country: data.country?.trim() || undefined,
        tax_number: data.tax_number?.trim() || undefined,
        status: data.status,
      };

      await onSubmit(cleanedData);
    } catch (error) {
      
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Vendor' : 'Add New Vendor'}</CardTitle>
        <CardDescription>
          {initialData ? 'Update vendor information' : 'Enter vendor details to add to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Code */}
            <div className="space-y-2">
              <Label htmlFor="vendor_code">Vendor Code *</Label>
              <Input
                id="vendor_code"
                {...register('vendor_code')}
                placeholder="Enter vendor code"
                disabled={isLoading}
              />
              {errors.vendor_code && (
                <p className="text-sm text-red-600">{errors.vendor_code.message}</p>
              )}
            </div>

            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input
                id="vendor_name"
                {...register('vendor_name')}
                placeholder="Enter vendor name"
                disabled={isLoading}
              />
              {errors.vendor_name && (
                <p className="text-sm text-red-600">{errors.vendor_name.message}</p>
              )}
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                {...register('contact_person')}
                placeholder="Enter contact person name"
                disabled={isLoading}
              />
              {errors.contact_person && (
                <p className="text-sm text-red-600">{errors.contact_person.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter phone number"
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Enter city"
                disabled={isLoading}
              />
              {errors.city && (
                <p className="text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="Enter country"
                disabled={isLoading}
              />
              {errors.country && (
                <p className="text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>

            {/* Tax Number */}
            <div className="space-y-2">
              <Label htmlFor="tax_number">Tax Number</Label>
              <Input
                id="tax_number"
                {...register('tax_number')}
                placeholder="Enter tax number"
                disabled={isLoading}
              />
              {errors.tax_number && (
                <p className="text-sm text-red-600">{errors.tax_number.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value: 'Active' | 'Inactive' | 'Suspended') => setValue('status', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Enter full address"
              rows={3}
              disabled={isLoading}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (initialData ? 'Update Vendor' : 'Create Vendor')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VendorForm;
