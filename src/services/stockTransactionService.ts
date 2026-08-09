import { supabase } from '@/integrations/supabase/client';

export interface StockTransactionItem {
  id?: string;
  tender_id: string;
  item_master_id: string;
  estimated_unit_price?: number;
  actual_unit_price?: number;
  pricing_confirmed?: boolean;
  total_quantity_received?: number;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  // Fields from tender_items (for quantity)
  quantity?: number;
  // Joined fields from item_masters
  nomenclature?: string;
  specifications?: string;
}

export class StockTransactionService {
  
  // Check if tender items exist in stock_transactions using HTTP API
  static async getTenderStockTransactions(tenderId: string): Promise<StockTransactionItem[]> {
    try {
      const response = await fetch(`http://localhost:5000/api/stock-transactions?tender_id=${tenderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform the data to match the expected interface
      return data.map((item: any) => ({
        id: item.id?.toString(),
        tender_id: item.tender_id?.toString(),
        item_master_id: item.item_master_id?.toString(),
        estimated_unit_price: item.estimated_unit_price,
        actual_unit_price: item.actual_unit_price,
        pricing_confirmed: item.pricing_confirmed,
        total_quantity_received: item.total_quantity_received,
        is_deleted: item.is_deleted || item.boolDeleted,
        created_at: item.created_at,
        updated_at: item.updated_at,
        quantity: item.quantity,
        nomenclature: item.item_name || item.nomenclature,
        specifications: item.specifications
      }));
      
    } catch (error) {
      console.error('Error fetching tender stock transactions:', error);
      return [];
    }
  }
  
  // Initialize stock transactions from tender items (first time only)
  static async initializeStockTransactionsFromTender(tenderId: string, tenderItems: any[]) {
    // First check if already initialized
    const existing = await this.getTenderStockTransactions(tenderId);
    if (existing.length > 0) {
      return existing; // Already initialized
    }
    
    // Create stock transaction records from tender items
    const stockTransactionItems = tenderItems.map(item => ({
      tender_id: tenderId,
      item_master_id: item.itemMasterId,
      estimated_unit_price: (item.estimatedUnitPrice || 0) / (item.quantity || 1),
      actual_unit_price: 0,
      pricing_confirmed: false,
      total_quantity_received: 0,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    try {
      const { data, error } = await supabase
        .from('stock_transactions_clean')
        .insert(stockTransactionItems)
        .select('*');
      
      if (error) {
        
        throw error;
      }
      
      // Get the full data with quantities and item details
      return await this.getTenderStockTransactions(tenderId);
      
    } catch (error) {
      
      throw error;
    }
  }
  
  // Remove item from stock transaction (soft delete)
  static async removeStockTransactionItem(tenderId: string, itemMasterId: string) {
    const { error } = await supabase
      .from('stock_transactions_clean')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId);
    
    if (error) throw error;
  }
  
  // Restore item to stock transaction (undelete)
  static async restoreStockTransactionItem(tenderId: string, itemMasterId: string) {
    const { error } = await supabase
      .from('stock_transactions_clean')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId);
    
    if (error) throw error;
  }
  
  // Get removed/deleted items for a tender
  static async getRemovedStockTransactionItems(tenderId: string): Promise<StockTransactionItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_transactions_clean')
        .select('*')
        .eq('tender_id', tenderId)
        .eq('is_deleted', true);
      
      if (error) {
        
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Get tender items for quantities
      const { data: tenderItemsData, error: tenderItemsError } = await supabase
        .from('tender_items')
        .select('item_master_id, quantity')
        .eq('tender_id', tenderId);
      
      if (tenderItemsError) {
        
      }
      
      // Get item details
      const itemIds = data.map(item => item.item_master_id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('item_masters')
        .select('id, nomenclature, specifications')
        .in('id', itemIds);
      
      if (itemsError) {
        
      }
      
      // Combine the data
      return data.map(item => {
        const tenderItem = tenderItemsData?.find(ti => ti.item_master_id === item.item_master_id);
        const itemMaster = itemsData?.find(im => im.id === item.item_master_id);
        
        return {
          ...item,
          quantity: tenderItem?.quantity || 0,
          nomenclature: itemMaster?.nomenclature || 'Unknown Item',
          specifications: itemMaster?.specifications || ''
        };
      });
      
    } catch (error) {
      
      throw error;
    }
  }
  
  // Update actual price for an item
  static async updateActualPrice(tenderId: string, itemMasterId: string, actualPrice: number) {
    const { error } = await supabase
      .from('stock_transactions_clean')
      .update({
        actual_unit_price: actualPrice,
        pricing_confirmed: actualPrice > 0,
        updated_at: new Date().toISOString()
      })
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId);
    
    if (error) throw error;
  }
  
  // Add new item to stock transaction (not from original tender)
  static async addNewStockTransactionItem(
    tenderId: string,
    itemMasterId: string,
    estimatedPrice: number = 0
  ) {
    try {
      const { data, error } = await supabase
        .from('stock_transactions_clean')
        .insert({
          tender_id: tenderId,
          item_master_id: itemMasterId,
          estimated_unit_price: estimatedPrice,
          actual_unit_price: 0,
          pricing_confirmed: false,
          total_quantity_received: 0,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*');
      
      if (error) {
        
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Get item details
      const { data: itemData, error: itemError } = await supabase
        .from('item_masters')
        .select('nomenclature, specifications')
        .eq('id', itemMasterId)
        .single();
      
      if (itemError) {
        
      }
      
      return {
        ...data[0],
        quantity: 0, // New items start with 0 quantity from tender
        nomenclature: itemData?.nomenclature || 'Unknown Item',
        specifications: itemData?.specifications || ''
      };
      
    } catch (error) {
      
      throw error;
    }
  }

  // Get dashboard statistics from stock_transactions_clean table
  static async getDashboardStats() {
    try {
      // Get all stock transactions
      const { data: stockTransactions, error: stockError } = await supabase
        .from('stock_transactions_clean')
        .select(`
          id,
          tender_id,
          item_master_id,
          quantity,
          actual_unit_price,
          is_deleted,
          tenders!inner(
            id,
            title,
            tender_number,
            is_finalized,
            created_at
          )
        `)
        .eq('is_deleted', false);

      if (stockError) {
        console.error('Error fetching stock transactions:', stockError);
        throw stockError;
      }

      // Calculate statistics
      const stats = {
        totalTenders: 0,
        activeTenders: 0,
        finalizedTenders: 0,
        totalItems: 0,
        totalQuantity: 0,
        recentTenders: [] as any[]
      };

      if (stockTransactions && stockTransactions.length > 0) {
        // Group by tender_id to get unique tenders
        const tenderMap = new Map();
        
        stockTransactions.forEach((transaction: any) => {
          const tenderId = transaction.tender_id;
          const tender = transaction.tenders;
          
          if (!tenderMap.has(tenderId)) {
            tenderMap.set(tenderId, {
              ...tender,
              itemCount: 0,
              totalQuantity: 0
            });
          }
          
          const tenderData = tenderMap.get(tenderId);
          tenderData.itemCount += 1;
          tenderData.totalQuantity += (transaction.quantity || 0);
        });

        const uniqueTenders = Array.from(tenderMap.values());
        
        stats.totalTenders = uniqueTenders.length;
        stats.activeTenders = uniqueTenders.filter(t => !t.is_finalized).length;
        stats.finalizedTenders = uniqueTenders.filter(t => t.is_finalized).length;
        stats.totalItems = stockTransactions.length;
        stats.totalQuantity = stockTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
        
        // Get recent tenders (sort by created_at)
        stats.recentTenders = uniqueTenders
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 5)
          .map(tender => ({
            id: tender.id,
            title: tender.title,
            tenderNumber: tender.tender_number,
            is_finalized: tender.is_finalized,
            createdAt: tender.created_at,
            itemCount: tender.itemCount,
            totalQuantity: tender.totalQuantity
          }));
      }

      return {
        success: true,
        data: stats
      };
      
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        data: {
          totalTenders: 0,
          activeTenders: 0,
          finalizedTenders: 0,
          totalItems: 0,
          totalQuantity: 0,
          recentTenders: []
        }
      };
    }
  }
}
