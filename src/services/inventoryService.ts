import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  item_id: string;
  item_name: string;
  unit: string;
  current_stock: number;
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
   * Fetch inventory data from current_inventory_stock table, excluding phantom items
   */
  static async getInventoryData(): Promise<{ data: InventoryItem[]; stats: InventoryStats }> {
    try {
      
      // Fetch from current_inventory_stock joined with item_masters for accurate min/max values
      // Only include items where min/max thresholds are properly defined (> 0)
      const { data: inventoryData, error } = await supabase
        .from('current_inventory_stock')
        .select(`
          id,
          item_master_id,
          current_quantity,
          reserved_quantity,
          available_quantity,
          last_updated,
          item_masters!inner(
            nomenclature,
            item_code,
            unit,
            minimum_stock_level,
            reorder_point,
            maximum_stock_level
          )
        `)
        .gt('item_masters.minimum_stock_level', 0)
        .gt('item_masters.reorder_point', 0)
        .order('current_quantity', { ascending: false });

      if (error) {
        throw error;
      }

      
      // Since we've cleaned up the database, current_inventory_stock now only contains legitimate items
      // No need for additional phantom filtering - trust the cleaned database
      
      const items = inventoryData || [];
      

      // Process the data (only valid items with properly defined min/max thresholds)
      const processedItems: InventoryItem[] = items.map(item => {
        const currentStock = item.current_quantity || 0;
        const itemMaster = (item.item_masters as any) || {};
        
        // Get min/max values from item_masters table (source of truth)
        const minLevel = itemMaster.minimum_stock_level || 0;
        const reorderLevel = itemMaster.reorder_point || 0;
        const maxLevel = itemMaster.maximum_stock_level || 0;

        // Determine status with enhanced low stock detection
        let status: 'Active' | 'Low Stock' | 'No Stock' = 'Active';
        
        if (currentStock <= 0) {
          status = 'No Stock';
        } else {
          // Check for low stock conditions (multiple criteria)
          const isLowStock = (
            (reorderLevel > 0 && currentStock <= reorderLevel) ||  // Below reorder point
            (minLevel > 0 && currentStock <= minLevel) ||          // At or below minimum level
            (minLevel > 0 && currentStock < (minLevel * 1.2))      // Within 20% of minimum (early warning)
          );
          
          if (isLowStock) {
            status = 'Low Stock';
          } else {
            status = 'Active';
          }
        }

        const defaultPrice = 100;
        const totalValue = currentStock * defaultPrice;

        return {
          item_id: item.item_master_id,
          item_name: itemMaster.nomenclature || 'Unknown Item',
          unit: itemMaster.unit || 'units',
          current_stock: currentStock,
          total_acquired: currentStock,
          total_issued: 0,
          weighted_avg_price: defaultPrice,
          total_value: totalValue,
          minimum_stock_level: minLevel,
          reorder_point: reorderLevel,
          maximum_stock_level: maxLevel,
          primary_location: 'Main Warehouse',
          status,
          last_movement_date: item.last_updated || new Date().toISOString(),
          tender_count: 1,
          tender_titles: 'Various',
          tender_numbers: 'Multiple',
          transaction_count: 1
        };
      });

      
      const lowStockItems = processedItems.filter(item => item.status === 'Low Stock');
      const noStockItems = processedItems.filter(item => item.status === 'No Stock');
      

      const stats: InventoryStats = {
        totalItems: processedItems.length,
        totalValue: processedItems.reduce((sum, item) => sum + item.total_value, 0),
        activeItems: processedItems.filter(item => item.status === 'Active').length,
        lowStockItems: lowStockItems.length,
        noStockItems: noStockItems.length
      };

      return { data: processedItems, stats };
    } catch (error) {
      throw error;
    }
  }
}
