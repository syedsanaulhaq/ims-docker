// ====================================================================
// 📦 InvMIS Inventory API Service - Aligned with InvMISDB Structure
// ====================================================================
import { ApiResponse } from './api';
import { invmisApi, type CurrentStock, type DashboardSummary, type Item } from './invmisApi';
import { InventoryItem, Vendor, Transaction, StockTransaction } from '@/hooks/useInventoryData';

// InvMIS-based inventory stats
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

// InvMIS CurrentStock-based requests
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

export const inventoryApi = {
  // ====================================================================
  // 📦 Current Stock Management (InvMIS Primary Inventory)
  // ====================================================================
  
  getInventoryItems: async (): Promise<ApiResponse<InventoryItem[]>> => {
    try {
      const response = await invmisApi.stock.getCurrent();
      
      if (!response.success) {
        return { data: [], success: false, message: 'Failed to fetch current stock' };
      }

      // Transform InvMIS CurrentStock to legacy InventoryItem format
      const mapped = response.stock.map(stock => ({
        id: stock.stock_id.toString(),
        itemMasterId: stock.item_id.toString(),
        currentStock: stock.current_quantity,
        minimumStock: stock.minimum_level,
        maximumStock: stock.maximum_level,
        reorderLevel: stock.minimum_level,
        location: 'Main Store', // InvMIS uses departments, not stores
        storeId: '1',
        vendorId: undefined,
        status: stock.stock_status === 'Normal' ? 'Active' : 'Alert',
        itemType: 'General',
      }));
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching inventory items:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  getInventoryItem: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    try {
      const response = await invmisApi.stock.getCurrent();
      
      if (!response.success) {
        return { data: {} as InventoryItem, success: false, message: 'Failed to fetch stock item' };
      }

      const stock = response.stock.find(s => s.stock_id.toString() === id);
      
      if (!stock) {
        return { data: {} as InventoryItem, success: false, message: 'Stock item not found' };
      }

      const mapped: InventoryItem = {
        id: stock.stock_id.toString(),
        itemMasterId: stock.item_id.toString(),
        currentStock: stock.current_quantity,
        minimumStock: stock.minimum_level,
        maximumStock: stock.maximum_level,
        reorderLevel: stock.minimum_level,
        location: 'Main Store',
        storeId: '1',
        vendorId: undefined,
        status: stock.stock_status === 'Normal' ? 'Active' : 'Alert',
        itemType: 'General',
      };
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      return { data: {} as InventoryItem, success: false, message: error.message };
    }
  },

  createInventoryItem: async (item: CreateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    try {
      // TODO: Implement create current stock endpoint in InvMIS API
      return { 
        data: {} as InventoryItem, 
        success: false, 
        message: 'Create inventory item not yet implemented in InvMIS API' 
      };
    } catch (error: any) {
      console.error('Error creating inventory item:', error);
      return { data: {} as InventoryItem, success: false, message: error.message };
    }
  },

  updateInventoryItem: async (item: UpdateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    try {
      const { stockId, ...updateData } = item;
      
      // Use existing InvMIS update stock endpoint
      await invmisApi.stock.updateQuantity(stockId, {
        current_quantity: updateData.currentQuantity,
        minimum_level: updateData.minimumLevel,
        maximum_level: updateData.maximumLevel,
        updated_by: updateData.updatedBy
      });

      // Return updated item (would need to refetch to get actual result)
      return { 
        data: {} as InventoryItem, 
        success: true, 
        message: 'Stock updated successfully' 
      };
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      return { data: {} as InventoryItem, success: false, message: error.message };
    }
  },

  deleteInventoryItem: async (id: string): Promise<ApiResponse<null>> => {
    try {
      // TODO: Implement delete stock endpoint in InvMIS API
      return { data: null, success: false, message: 'Delete not yet implemented' };
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      return { data: null, success: false, message: error.message };
    }
  },

  // ====================================================================
  // 📊 Dashboard Statistics 
  // ====================================================================
  
  getInventoryStats: async (): Promise<ApiResponse<InventoryStats>> => {
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
      console.error('Error fetching inventory stats:', error);
      return { 
        data: { totalItems: 0, lowStockItems: 0, totalRequests: 0, pendingApprovals: 0 }, 
        success: false, 
        message: error.message 
      };
    }
  },

  // ====================================================================
  // 📦 Items Management (ItemMaster integration)
  // ====================================================================
  
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    try {
      const response = await invmisApi.categories.getAll();
      
      if (!response.success) {
        return { data: [], success: false, message: 'Failed to fetch categories' };
      }

      const mapped = response.categories.map(cat => ({
        id: cat.id,
        name: cat.category_name,
        CategoryName: cat.category_name,
      }));
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  getOffices: async (): Promise<ApiResponse<Office[]>> => {
    try {
      const response = await invmisApi.offices.getAll();
      
      if (!response.success) {
        return { data: [], success: false, message: 'Failed to fetch offices' };
      }

      const mapped = response.offices.map(office => ({
        id: office.office_id.toString(),
        name: office.office_name,
        type: 'Office',
      }));
      
      return { data: mapped, success: true, message: 'Success' };
    } catch (error: any) {
      console.error('Error fetching offices:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  // ====================================================================
  // 🔄 Stock Transactions (Placeholder for now)
  // ====================================================================
  
  getStockTransactions: async (): Promise<ApiResponse<StockTransaction[]>> => {
    try {
      // TODO: Implement get stock transactions in InvMIS API
      return { data: [], success: false, message: 'Stock transactions not yet implemented' };
    } catch (error: any) {
      console.error('Error fetching stock transactions:', error);
      return { data: [], success: false, message: error.message };
    }
  },

  createStockTransaction: async (transaction: CreateStockTransactionRequest): Promise<ApiResponse<StockTransaction>> => {
    try {
      // TODO: Implement create stock transaction in InvMIS API
      return { 
        data: {} as StockTransaction, 
        success: false, 
        message: 'Create transaction not yet implemented' 
      };
    } catch (error: any) {
      console.error('Error creating stock transaction:', error);
      return { data: {} as StockTransaction, success: false, message: error.message };
    }
  },

  // ====================================================================
  // 👥 Vendor Management (Placeholder - InvMIS focuses on procurement workflow)
  // ====================================================================
  
  getVendors: async (): Promise<ApiResponse<Vendor[]>> => {
    try {
      // TODO: InvMIS uses vendor info in TenderAwards, not separate vendor management
      return { data: [], success: false, message: 'Vendor management uses procurement workflow' };
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      return { data: [], success: false, message: error.message };
    }
  },
};
