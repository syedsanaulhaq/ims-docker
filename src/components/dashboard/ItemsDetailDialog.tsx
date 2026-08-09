
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
import { InventoryItem } from "@/hooks/useApiInventoryData";
import { Package, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface ItemsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

const ItemsDetailDialog = ({ open, onOpenChange, items }: ItemsDetailDialogProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Inventory Items ({items.length})
          </DialogTitle>
        </DialogHeader>
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category} → {item.subCategory}</TableCell>
                  <TableCell>{item.currentStock} {item.unit}</TableCell>
                  <TableCell>{item.minimumStock} {item.unit}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Link to="/inventory">
            <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View Full Inventory
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemsDetailDialog;
