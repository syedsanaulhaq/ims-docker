// SQL Server Inventory Service - Uses View_Current_Inv_Stock database view
import { getApiBaseUrl } from './invmisApi';

export interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderLevel?: number;
  unit: string;
  location: string;
  category: string;
  subCategory?: string;
  lastUpdated: string;
  status: string;
}

export interface InventoryStats {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  normalStockItems: number;
  overstockItems: number;
}

export class InventoryService {
  private static baseUrl = getApiBaseUrl();

  /**
   * Fetch inventory data from SQL Server backend using View_Current_Inv_Stock
   */
  static async getInventoryData(): Promise<{ data: InventoryItem[]; stats: InventoryStats }> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/current-inventory-stock`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      // Transform the View_Current_Inv_Stock data to InventoryItem format
      const transformedData: InventoryItem[] = rawData.map((item: any) => ({
        id: item.item_master_id?.toString() || '',
        itemName: item.nomenclature || '',
        itemCode: item.item_code || '',
        currentStock: item.current_quantity || 0,
        minimumStock: item.minimum_stock || 0,
        maximumStock: item.maximum_stock || 0,
        reorderLevel: item.reorder_level || 0,
        unit: item.unit || '',
        location: item.location || '',
        category: item.category_name || '',
        subCategory: item.sub_category_name || '',
        lastUpdated: new Date().toISOString(),
        status: item.current_quantity <= (item.minimum_stock || 0) ? 'Low Stock' : 
                item.current_quantity >= (item.maximum_stock || 999999) ? 'Overstock' : 'Normal'
      }));

      // Calculate stats from the data
      const totalItems = transformedData.length;
      const lowStockItems = transformedData.filter(item => item.status === 'Low Stock').length;
      const overstockItems = transformedData.filter(item => item.status === 'Overstock').length;
      const outOfStockItems = transformedData.filter(item => item.currentStock === 0).length;
      const normalStockItems = transformedData.filter(item => item.status === 'Normal').length;

      const stats: InventoryStats = {
        totalItems,
        totalStockValue: 0, // Can be calculated if needed
        lowStockItems,
        outOfStockItems,
        normalStockItems,
        overstockItems
      };

      return {
        data: transformedData,
        stats
      };
    } catch (error) {
      console.error('❌ Error fetching inventory data:', error);
      
      // Return fallback data
      return {
        data: [],
        stats: {
          totalItems: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          normalStockItems: 0,
          overstockItems: 0
        }
      };
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/low-stock`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching low stock items:', error);
      return [];
    }
  }

  /**
   * Get items needing reorder
   */
  static async getReorderItems(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/reorder`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching reorder items:', error);
      return [];
    }
  }

  /**
   * Get top items by stock quantity
   */
  static async getTopItems(limit: number = 10): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/top-items?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching top items:', error);
      return [];
    }
  }
}
