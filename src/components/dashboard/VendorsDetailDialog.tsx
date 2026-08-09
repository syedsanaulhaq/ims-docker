
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vendor } from "@/types/vendor";
import { Users, ExternalLink, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

interface VendorsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
}

const VendorsDetailDialog = ({ open, onOpenChange, vendors }: VendorsDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Vendors ({vendors.length})
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {vendor.email || 'No email'}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {vendor.phone || 'No phone'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Link to="/vendors">
            <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Manage Vendors
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorsDetailDialog;
