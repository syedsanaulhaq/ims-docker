import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ===============================================
// CLEAN SERVICES FOR NEW DATABASE STRUCTURE
// ===============================================
// These services use the new clean structure:
// - stock_transactions_clean for pricing (one record per item)
// - tender_visits for visit tracking (multiple records per item)

// 1. Tender Visits Service
export class TenderVisitsService {
  
  // Get all visits for a tender item (excluding soft deleted)
  static async getVisitsForItem(tenderId: string, itemMasterId: string) {
    const { data, error } = await supabase
      .from('tender_visits')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('item_master_id', itemMasterId)
      .eq('is_deleted', false)  // Exclude soft deleted visits
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
    try {
      // Ensure received_qty is never null (use 0 as default)
      const receivedQty = visitData.received_qty != null ? Number(visitData.received_qty) : 0;
      
      // Use direct UPSERT instead of function for better error handling
      const { data, error } = await supabase
        .from('tender_visits')
        .upsert({
          tender_id: visitData.tender_id,
          item_master_id: visitData.item_master_id,
          visit_number: visitData.visit_number,
          received_qty: receivedQty,
          received_by: visitData.received_by || '',
          received_date: visitData.received_date,
          delivery_notes: visitData.delivery_notes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tender_id,item_master_id,visit_number'
        })
        .select();
      
      if (error) {
        
        throw error;
      }
      
      // After saving visit, update total quantity in stock_transactions_clean
      await this.updateTotalQuantityReceived(visitData.tender_id, visitData.item_master_id);
      
      return data;
    } catch (error) {
      
      throw error;
    }
  }
  
  // Helper method to update total quantity received
  static async updateTotalQuantityReceived(tenderId: string, itemMasterId: string) {
    try {
      // Calculate total received quantity from all visits (excluding soft deleted)
      const { data: visitsData, error: visitsError } = await supabase
        .from('tender_visits')
        .select('received_qty')
        .eq('tender_id', tenderId)
        .eq('item_master_id', itemMasterId)
        .eq('is_deleted', false);  // Exclude soft deleted visits
      
      if (visitsError) throw visitsError;
      
      const totalReceived = visitsData?.reduce((sum, visit) => sum + (visit.received_qty || 0), 0) || 0;
      
      // Update stock_transactions_clean
      const { error: updateError } = await supabase
        .from('stock_transactions_clean')
        .update({ 
          total_quantity_received: totalReceived,
          updated_at: new Date().toISOString()
        })
        .eq('tender_id', tenderId)
        .eq('item_master_id', itemMasterId);
      
      if (updateError) throw updateError;
      
    } catch (error) {
      
      // Don't throw here, as the visit was saved successfully
    }
  }
  
  // Delete a visit (soft delete)
  static async deleteVisit(tenderId: string, itemMasterId: string, visitNumber: number, deletedBy: string = 'system') {
    try {
      // Use soft delete instead of hard delete
      const { data, error } = await supabase
        .rpc('soft_delete_tender_visit', {
          p_tender_id: tenderId,
          p_item_master_id: itemMasterId,
          p_visit_number: visitNumber,
          p_deleted_by: deletedBy
        });
      
      if (error) throw error;
      
      // Update total quantity after soft delete
      await this.updateTotalQuantityReceived(tenderId, itemMasterId);
      
      return data;
    } catch (error) {
      
      throw error;
    }
  }
  
  // Restore a soft deleted visit
  static async restoreVisit(tenderId: string, itemMasterId: string, visitNumber: number) {
    try {
      const { data, error } = await supabase
        .rpc('restore_tender_visit', {
          p_tender_id: tenderId,
          p_item_master_id: itemMasterId,
          p_visit_number: visitNumber
        });
      
      if (error) throw error;
      
      // Update total quantity after restore
      await this.updateTotalQuantityReceived(tenderId, itemMasterId);
      
      return data;
    } catch (error) {
      
      throw error;
    }
  }
}

// 2. Stock Transactions Clean Service  
export class StockTransactionsCleanService {
  
  // Get pricing for all items in a tender (excluding soft deleted)
  static async getTenderPricing(tenderId: string) {
    const { data, error } = await supabase
      .from('stock_transactions_clean')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('is_deleted', false);  // Exclude soft deleted pricing records
    
    if (error) throw error;
    return data || [];
  }
  
  // Get deleted pricing for all items in a tender (only soft deleted)
  static async getDeletedTenderPricing(tenderId: string) {
    const { data, error } = await supabase
      .from('stock_transactions_clean')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('is_deleted', true);  // Only soft deleted pricing records
    
    if (error) throw error;
    return data || [];
  }
  
