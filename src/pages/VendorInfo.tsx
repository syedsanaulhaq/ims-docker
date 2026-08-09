import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVendors } from "@/hooks/useVendors";
import { Vendor as VendorInfoType } from "@/types/vendor";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorState from "@/components/common/ErrorState";

const VendorInfo = () => {
  const { toast } = useToast();
  const {
    vendors,
    loading: isLoading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    refetch
  } = useVendors();

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorInfoType | null>(null);

  const [newVendor, setNewVendor] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    tax_number: '',
  });

  const handleEditVendor = (vendor: VendorInfoType) => {
    setEditingVendor(vendor);
    setNewVendor({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      country: vendor.country || '',
      tax_number: vendor.tax_number || '',
    });
    setShowVendorForm(true);
  };

  const handleSaveVendor = async () => {
    if (!newVendor.vendor_name.trim()) {
      toast({
        title: "Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingVendor) {
      await updateVendor(editingVendor.id, newVendor);
    } else {
      await createVendor(newVendor);
    }

    resetForm();
  };

  const resetForm = () => {
    setNewVendor({
      vendor_code: '',
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      tax_number: '',
    });
    setEditingVendor(null);
    setShowVendorForm(false);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={typeof error === 'string' ? error : 'Failed to load vendor data'} />;

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Vendor Information</CardTitle>
              <CardDescription>Manage your vendor information and contacts.</CardDescription>
            </div>
            {!showVendorForm && (
              <Button onClick={() => setShowVendorForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Vendor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showVendorForm && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorCode">Vendor Code</Label>
                  <Input
                    id="vendorCode"
                    value={newVendor.vendor_code}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_code: e.target.value })}
                    placeholder="Enter vendor code (auto-generated if empty)"
                  />
                </div>
                <div>
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    value={newVendor.vendor_name}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                    placeholder="Enter vendor name"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={newVendor.contact_person}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                    placeholder="Enter contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newVendor.city}
                    onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={newVendor.country}
                    onChange={(e) => setNewVendor({ ...newVendor, country: e.target.value })}
                    placeholder="Enter country"
                  />
                </div>
                <div>
                  <Label htmlFor="taxNumber">Tax Number</Label>
                  <Input
                    id="taxNumber"
                    value={newVendor.tax_number}
                    onChange={(e) => setNewVendor({ ...newVendor, tax_number: e.target.value })}
                    placeholder="Enter tax number"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSaveVendor}>
                  {editingVendor ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Code</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors && vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>{vendor.vendor_code}</TableCell>
                    <TableCell>{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.contact_person || '-'}</TableCell>
                    <TableCell>{vendor.email || '-'}</TableCell>
                    <TableCell>{vendor.phone || '-'}</TableCell>
                    <TableCell>{vendor.city || '-'}</TableCell>
                    <TableCell>{vendor.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEditVendor(vendor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {/* Delete button hidden */}
                      {/* <Button variant="ghost" size="icon" onClick={() => deleteVendor(vendor.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No vendors found. Click "Add Vendor" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorInfo;
