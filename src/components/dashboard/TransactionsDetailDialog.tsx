
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
import { Transaction } from "@/hooks/useApiInventoryData";
import { TrendingUp, ExternalLink, ShoppingCart, Send } from "lucide-react";
import { Link } from "react-router-dom";

interface TransactionsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
}

const TransactionsDetailDialog = ({ open, onOpenChange, transactions }: TransactionsDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            This Month's Purchases ({transactions.length})
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Badge className={transaction.type === 'Purchase' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                      <div className="flex items-center gap-1">
                        {transaction.type === 'Purchase' ? <ShoppingCart className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                        {transaction.type}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.item || 'N/A'}</TableCell>
                  <TableCell>{transaction.quantity || 'N/A'}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Link to="/stock-transactions">
            <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View All Transactions
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsDetailDialog;
