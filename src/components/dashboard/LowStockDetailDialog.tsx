
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
import { AlertTriangle, ExternalLink, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

interface LowStockDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

const LowStockDetailDialog = ({ open, onOpenChange, items }: LowStockDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alert ({items.length} items)
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Minimum Required</TableHead>
                <TableHead>Shortage</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const shortage = item.minimumStock - item.currentStock;
                return (
                  <TableRow key={item.id} className="bg-red-50">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category} → {item.subCategory}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {item.currentStock} {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.minimumStock} {item.unit}</TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {shortage > 0 ? `${shortage} ${item.unit}` : 'At minimum'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        Reorder
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Items below minimum stock level require immediate attention
          </p>
          <Link to="/inventory">
            <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Manage Inventory
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LowStockDetailDialog;
