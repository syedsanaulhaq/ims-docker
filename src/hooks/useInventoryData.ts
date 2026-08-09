import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface TransactionItem {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  billNo: string;
  billDate: string;
  quantity: number;
  itemSerialNo: string;
  amount: number;
  remarks: string;
  fileNo: string;
  pageNo: string;
}

export interface StockTransaction {
  id: string;
  transactionNo: string;
  vendorId: string;
  vendorName: string;
  procurementProcedure: string;
  transactionDate: string;
  totalAmount: number;
  status: 'Draft' | 'Pending' | 'Completed' | 'Verified' | 'Cancelled';
  createdBy: string;
  createdAt: string;
  tenderId?: string;
  tenderNumber?: string;
  items: TransactionItem[];
  remarks?: string;
}

export interface Vendor {
  id: string;
  name: string;
  status: string;
  email: string;
  phone: string;
  itemsSupplied: number;
}

// Normalized InventoryItem: references item master by itemMasterId, no duplication
export interface InventoryItem {
  id: string;
  itemMasterId: string; // UUID reference to item_masters
  storeId?: string; // Reference to stores table
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderLevel?: number;
  location?: string;
  vendorId?: string;
  itemType?: string;
  status?: string;
  // Optionally, you can add itemMaster?: ItemMaster for joined data
}

export interface Transaction {
  id: string;
  item: string;
  type: 'Purchase' | 'Issuance';
  quantity: number;
  date: string;
  vendor: string;
  amount: number;
}

interface UseInventoryData {
  stockTransactions: StockTransaction[];
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  addStockTransaction: (transaction: Omit<StockTransaction, 'id' | 'transactionNo'>) => void;
  updateStockTransaction: (id: string, transaction: Partial<StockTransaction>) => void;
  updateStockTransactionStatus: (id: string, status: StockTransaction['status']) => void;
  deleteStockTransaction: (id: string) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
}

const useInventoryData = () => {
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const addStockTransaction = (transaction: Omit<StockTransaction, 'id' | 'transactionNo'>) => {
    const newTransaction: StockTransaction = {
      id: Date.now().toString(),
      transactionNo: `STK-${Date.now()}`,
      ...transaction,
      createdAt: new Date().toISOString()
    };

    setStockTransactions(prev => [...prev, newTransaction]);
  };

  const updateStockTransaction = (id: string, transaction: Partial<StockTransaction>) => {
    setStockTransactions(prev =>
      prev.map(txn => (txn.id === id ? { ...txn, ...transaction } : txn))
    );
  };

  const updateStockTransactionStatus = (id: string, status: StockTransaction['status']) => {
    setStockTransactions(prev =>
      prev.map(txn => (txn.id === id ? { ...txn, status } : txn))
    );
  };

  const deleteStockTransaction = (id: string) => {
    setStockTransactions(prev => prev.filter(txn => txn.id !== id));
  };

  const addVendor = (vendor: Vendor) => {
    setVendors(prev => [...prev, { ...vendor, id: uuidv4() }]);
  };

  const updateVendor = (id: string, vendor: Partial<Vendor>) => {
    setVendors(prev =>
      prev.map(v => (v.id === id ? { ...v, ...vendor } : v))
    );
  };

  const deleteVendor = (id: string) => {
    setVendors(prev => prev.filter(vendor => vendor.id !== id));
  };

  const addInventoryItem = (item: InventoryItem) => {
    setInventoryItems(prev => [...prev, { ...item, id: uuidv4() }]);
  };

  const updateInventoryItem = (id: string, item: Partial<InventoryItem>) => {
    setInventoryItems(prev =>
      prev.map(i => (i.id === id ? { ...i, ...item } : i))
    );
  };

  const deleteInventoryItem = (id: string) => {
    setInventoryItems(prev => prev.filter(item => item.id !== id));
  };

  return {
    stockTransactions,
    vendors,
    inventoryItems,
    addStockTransaction,
    updateStockTransaction,
    updateStockTransactionStatus,
    deleteStockTransaction,
    addVendor,
    updateVendor,
    deleteVendor,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
};

export default useInventoryData;