  // Update actual unit price (clean UPDATE - no new records!)
  static async updateActualPrice(tenderId: string, itemMasterId: string, actualUnitPrice: number) {
    try {
      // Ensure actualUnitPrice is never null (use 0 as default)
      const actualPrice = actualUnitPrice != null ? Number(actualUnitPrice) : 0;

      // First check if a pricing record exists
      const { data: existingRecord } = await supabase
        .from('stock_transactions_clean')
        .select('id')
        .eq('tender_id', tenderId)
        .eq('item_master_id', itemMasterId)
        .single();
      
      if (!existingRecord) {
        
        // Create a new pricing record if none exists
        const { data, error } = await supabase
          .from('stock_transactions_clean')
          .upsert({
            tender_id: tenderId,
            item_master_id: itemMasterId,
            estimated_unit_price: 0,
            actual_unit_price: actualPrice,
            total_quantity_received: 0,
            type: 'IN',
            pricing_confirmed: true
          }, {
            onConflict: 'tender_id,item_master_id'
          })
          .select();
        
        if (error) {
          
          throw error;
        }

        return data;
      } else {
        // Update existing record
        const { data, error } = await supabase
          .from('stock_transactions_clean')
          .update({ 
            actual_unit_price: actualPrice,
            pricing_confirmed: true,
            updated_at: new Date().toISOString()
          })
          .eq('tender_id', tenderId)
          .eq('item_master_id', itemMasterId)
          .select();
        
        if (error) {
          
          throw error;
        }

        return data;
      }
    } catch (error) {
      
      throw error;
    }
  }
  
  // Initialize pricing for tender items
  static async initializePricing(tenderId: string, items: Array<{
    item_master_id: string;
    estimated_unit_price: number;
  }>) {
    const results = [];
    
    for (const item of items) {
      try {
        // More robust null/undefined/NaN handling for estimated_unit_price
        let estimatedPrice = 0;
        if (item.estimated_unit_price != null && item.estimated_unit_price !== undefined) {
          const numPrice = Number(item.estimated_unit_price);
          estimatedPrice = isNaN(numPrice) ? 0 : numPrice;
        }
        
        // Ensure all required fields have valid values
        const upsertData = {
          tender_id: tenderId,
          item_master_id: item.item_master_id,
          estimated_unit_price: estimatedPrice,
          actual_unit_price: 0,
          total_quantity_received: 0,
          type: 'IN',
          pricing_confirmed: false
        };

        // Use direct UPSERT instead of function for better error handling
        const { data, error } = await supabase
          .from('stock_transactions_clean')
          .upsert(upsertData, {
            onConflict: 'tender_id,item_master_id'
          })
          .select();
        
        if (error) {
          
          // Continue with other items even if one fails
        } else {
          results.push(data);
        }
      } catch (error) {
        
      }
    }
    
    return results;
  }
  
  // Soft delete a pricing record
  static async deletePricing(tenderId: string, itemMasterId: string, deletedBy: string = 'system') {
    try {
      // Use direct SQL update instead of RPC to avoid UUID conversion issues
      const { data, error } = await supabase
        .from('stock_transactions_clean')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('tender_id', tenderId)
        .eq('item_master_id', itemMasterId)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      
      throw error;
    }
  }
  
  // Restore a soft deleted pricing record
  static async restorePricing(tenderId: string, itemMasterId: string) {
    try {
      // Use direct SQL update instead of RPC to avoid UUID conversion issues
      const { data, error } = await supabase
        .from('stock_transactions_clean')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null
        })
        .eq('tender_id', tenderId)
        .eq('item_master_id', itemMasterId)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      
      throw error;
    }
  }
}

// 3. Combined Tender Summary Service
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
// CUSTOM HOOK FOR CLEAN TENDER ACQUISITION
// ===============================================

export interface TenderVisit {
  id: string;
  tender_id: string;
  item_master_id: string;
  visit_number: number;
  received_qty: number;
  received_by: string;
  received_date: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  is_auto_generated?: boolean;
  source_delivery_id?: string;
}

