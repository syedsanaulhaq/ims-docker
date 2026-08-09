// ====================================================================
// 🚀 Inventory API Service - InvMISDB Based
// ====================================================================
// Replaces Supabase inventory service with InvMIS API calls
// ====================================================================

import { ApiResponse } from './api';
import { invmisApi, type CurrentStock, type DashboardSummary, type StockTransaction as InvMISStockTransaction } from './invmisApi';
import { InventoryItem, Vendor, Transaction, StockTransaction } from '@/hooks/useInventoryData';

// ====================================================================
// 📊 Types & Interfaces 
// ====================================================================

export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalRequests: number;
  pendingApprovals: number;
}

export interface Category {
  id: string;
  name: string;
  CategoryName: string;
}

export interface Office {
  id: string;
  name: string;
  type: string;
}

export interface CreateInventoryItemRequest {
  itemId: number;
  currentQuantity: number;
  minimumLevel: number;
  maximumLevel?: number;
  updatedBy: string;
}

export interface UpdateInventoryItemRequest {
  stockId: number;
  itemId: number;
  currentQuantity: number;
  minimumLevel: number;
  maximumLevel?: number;
  updatedBy: string;
}

export interface CreateStockTransactionRequest {
  itemId: number;
  transactionType: string;
  quantityChange: number;
  reason: string;
  createdBy: string;
}

export type StockTransactionStatus = 'Pending' | 'Completed' | 'Verified';

// ====================================================================
// 🔄 Data Transformation Functions
// ====================================================================

const transformCurrentStockToInventoryItem = (stock: CurrentStock): InventoryItem => ({
  id: stock.stock_id.toString(),
  itemMasterId: stock.item_id.toString(),
  currentStock: stock.current_quantity,
  minimumStock: stock.minimum_level,
  maximumStock: stock.maximum_level,
  reorderLevel: stock.minimum_level,
  location: 'Main Store', // InvMIS doesn't have store location yet
  storeId: '1', // Default store ID
  vendorId: undefined,
  status: stock.stock_status === 'Normal' ? 'Active' : 'Alert',
  itemType: 'General', // Default type
  // Note: name, unit, category info comes from ItemMaster join, not stored in InventoryItem
});

const transformInvMISStockTransaction = (tx: InvMISStockTransaction): StockTransaction => ({
  id: tx.transaction_id.toString(),
  transactionNo: `TXN-${tx.transaction_id}`,
  vendorId: 'unknown', // InvMIS StockTransaction doesn't have vendor info
  vendorName: 'System', // Default vendor
  procurementProcedure: 'Manual', // Default procedure
  transactionDate: tx.transaction_date,
  totalAmount: 0, // InvMIS doesn't track amounts in StockTransaction
  status: 'Completed' as const, // Default status
  createdBy: tx.created_by,
  createdAt: tx.transaction_date,
  items: [], // Would need to be populated separately
  remarks: tx.reason || '',
});

// ====================================================================
// 🏭 Inventory API Service
// ====================================================================

