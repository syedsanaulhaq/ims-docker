import { supabase } from '@/integrations/supabase/client';

export interface InventorySetting {
  id: string;
  setting_name: string;
  setting_value: number;
  setting_type: string;
  description: string;
  min_value: number;
  max_value: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string;
}

export interface InventoryLevelOverride {
  id: string;
  item_master_id: string;
  minimum_stock_level: number;
  reorder_point: number;
  maximum_stock_level: number;
  override_reason: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface SettingsLog {
  id: string;
  setting_name: string;
  old_value: number;
  new_value: number;
  changed_by: string;
  change_reason: string;
  changed_at: string;
}

export interface BulkUpdateResult {
  updated_count: number;
  total_count: number;
}

export class InventorySettingsService {
  /**
   * Get all active inventory settings
   */
  static async getSettings(): Promise<InventorySetting[]> {
    const { data, error } = await supabase
      .from('inventory_settings')
      .select('*')
      .eq('is_active', true)
      .order('setting_type', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific setting value
   */
  static async getSetting(settingName: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_inventory_setting', {
      p_setting_name: settingName
    });

    if (error) {
      throw new Error(`Failed to fetch setting ${settingName}: ${error.message}`);
    }

    return data || 0;
  }

  /**
   * Update a specific setting
   */
  static async updateSetting(
    settingName: string,
    newValue: number,
    changedBy: string = 'system',
    reason: string = 'Updated via API'
  ): Promise<void> {
    const { error } = await supabase.rpc('update_inventory_setting', {
      p_setting_name: settingName,
      p_new_value: newValue,
      p_changed_by: changedBy,
      p_reason: reason
    });

    if (error) {
      throw new Error(`Failed to update setting ${settingName}: ${error.message}`);
    }
  }

  /**
   * Update multiple settings at once
   */
  static async updateMultipleSettings(
    updates: Array<{
      settingName: string;
      newValue: number;
      reason?: string;
    }>,
    changedBy: string = 'system'
  ): Promise<void> {
    const promises = updates.map(update =>
      this.updateSetting(
        update.settingName,
        update.newValue,
        changedBy,
        update.reason || 'Bulk update via API'
      )
    );

    await Promise.all(promises);
  }

  /**
   * Bulk update all inventory levels based on current settings
   */
  static async bulkUpdateInventoryLevels(changedBy: string = 'system'): Promise<BulkUpdateResult> {
    const { data, error } = await supabase.rpc('bulk_update_inventory_levels', {
      p_changed_by: changedBy
    });

    if (error) {
      throw new Error(`Failed to bulk update inventory levels: ${error.message}`);
    }

    return data?.[0] || { updated_count: 0, total_count: 0 };
  }

  /**
   * Get inventory items with their current levels
   */
  static async getInventoryItems(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select(`
        item_master_id,
        nomenclature,
        current_stock,
        minimum_stock_level,
        reorder_point,
        maximum_stock_level,
        total_value,
        last_movement_date
      `)
      .gt('current_stock', 0)
      .order('nomenclature')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch inventory items: ${error.message}`);
    }

    // Check for overrides
    const { data: overrides } = await supabase
      .from('inventory_level_overrides')
      .select('item_master_id')
      .eq('is_active', true);

    const overrideIds = new Set(overrides?.map(o => o.item_master_id) || []);

    return data?.map(item => ({
      ...item,
      has_override: overrideIds.has(item.item_master_id)
    })) || [];
  }

  /**
   * Get settings change log
   */
  static async getSettingsLog(limit: number = 50): Promise<SettingsLog[]> {
    const { data, error } = await supabase
      .from('inventory_settings_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch settings log: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create an item-specific override
   */
  static async createItemOverride(
    itemMasterId: string,
    minimumLevel: number,
    reorderPoint: number,
    maximumLevel: number,
    reason: string,
    createdBy: string = 'system'
  ): Promise<void> {
    const { error } = await supabase
      .from('inventory_level_overrides')
      .upsert({
        item_master_id: itemMasterId,
        minimum_stock_level: minimumLevel,
        reorder_point: reorderPoint,
        maximum_stock_level: maximumLevel,
        override_reason: reason,
        created_by: createdBy,
        is_active: true
      });

    if (error) {
      throw new Error(`Failed to create item override: ${error.message}`);
    }
  }

  /**
   * Remove an item-specific override
   */
  static async removeItemOverride(itemMasterId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_level_overrides')
      .update({ is_active: false })
      .eq('item_master_id', itemMasterId);

    if (error) {
      throw new Error(`Failed to remove item override: ${error.message}`);
    }
  }

  /**
   * Get item overrides
   */
  static async getItemOverrides(): Promise<InventoryLevelOverride[]> {
    const { data, error } = await supabase
      .from('inventory_level_overrides')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch item overrides: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate preview levels for an item based on current settings
   */
  static async calculatePreviewLevels(currentStock: number): Promise<{
    minimum: number;
    reorder: number;
    maximum: number;
  }> {
    try {
      const [minPct, reorderPct, maxPct, minAbs, reorderAbs, maxAbs] = await Promise.all([
        this.getSetting('minimum_stock_percentage'),
        this.getSetting('reorder_point_percentage'),
        this.getSetting('maximum_stock_percentage'),
        this.getSetting('minimum_absolute_minimum'),
        this.getSetting('minimum_absolute_reorder'),
        this.getSetting('minimum_absolute_maximum')
      ]);

      return {
        minimum: Math.max(Math.floor(currentStock * (minPct / 100)), minAbs),
        reorder: Math.max(Math.floor(currentStock * (reorderPct / 100)), reorderAbs),
        maximum: Math.max(Math.ceil(currentStock * (maxPct / 100)), maxAbs)
      };
    } catch (error) {
      throw new Error(`Failed to calculate preview levels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get inventory statistics based on current settings
   */
  static async getInventoryStatistics(): Promise<{
    totalItems: number;
    itemsBelowMinimum: number;
    itemsNeedingReorder: number;
    itemsWithOverrides: number;
  }> {
    try {
      const [inventoryData, overridesData] = await Promise.all([
        supabase
          .from('inventory_stock')
          .select('current_stock, minimum_stock_level, reorder_point')
          .gt('current_stock', 0),
        supabase
          .from('inventory_level_overrides')
          .select('id')
          .eq('is_active', true)
      ]);

      if (inventoryData.error) {
        throw inventoryData.error;
      }

      if (overridesData.error) {
        throw overridesData.error;
      }

      const items = inventoryData.data || [];
      const totalItems = items.length;
      const itemsBelowMinimum = items.filter(item => 
        item.current_stock <= item.minimum_stock_level
      ).length;
      const itemsNeedingReorder = items.filter(item => 
        item.current_stock <= item.reorder_point
      ).length;
      const itemsWithOverrides = overridesData.data?.length || 0;

      return {
        totalItems,
        itemsBelowMinimum,
        itemsNeedingReorder,
        itemsWithOverrides
      };
    } catch (error) {
      throw new Error(`Failed to get inventory statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default InventorySettingsService;
