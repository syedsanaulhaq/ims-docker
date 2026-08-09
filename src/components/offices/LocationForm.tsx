
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewLocation, Office } from '@/types/office';

interface LocationFormProps {
  onSubmit: (location: NewLocation) => boolean;
  onCancel: () => void;
  offices: Office[];
}

const LocationForm: React.FC<LocationFormProps> = ({ onSubmit, onCancel, offices }) => {
  const [newLocation, setNewLocation] = useState<NewLocation>({
    locationName: '',
    locationParent: '',
    latitude: '',
    longitude: '',
    officeId: ''
  });

  const handleSubmit = () => {
    const success = onSubmit(newLocation);
    if (success) {
      setNewLocation({ locationName: '', locationParent: '', latitude: '', longitude: '', officeId: '' });
      onCancel();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="locationName">Location Name *</Label>
            <Input
              id="locationName"
              value={newLocation.locationName}
              onChange={(e) => setNewLocation({ ...newLocation, locationName: e.target.value })}
              placeholder="Enter location name"
            />
          </div>
          <div>
            <Label htmlFor="locationParent">Location Parent</Label>
            <Input
              id="locationParent"
              value={newLocation.locationParent}
              onChange={(e) => setNewLocation({ ...newLocation, locationParent: e.target.value })}
              placeholder="Enter parent location"
            />
          </div>
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={newLocation.latitude}
              onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
              placeholder="Enter latitude"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={newLocation.longitude}
              onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
              placeholder="Enter longitude"
            />
          </div>
          <div>
            <Label htmlFor="officeId">Office</Label>
            <select
              id="officeId"
              value={newLocation.officeId}
              onChange={(e) => setNewLocation({ ...newLocation, officeId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select Office</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>{office.officeName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSubmit}>Save Location</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationForm;