export const inventoryApi = {
  // ====================================================================
  // 📦 Current Stock / Inventory Items
  // ====================================================================

  getInventoryItems: async (): Promise<ApiResponse<InventoryItem[]>> => {
    try {
      const response = await invmisApi.stock.getCurrent();
      
      if (!response.success) {
        return { data: [], success: false, message: 'Failed to fetch current stock' };
      }

      const mapped = response.stock.map(transformCurrentStockToInventoryItem);
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching inventory items:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  getInventoryItem: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    try {
      // Get all stock items and filter by ID (until we add getById to API)
      const response = await invmisApi.stock.getCurrent();
      
      if (!response.success) {
        return { data: undefined as any, success: false, message: 'Failed to fetch stock' };
      }

      const stock = response.stock.find(s => s.stock_id.toString() === id);
      
      if (!stock) {
        return { data: undefined as any, success: false, message: `Stock item ${id} not found` };
      }

      const mapped = transformCurrentStockToInventoryItem(stock);
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      return { data: undefined as any, success: false, message: error.message };
    }
  },

  createInventoryItem: async (item: CreateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    try {
      // TODO: Implement create stock endpoint in InvMIS API backend
      return { 
        data: undefined as any, 
        success: false, 
        message: 'Create stock item not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      console.error('Error creating inventory item:', error);
      return { data: undefined as any, success: false, message: error.message };
    }
  },

  updateInventoryItem: async (item: UpdateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    try {
      // Use existing InvMIS updateQuantity endpoint
      const response = await invmisApi.stock.updateQuantity(item.stockId, {
        currentQuantity: item.currentQuantity,
        minimumLevel: item.minimumLevel,
        maximumLevel: item.maximumLevel,
        updatedBy: item.updatedBy
      });

      // Get updated item to return
      const updatedResponse = await invmisApi.stock.getCurrent();
      const updatedStock = updatedResponse.success 
        ? updatedResponse.stock.find(s => s.stock_id === item.stockId)
        : null;

      if (!updatedStock) {
        return { data: undefined as any, success: false, message: 'Failed to get updated item' };
      }

      const mapped = transformCurrentStockToInventoryItem(updatedStock);
      
      return { data: mapped, success: true, message: 'Updated successfully' };
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      return { data: undefined as any, success: false, message: error.message };
    }
  },

  deleteInventoryItem: async (id: string): Promise<ApiResponse<void>> => {
    try {
      // TODO: Implement delete stock endpoint in InvMIS API backend
      return { 
        data: undefined, 
        success: false, 
        message: 'Delete stock item not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      return { data: undefined, success: false, message: error.message };
    }
  },

  // ====================================================================
  // 📊 Statistics & Dashboard
  // ====================================================================

  getDashboardStats: async (): Promise<ApiResponse<InventoryStats>> => {
    try {
      const dashboardData = await invmisApi.dashboard.getSummary();
      
      const stats: InventoryStats = {
        totalItems: dashboardData.totalItems || 0,
        lowStockItems: dashboardData.lowStockItems || 0,
        totalRequests: dashboardData.totalRequests || 0,
        pendingApprovals: dashboardData.pendingApprovals || 0,
      };

      return { data: stats, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      
      // Return default stats on error
      const defaultStats: InventoryStats = {
        totalItems: 0,
        lowStockItems: 0,
        totalRequests: 0,
        pendingApprovals: 0,
      };

      return { data: defaultStats, success: false, message: error.message };
    }
  },

  // ====================================================================
  // 🔄 Stock Transactions
  // ====================================================================

  getStockTransactions: async (): Promise<ApiResponse<StockTransaction[]>> => {
    try {
      const dashboardData = await invmisApi.dashboard.getSummary();
      
      const transactions = dashboardData.recentTransactions?.map(transformInvMISStockTransaction) || [];
      
      return { data: transactions, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching stock transactions:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  createStockTransaction: async (transaction: CreateStockTransactionRequest): Promise<ApiResponse<StockTransaction>> => {
    try {
      // TODO: Implement create stock transaction endpoint in InvMIS API backend
      return { 
        data: undefined as any, 
        success: false, 
        message: 'Create stock transaction not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      console.error('Error creating stock transaction:', error);
      return { data: undefined as any, success: false, message: error.message };
    }
  },

  // ====================================================================
  // 🏢 Reference Data (Placeholders for now)
  // ====================================================================

  getVendors: async (): Promise<ApiResponse<Vendor[]>> => {
    try {
      // TODO: Implement vendors endpoint in InvMIS API backend
      // For now, return empty array
      return { data: [], success: true, message: 'Vendors endpoint not yet implemented' };
    } catch (error: any) {
      return { data: [], success: false, message: error.message };
    }
  },

  getStores: async (): Promise<ApiResponse<any[]>> => {
    try {
      // Use offices as stores for now
      const response = await invmisApi.offices.getAll();
      
      if (!response.success) {
        return { data: [], success: false, message: 'Failed to fetch offices' };
      }

      const stores = response.offices.map(office => ({
        id: office.office_id.toString(),
        store_name: office.office_name,
        office_code: office.office_code,
      }));

      return { data: stores, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  getActiveVendors: async (): Promise<ApiResponse<Vendor[]>> => {
    // Same as getVendors for now
    return await inventoryApi.getVendors();
  },

  // ====================================================================
  // 📈 Transactions & Purchases (Placeholders)
  // ====================================================================

  getTransactions: async (): Promise<ApiResponse<Transaction[]>> => {
    try {
      // TODO: Map from procurement requests or tender awards
      return { data: [], success: true, message: 'Transactions endpoint not yet implemented' };
    } catch (error: any) {
      return { data: [], success: false, message: error.message };
    }
  },

  getThisMonthPurchases: async (): Promise<ApiResponse<Transaction[]>> => {
    try {
      // TODO: Filter transactions by current month
      return { data: [], success: true, message: 'Monthly purchases endpoint not yet implemented' };
    } catch (error: any) {
      return { data: [], success: false, message: error.message };
    }
  },

  updateStockTransaction: async (id: string, transaction: any): Promise<ApiResponse<StockTransaction>> => {
    try {
      // TODO: Implement update stock transaction endpoint
      return { 
        data: undefined as any, 
        success: false, 
        message: 'Update stock transaction not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      return { data: undefined as any, success: false, message: error.message };
    }
  },

  updateStockTransactionStatus: async (id: string, status: StockTransactionStatus): Promise<ApiResponse<StockTransaction>> => {
    try {
      // TODO: Implement update transaction status endpoint
      return { 
        data: undefined as any, 
        success: false, 
        message: 'Update transaction status not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      return { data: undefined as any, success: false, message: error.message };
    }
  },
};