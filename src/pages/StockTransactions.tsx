import React, { useState, useEffect } from 'react';
import { stockTransactionsLocalService } from '@/services/stockTransactionsLocalService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Filter, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionManager from '@/components/stockTransactions/TransactionManager';
import { useTenderData } from '@/hooks/useTenderData';
import { formatCurrency } from '@/utils/currency';

// Helper to format date as dd/mm/yyyy
function formatDateDMY(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const StockTransactions = () => {
  const [activeTab, setActiveTab] = useState("acquisition");
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const { tenders, isLoading } = useTenderData();

  const selectedTender = tenders?.find(t => t.id === selectedTenderId);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const data = await stockTransactionsLocalService.getAll();
      setTransactions(data || []);
    } catch (err: any) {
      setTransactionsError(err.message || 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleTenderSelect = (tenderId: string) => {
    
    const newSelectedTender = tenders?.find(t => t.id === tenderId);
    
    setSelectedTenderId(tenderId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Acquisition</h1>
          <p className="text-muted-foreground mt-2">Manage stock acquisitions and issuances</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="acquisition">Stock Acquisition</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="acquisition" className="space-y-4">
          <TransactionManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Transaction History</span>
              </CardTitle>
              <CardDescription>All stock movements and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactionsError ? (
                <div className="text-center py-8 text-red-600">{transactionsError}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDateDMY(transaction.date)}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'IN' ? "default" : "secondary"}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.item}</TableCell>
                        <TableCell>{transaction.quantity}</TableCell>
                        <TableCell>{formatCurrency(transaction.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(transaction.total_value)}</TableCell>
                        <TableCell>
                          {transaction.vendor || transaction.department}
                        </TableCell>
                        <TableCell>{transaction.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockTransactions;
