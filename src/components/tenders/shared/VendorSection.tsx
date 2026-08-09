import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Vendor } from "@/types/vendor";

interface VendorSectionProps {
  form: any;
  isLoading?: boolean;
  initialData?: any;
  showVendorForm: boolean;
  selectedVendorId: string;
  onVendorSelection: (vendorId: string) => void;
  vendors: Vendor[];
}

const VendorSection: React.FC<VendorSectionProps> = ({ 
  form, 
  isLoading, 
  initialData, 
  showVendorForm, 
  selectedVendorId, 
  onVendorSelection,
  vendors 
}) => {
  const activeVendors = vendors.filter(v => v.status === 'Active');

  // Debug: Watch the actual form values
  const currentVendorData = form.watch('vendor');

  // Get current vendor values for controlled inputs
  const vendorName = form.watch("vendor.vendorName") || '';
  const contactPerson = form.watch("vendor.contactPerson") || '';
  const email = form.watch("vendor.email") || '';
  const phone = form.watch("vendor.phone") || '';
  const address = form.watch("vendor.address") || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier (Vendor) Information</CardTitle>
        <CardDescription>Select an existing supplier or add a new one.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Label htmlFor="vendorSelection">Select Supplier</Label>
          <Select
            onValueChange={onVendorSelection}
            value={selectedVendorId}
            disabled={isLoading}
          >
            <SelectTrigger id="vendorSelection">
              <SelectValue placeholder="Select a supplier or add new" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select Supplier --</SelectItem>
              {activeVendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id.toString()}>
                  {vendor.vendor_name} ({vendor.vendor_code})
                </SelectItem>
              ))}
              <SelectItem value="add-new">+ Add New Supplier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showVendorForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor.vendorName">Supplier Name</Label>
                <Input 
                  id="vendor.vendorName" 
                  placeholder="Supplier Name" 
                  value={vendorName}
                  onChange={(e) => form.setValue("vendor.vendorName", e.target.value, { shouldDirty: true })}
                  disabled={isLoading} 
                />
                {form.formState.errors.vendor?.vendorName && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendor.vendorName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="vendor.contactPerson">Contact Person</Label>
                <Input 
                  id="vendor.contactPerson" 
                  placeholder="Contact Person" 
                  value={contactPerson}
                  onChange={(e) => form.setValue("vendor.contactPerson", e.target.value, { shouldDirty: true })}
                  disabled={isLoading} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor.email">Email</Label>
                <Input 
                  id="vendor.email" 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => form.setValue("vendor.email", e.target.value, { shouldDirty: true })}
                  disabled={isLoading} 
                />
                {form.formState.errors.vendor?.email && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendor.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="vendor.phone">Phone</Label>
                <Input 
                  id="vendor.phone" 
                  placeholder="Phone" 
                  value={phone}
                  onChange={(e) => form.setValue("vendor.phone", e.target.value, { shouldDirty: true })}
                  disabled={isLoading} 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vendor.address">Address</Label>
              <Textarea 
                id="vendor.address" 
                placeholder="Address" 
                value={address}
                onChange={(e) => form.setValue("vendor.address", e.target.value, { shouldDirty: true })}
                disabled={isLoading} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor.contractValue">Contract Value</Label>
                <Input
                  id="vendor.contractValue"
                  type="number"
                  placeholder="Contract Value"
                  {...form.register("vendor.contractValue", { valueAsNumber: true })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="vendor.contractDate">Contract Date</Label>
                <DatePicker
                  id="vendor.contractDate"
                  onSelect={(date) => form.setValue("vendor.contractDate", date)}
                  defaultDate={form.watch("vendor.contractDate")}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vendor.remarks">Remarks</Label>
              <Textarea 
                id="vendor.remarks" 
                placeholder="Remarks" 
                {...form.register("vendor.remarks")} 
                disabled={isLoading} 
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorSection;
