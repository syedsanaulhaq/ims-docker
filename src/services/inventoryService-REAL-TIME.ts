import { supabase } from '@/lib/supabase';

export interface InventoryItem {
  item_id: string;
  item_name: string;
  current_stock: number;
  available_stock: number; // Current - Reserved
  reserved_stock: number;
  total_acquired: number;
  total_issued: number;
  weighted_avg_price: number;
  total_value: number;
  minimum_stock_level: number;
  reorder_point: number;
  maximum_stock_level: number;
  primary_location: string;
  status: 'Active' | 'Low Stock' | 'No Stock';
  last_movement_date: string;
  tender_count: number;
  tender_titles: string;
  tender_numbers: string;
  transaction_count: number;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeItems: number;
  lowStockItems: number;
  noStockItems: number;
}

export class InventoryService {
  /**
   * NEW: Fetch inventory data from the real-time current_inventory_stock table
   * This provides accurate, up-to-date stock levels maintained by database triggers
   */
  static async getInventoryData(): Promise<{ data: InventoryItem[]; stats: InventoryStats }> {
    try {
      // Fetch from the real-time inventory table with item details
      const { data: inventoryData, error } = await supabase
        .from('current_inventory_stock')
        .select(`
          item_master_id,
          current_quantity,
          reserved_quantity,
          available_quantity,
          minimum_stock_level,
          reorder_point,
          maximum_stock_level,
          last_updated,
          item_masters!inner(
            nomenclature,
            item_code,
            unit
          )
        `)
        .order('current_quantity', { ascending: false });

      if (error) {throw error;
      }

      const items = inventoryData || [];

      // Process the real-time inventory data
      const processedItems: InventoryItem[] = items.map(item => {
        const currentStock = item.current_quantity || 0;
        const reservedStock = item.reserved_quantity || 0;
        const availableStock = item.available_quantity || 0;
        const minLevel = item.minimum_stock_level || 0;
        const reorderLevel = item.reorder_point || 0;
        const maxLevel = item.maximum_stock_level || 0;

        // Determine status based on real-time stock levels
        let status: 'Active' | 'Low Stock' | 'No Stock' = 'No Stock';
        if (currentStock <= 0) {
          status = 'No Stock';
        } else if (reorderLevel > 0 && currentStock <= reorderLevel) {
          status = 'Low Stock';
        } else if (minLevel > 0 && currentStock < minLevel) {
          status = 'Low Stock';
        } else {
          status = 'Active';
        }

        // Calculate value (using default price for now)
        const defaultPrice = 100;
        const totalValue = currentStock * defaultPrice;

        return {
          item_id: item.item_master_id,
          item_name: (item.item_masters as any)?.nomenclature || 'Unknown Item',
          current_stock: currentStock,
          available_stock: availableStock,
          reserved_stock: reservedStock,
          total_acquired: currentStock, // Real-time total
          total_issued: 0, // Can be calculated if needed
          weighted_avg_price: defaultPrice,
          total_value: totalValue,
          minimum_stock_level: minLevel,
          reorder_point: reorderLevel,
          maximum_stock_level: maxLevel,
          primary_location: 'Main Store',
          status,
          last_movement_date: item.last_updated || new Date().toISOString(),
          tender_count: 0,
          tender_titles: '',
          tender_numbers: '',
          transaction_count: 0
        };
      });

      // Calculate stats from real-time data
      const stats: InventoryStats = {
        totalItems: processedItems.length,
        totalValue: processedItems.reduce((sum, item) => sum + item.total_value, 0),
        activeItems: processedItems.filter(item => item.status === 'Active').length,
        lowStockItems: processedItems.filter(item => item.status === 'Low Stock').length,
        noStockItems: processedItems.filter(item => item.status === 'No Stock').length
      };

      return { data: processedItems, stats };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed stock movements for an item
   */
  static async getItemStockHistory(itemId: string) {
    try {
      const [deliveries, issuances, returns] = await Promise.all([
        supabase
          .from('delivery_items')
          .select('delivery_qty, created_at, deliveries(delivery_number)')
          .eq('item_master_id', itemId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('stock_issuance_items')
          .select('issued_quantity, created_at')
          .eq('item_master_id', itemId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('stock_return_items')
          .select(`
            return_quantity, 
            created_at,
            stock_issuance_items!inner(item_master_id)
          `)
          .eq('stock_issuance_items.item_master_id', itemId)
          .order('created_at', { ascending: false })
      ]);

      return {
        deliveries: deliveries.data || [],
        issuances: issuances.data || [],
        returns: returns.data || []
      };
    } catch (error) {
      throw error;
    }
  }
}
