
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useOffices } from '@/hooks/useOffices';
import { useLocations } from '@/hooks/useLocations';
import OfficeForm from '@/components/offices/OfficeForm';
import LocationForm from '@/components/offices/LocationForm';
import OfficesTable from '@/components/offices/OfficesTable';
import LocationsTable from '@/components/offices/LocationsTable';

const Offices = () => {
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  
  const { offices, addOffice, getParentOfficeName } = useOffices();
  const { locations, addLocation } = useLocations();

  const handleAddOffice = (newOffice: any) => {
    const success = addOffice(newOffice);
    if (success) {
      setShowOfficeForm(false);
    }
    return success;
  };

  const handleAddLocation = (newLocation: any) => {
    const success = addLocation(newLocation);
    if (success) {
      setShowLocationForm(false);
    }
    return success;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Offices & Locations Management</h1>
          <p className="text-muted-foreground mt-2">Manage office locations and sub-locations in hierarchical structure</p>
        </div>
      </div>

      <Tabs defaultValue="offices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offices">Offices</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="offices" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Office Management</h2>
            <Button onClick={() => setShowOfficeForm(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Office</span>
            </Button>
          </div>

          {showOfficeForm && (
            <OfficeForm
              onSubmit={handleAddOffice}
              onCancel={() => setShowOfficeForm(false)}
              offices={offices}
            />
          )}

          <OfficesTable offices={offices} getParentOfficeName={getParentOfficeName} />
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Location Management</h2>
            <Button onClick={() => setShowLocationForm(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Location</span>
            </Button>
          </div>

          {showLocationForm && (
            <LocationForm
              onSubmit={handleAddLocation}
              onCancel={() => setShowLocationForm(false)}
              offices={offices}
            />
          )}

          <LocationsTable locations={locations} offices={offices} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Offices;
