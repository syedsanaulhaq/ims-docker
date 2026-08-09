import { supabase } from '@/integrations/supabase/client';

export interface DeliveryItem {
  id?: string; // Optional for backward compatibility, should be present with updated RPC
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
}

export interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_items: DeliveryItem[];
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  created_at: string;
  updated_at: string;
  // Finalization fields
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
}

export class DeliveryService {
  
  /**
   * Get all deliveries for a tender - direct query approach (fallback)
   */
  static async getDeliveriesFromDatabase(tenderId: string): Promise<DeliveryRecord[]> {
    try {
      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_tender_deliveries', {
        p_tender_id: tenderId
      });

      if (rpcError) {// Fallback to direct query
        const { data: deliveries, error: directError } = await supabase
          .from('deliveries')
          .select(`
            id,
            delivery_number,
            tender_id,
            delivery_personnel,
            delivery_date,
            delivery_notes,
            delivery_chalan,
            chalan_file_path,
            created_at,
            updated_at
          `)
          .eq('tender_id', tenderId)
          .order('delivery_number', { ascending: false });
          
        if (directError) {return [];
        }
        
        if (!deliveries || deliveries.length === 0) {
          return [];
        }
        
        // Get delivery items for each delivery
        const deliveriesWithItems = await Promise.all(
          deliveries.map(async (delivery) => {
            const { data: items, error: itemsError } = await supabase
              .from('delivery_items')
              .select(`
                id,
                item_master_id,
                item_name,
                delivery_qty,
                created_at
              `)
              .eq('delivery_id', delivery.id);
              
            if (itemsError) {return { ...delivery, delivery_items: [] };
            }
            
            return { ...delivery, delivery_items: items || [] };
          })
        );
        
        return deliveriesWithItems;
      }

      return rpcData || [];
    } catch (error) {return [];
    }
  }

  /**
   * Create delivery using database function
   */
  static async createDeliveryInDatabase(request: {
    tender_id: string;
    delivery_personnel: string;
    delivery_date: string;
    delivery_notes?: string;
    delivery_chalan?: string;
    chalan_file_path?: string;
    delivery_items: DeliveryItem[];
  }): Promise<DeliveryRecord> {
    try {
      // Use direct database inserts instead of RPC function
      // First, get the next delivery number
      const { data: maxDeliveryData, error: maxError } = await supabase
        .from('deliveries')
        .select('delivery_number')
        .eq('tender_id', request.tender_id)
        .order('delivery_number', { ascending: false })
        .limit(1);
        
      if (maxError) {
        throw new Error(`Failed to get delivery number: ${maxError.message}`);
      }
      
      const nextDeliveryNumber = (maxDeliveryData?.[0]?.delivery_number || 0) + 1;
      
      // Insert the delivery record
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          delivery_number: nextDeliveryNumber,
          tender_id: request.tender_id,
          delivery_personnel: request.delivery_personnel,
          delivery_date: request.delivery_date,
          delivery_notes: request.delivery_notes || null,
          delivery_chalan: request.delivery_chalan || null,
          chalan_file_path: request.chalan_file_path || null
        })
        .select()
        .single();
        
      if (deliveryError) {
        throw new Error(`Failed to create delivery: ${deliveryError.message}`);
      }
      
      // Insert delivery items
      const deliveryItemsToInsert = request.delivery_items.map(item => ({
        delivery_id: deliveryData.id,
        item_master_id: item.item_master_id,
        item_name: item.item_name,
        delivery_qty: item.delivery_qty
      }));
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_items')
        .insert(deliveryItemsToInsert)
        .select();
        
      if (itemsError) {
        throw new Error(`Failed to create delivery items: ${itemsError.message}`);
      }
      
      // Return the complete delivery record
      const result: DeliveryRecord = {
        ...deliveryData,
        delivery_items: itemsData || []
      };
      
      return result;
      
    } catch (error) {throw error;
    }
  }

  /**
   * Get specific delivery by ID using database function
   */
  static async getDeliveryFromDatabaseById(deliveryId: string): Promise<DeliveryRecord | null> {
    try {
      const { data, error } = await supabase.rpc('get_delivery_by_id', {
        p_delivery_id: deliveryId
      });

      if (error) {return null;
      }

      return data;
    } catch (error) {return null;
    }
  }
}