export interface TenderPricing {
  id: string;
  tender_id: string;
  item_master_id: string;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  remarks?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export const useTenderAcquisitionClean = (tenderId: string) => {
  const [visits, setVisits] = useState<{[itemId: string]: TenderVisit[]}>({});
  const [pricing, setPricing] = useState<{[itemId: string]: TenderPricing}>({});
  const [deletedPricing, setDeletedPricing] = useState<{[itemId: string]: TenderPricing}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get active pricing data
      const pricingData = await StockTransactionsCleanService.getTenderPricing(tenderId);
      
      // Get deleted pricing data
      const deletedPricingData = await StockTransactionsCleanService.getDeletedTenderPricing(tenderId);
      
      // Transform pricing data
      const pricingMap: {[itemId: string]: TenderPricing} = {};
      for (const pricing of pricingData) {
        pricingMap[pricing.item_master_id] = pricing;
      }
      setPricing(pricingMap);
      
      // Transform deleted pricing data
      const deletedPricingMap: {[itemId: string]: TenderPricing} = {};
      for (const pricing of deletedPricingData) {
        deletedPricingMap[pricing.item_master_id] = pricing;
      }
      setDeletedPricing(deletedPricingMap);
      
      // Load visits for each active item
      const visitsMap: {[itemId: string]: TenderVisit[]} = {};
      for (const pricingItem of pricingData) {
        try {
          const itemVisits = await TenderVisitsService.getVisitsForItem(tenderId, pricingItem.item_master_id);
          visitsMap[pricingItem.item_master_id] = itemVisits;
        } catch (error) {
          
          visitsMap[pricingItem.item_master_id] = [];
        }
      }
      setVisits(visitsMap);
      
    } catch (error) {
      
      setError('Failed to load tender data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize pricing for tender items
  const initializePricing = async (items: Array<{
    item_master_id: string;
    estimated_unit_price: number;
  }>) => {
    try {
      await StockTransactionsCleanService.initializePricing(tenderId, items);
      await loadData(); // Reload data
    } catch (error) {
      
      setError('Failed to initialize pricing: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Update actual price (clean UPDATE - no duplicates!)
  const updateActualPrice = async (itemMasterId: string, newPrice: number) => {
    try {
      await StockTransactionsCleanService.updateActualPrice(tenderId, itemMasterId, newPrice);
      
      // Reload pricing data to get the updated record
      const pricingData = await StockTransactionsCleanService.getTenderPricing(tenderId);
      const updatedPricing = pricingData.find(p => p.item_master_id === itemMasterId);
      
      if (updatedPricing) {
        // Update local state with fresh data from database
        setPricing(prev => ({
          ...prev,
          [itemMasterId]: updatedPricing
        }));
      } else {
        // If no pricing found, create optimistic update
        setPricing(prev => ({
          ...prev,
          [itemMasterId]: {
            id: 'temp',
            tender_id: tenderId,
            item_master_id: itemMasterId,
            estimated_unit_price: 0,
            actual_unit_price: newPrice,
            total_quantity_received: 0,
            pricing_confirmed: true
          }
        }));
      }
      
    } catch (error) {
      
      setError('Failed to update price: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Save visit (clean upsert)
  const saveVisit = async (itemMasterId: string, visitData: Omit<TenderVisit, 'id' | 'created_at' | 'updated_at'>) => {
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
      
      // Also reload pricing to get updated totals
      const pricingData = await StockTransactionsCleanService.getTenderPricing(tenderId);
      const updatedPricing = pricingData.find(p => p.item_master_id === itemMasterId);
      if (updatedPricing) {
        setPricing(prev => ({
          ...prev,
          [itemMasterId]: updatedPricing
        }));
      }
      
    } catch (error) {
      
      setError('Failed to save visit: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Delete visit
  const deleteVisit = async (itemMasterId: string, visitNumber: number, deletedBy: string = 'user') => {
    try {
      await TenderVisitsService.deleteVisit(tenderId, itemMasterId, visitNumber, deletedBy);
      
      // Reload visits and pricing
      const updatedVisits = await TenderVisitsService.getVisitsForItem(tenderId, itemMasterId);
      setVisits(prev => ({
        ...prev,
        [itemMasterId]: updatedVisits
      }));
      
      // Reload pricing to get updated totals
      const pricingData = await StockTransactionsCleanService.getTenderPricing(tenderId);
      const updatedPricing = pricingData.find(p => p.item_master_id === itemMasterId);
      if (updatedPricing) {
        setPricing(prev => ({
          ...prev,
          [itemMasterId]: updatedPricing
        }));
      }
      
    } catch (error) {
      
      setError('Failed to delete visit: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Restore visit
  const restoreVisit = async (itemMasterId: string, visitNumber: number) => {
    try {
      await TenderVisitsService.restoreVisit(tenderId, itemMasterId, visitNumber);
      
      // Reload visits and pricing
      const updatedVisits = await TenderVisitsService.getVisitsForItem(tenderId, itemMasterId);
      setVisits(prev => ({
        ...prev,
        [itemMasterId]: updatedVisits
      }));
      
      // Reload pricing to get updated totals
      const pricingData = await StockTransactionsCleanService.getTenderPricing(tenderId);
      const updatedPricing = pricingData.find(p => p.item_master_id === itemMasterId);
      if (updatedPricing) {
        setPricing(prev => ({
          ...prev,
          [itemMasterId]: updatedPricing
        }));
      }
      
    } catch (error) {
      
      setError('Failed to restore visit: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Delete pricing
  const deletePricing = async (itemMasterId: string, deletedBy: string = 'user') => {
    try {
      await StockTransactionsCleanService.deletePricing(tenderId, itemMasterId, deletedBy);
      await loadData(); // Reload all data
    } catch (error) {
      
      setError('Failed to delete pricing: ' + (error as Error).message);
      throw error;
    }
  };
  
  // Restore pricing
  const restorePricing = async (itemMasterId: string) => {
    try {
      await StockTransactionsCleanService.restorePricing(tenderId, itemMasterId);
      await loadData(); // Reload all data
    } catch (error) {
      
      setError('Failed to restore pricing: ' + (error as Error).message);
      throw error;
    }
  };
  
  return {
    visits,
    pricing,
    deletedPricing,
    loading,
    error,
    loadData,
    initializePricing,
    updateActualPrice,
    saveVisit,
    deleteVisit,
    restoreVisit,
    deletePricing,
    restorePricing
  };
};
