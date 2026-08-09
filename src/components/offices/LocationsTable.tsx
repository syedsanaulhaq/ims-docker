
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, MapPin } from "lucide-react";
import { Location, Office } from '@/types/office';

interface LocationsTableProps {
  locations: Location[];
  offices: Office[];
}

const LocationsTable: React.FC<LocationsTableProps> = ({ locations, offices }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations List</CardTitle>
        <CardDescription>Manage all sub-locations</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>{location.locationName}</span>
                  </div>
                </TableCell>
                <TableCell>{location.locationParent}</TableCell>
                <TableCell>
                  {location.latitude && location.longitude ? 
                    `${location.latitude}, ${location.longitude}` : 
                    'Not set'
                  }
                </TableCell>
                <TableCell>
                  {offices.find(o => o.id === location.officeId)?.officeName || 'Unknown'}
                </TableCell>
                <TableCell>{location.createdDate}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LocationsTable;
