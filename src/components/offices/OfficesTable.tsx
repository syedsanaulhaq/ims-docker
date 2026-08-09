
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { Office } from '@/types/office';
import SearchInput from '@/components/ui/search-input';

interface OfficesTableProps {
  offices: Office[];
  getParentOfficeName: (parentId?: number) => string;
}

const OfficesTable: React.FC<OfficesTableProps> = ({ offices, getParentOfficeName }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOffices = offices.filter(office =>
    office.officeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.officeLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getParentOfficeName(office.parentId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Offices List</CardTitle>
            <CardDescription>Manage all office locations in hierarchical structure</CardDescription>
          </div>
          <SearchInput
            placeholder="Search offices..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-64"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Office Name</TableHead>
              <TableHead>Parent Office</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact Number</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOffices.map((office) => (
              <TableRow key={office.id}>
                <TableCell className="font-medium">{office.officeName}</TableCell>
                <TableCell>
                  <span className={office.parentId ? "text-blue-600" : "text-gray-500 italic"}>
                    {getParentOfficeName(office.parentId)}
                  </span>
                </TableCell>
                <TableCell>{office.officeLocation}</TableCell>
                <TableCell>{office.address}</TableCell>
                <TableCell>{office.contactNumber}</TableCell>
                <TableCell>{office.createdDate}</TableCell>
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
        {filteredOffices.length === 0 && searchTerm && (
          <div className="text-center py-4 text-muted-foreground">
            No offices found matching "{searchTerm}"
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfficesTable;
