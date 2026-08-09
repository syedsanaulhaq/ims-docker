
import { useState } from 'react';
import { Location, NewLocation } from '@/types/office';
import { useToast } from "@/hooks/use-toast";

export const useLocations = () => {
  const { toast } = useToast();
  
  const [locations, setLocations] = useState<Location[]>([
    {
      id: 1,
      locationName: "Main Building",
      locationParent: "Head Office",
      latitude: "33.6844",
      longitude: "73.0479",
      officeId: 1,
      createdDate: "2024-01-15"
    },
    {
      id: 2,
      locationName: "Warehouse A",
      locationParent: "Head Office",
      latitude: "33.6850",
      longitude: "73.0485",
      officeId: 1,
      createdDate: "2024-01-20"
    }
  ]);

  const addLocation = (newLocation: NewLocation) => {
    if (!newLocation.locationName.trim()) {
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return false;
    }

    const location: Location = {
      id: Date.now(),
      ...newLocation,
      officeId: parseInt(newLocation.officeId),
      createdDate: new Date().toISOString().split('T')[0]
    };

    setLocations([...locations, location]);
    
    toast({
      title: "Success",
      description: "Location added successfully"
    });
    
    return true;
  };

  return {
    locations,
    addLocation
  };
};
