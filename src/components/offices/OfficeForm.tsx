
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewOffice, Office } from '@/types/office';

interface OfficeFormProps {
  onSubmit: (office: NewOffice) => boolean;
  onCancel: () => void;
  offices: Office[];
}

const OfficeForm: React.FC<OfficeFormProps> = ({ onSubmit, onCancel, offices }) => {
  const [newOffice, setNewOffice] = useState<NewOffice>({
    officeName: '',
    parentId: '',
    officeLocation: '',
    address: '',
    contactNumber: ''
  });

  const handleSubmit = () => {
    const success = onSubmit(newOffice);
    if (success) {
      setNewOffice({ officeName: '', parentId: '', officeLocation: '', address: '', contactNumber: '' });
      onCancel();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Office</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="officeName">Office Name *</Label>
            <Input
              id="officeName"
              value={newOffice.officeName}
              onChange={(e) => setNewOffice({ ...newOffice, officeName: e.target.value })}
              placeholder="Enter office name"
            />
          </div>
          <div>
            <Label htmlFor="parentId">Parent Office</Label>
            <Select 
              value={newOffice.parentId || 'NO_PARENT'} 
              onValueChange={(value) => setNewOffice({ ...newOffice, parentId: value === 'NO_PARENT' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent office (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_PARENT">No Parent (Root Office)</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id.toString()}>
                    {office.officeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="officeLocation">Office Location *</Label>
            <Input
              id="officeLocation"
              value={newOffice.officeLocation}
              onChange={(e) => setNewOffice({ ...newOffice, officeLocation: e.target.value })}
              placeholder="Enter office location"
            />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={newOffice.contactNumber}
              onChange={(e) => setNewOffice({ ...newOffice, contactNumber: e.target.value })}
              placeholder="Enter contact number"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={newOffice.address}
              onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
              placeholder="Enter full address"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSubmit}>Save Office</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfficeForm;
