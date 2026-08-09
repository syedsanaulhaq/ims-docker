import { supabase } from '@/config/supabase';

// ===============================================
// CLEAN API SERVICES FOR NEW STRUCTURE
// ===============================================

// 1. Tender Visits Service
export class TenderVisitsService {
  
  // Get all visits for a tender item
  static async getVisitsForItem(tenderId: string, itemMasterId: string) {
    const { data, error } = await supabase
      .from('tender_visits')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId)
      .order('visit_number');
    
    if (error) throw error;
    return data || [];
  }
  
  // Save or update a visit (clean UPSERT)
  static async saveVisit(visitData: {
    tender_id: string;
    item_master_id: string;
    visit_number: number;
    received_qty: number;
    received_by: string;
    received_date: string;
    delivery_notes?: string;
  }) {
    const { data, error } = await supabase
      .rpc('save_tender_visit', {
        p_tender_id: visitData.tender_id,
        p_item_master_id: visitData.item_master_id,
        p_visit_number: visitData.visit_number,
        p_received_qty: visitData.received_qty,
        p_received_by: visitData.received_by,
        p_received_date: visitData.received_date,
        p_delivery_notes: visitData.delivery_notes
      });
    
    if (error) throw error;
    return data;
  }
  
  // Delete a visit
  static async deleteVisit(tenderId: string, itemMasterId: string, visitNumber: number) {
    const { error } = await supabase
      .from('tender_visits')
      .delete()
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId)
      .eq('visit_number', visitNumber);
    
    if (error) throw error;
  }
}

// 2. Tender Pricing Service  
export class TenderPricingService {
  
  // Get pricing for all items in a tender
  static async getTenderPricing(tenderId: string) {
    const { data, error } = await supabase
      .from('tender_item_pricing')
      .select('*')
      .eq('tender_id', tenderId);
    
    if (error) throw error;
    return data || [];
  }
  
  // Update actual unit price (clean UPDATE)
  static async updateActualPrice(tenderId: string, itemMasterId: string, actualUnitPrice: number) {
    const { data, error } = await supabase
      .from('tender_item_pricing')
      .update({ 
        actual_unit_price: actualUnitPrice,
        updated_at: new Date().toISOString()
      })
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId);
    
    if (error) throw error;
    return data;
  }
  
  // Initialize pricing for tender items
  static async initializePricing(tenderId: string, items: Array<{
    item_master_id: string;
    estimated_unit_price: number;
  }>) {
    const pricingData = items.map(item => ({
      tender_id: tenderId,
      item_master_id: item.item_master_id,
      estimated_unit_price: item.estimated_unit_price
    }));
    
    const { data, error } = await supabase
      .from('tender_item_pricing')
      .upsert(pricingData, { 
        onConflict: 'tender_id,item_master_id',
        ignoreDuplicates: false
      });
    
    if (error) throw error;
    return data;
  }
}

// 3. Stock Movements Service
export class StockMovementsService {
  
  // Get stock movements for an item
  static async getMovements(itemMasterId: string, tenderId?: string) {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .eq('item_master_id', itemMasterId)
      .order('transaction_date', { ascending: false });
    
    if (tenderId) {
      query = query.eq('tender_id', tenderId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // Create stock movement from visit
  static async createFromVisit(visitId: string) {
    const { data, error } = await supabase
      .rpc('create_stock_movement_from_visit', {
        p_visit_id: visitId
      });
    
    if (error) throw error;
    return data;
  }
}

// 4. Combined Tender Summary Service
export class TenderSummaryService {
  
  // Get complete tender summary using the view
  static async getTenderSummary(tenderId: string) {
    const { data, error } = await supabase
      .from('tender_items_summary')
      .select('*')
      .eq('tender_id', tenderId);
    
    if (error) throw error;
    return data || [];
  }
}

// ===============================================
// EXAMPLE: How the component state management becomes simpler
// ===============================================

export const useTenderAcquisition = (tenderId: string) => {
  const [visits, setVisits] = useState<{[itemId: string]: any[]}>({});
  const [pricing, setPricing] = useState<{[itemId: string]: {estimated: number, actual: number}}>({});
  const [loading, setLoading] = useState(false);
  
  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      // Get summary data (includes visits and pricing)
      const summary = await TenderSummaryService.getTenderSummary(tenderId);
      
      // Transform for state
      const visitsData: {[itemId: string]: any[]} = {};
      const pricingData: {[itemId: string]: {estimated: number, actual: number}} = {};
      
      for (const item of summary) {
        // Load visits for each item
        const itemVisits = await TenderVisitsService.getVisitsForItem(tenderId, item.item_master_id);
        visitsData[item.item_master_id] = itemVisits;
        
        // Set pricing
        pricingData[item.item_master_id] = {
          estimated: item.estimated_unit_price || 0,
          actual: item.actual_unit_price || 0
        };
      }
      
      setVisits(visitsData);
      setPricing(pricingData);
      
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };
  
  // Update actual price (no more messy inserts!)
  const updateActualPrice = async (itemMasterId: string, newPrice: number) => {
    try {
      await TenderPricingService.updateActualPrice(tenderId, itemMasterId, newPrice);
      
      // Update local state
      setPricing(prev => ({
        ...prev,
        [itemMasterId]: {
          ...prev[itemMasterId],
          actual: newPrice
        }
      }));
      
    } catch (error) {
      
      throw error;
    }
  };
  
  // Save visit (clean upsert)
  const saveVisit = async (itemMasterId: string, visitData: any) => {
    try {
      await TenderVisitsService.saveVisit({
        tender_id: tenderId,
        item_master_id: itemMasterId,
        ...visitData
      });
      
      // Reload visits for this item
      const updatedVisits = await TenderVisitsService.getVisitsForItem(tenderId, itemMasterId);
      setVisits(prev => ({
        ...prev,
        [itemMasterId]: updatedVisits
      }));
      
    } catch (error) {
      
      throw error;
    }
  };
  
  return {
    visits,
    pricing,
    loading,
    loadData,
    updateActualPrice,
    saveVisit
  };
};
