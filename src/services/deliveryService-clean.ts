import { supabase } from '@/lib/supabase';

// Define interfaces
export interface DeliveryItem {
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
}

export interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  delivery_items: DeliveryItem[];
  created_at: string;
  updated_at: string;
}

export class DeliveryService {
  /**
   * Get all deliveries for a tender using database function
   */
  static async getDeliveriesFromDatabase(tenderId: string): Promise<DeliveryRecord[]> {
    try {
      const { data, error } = await supabase.rpc('get_tender_deliveries', {
        p_tender_id: tenderId
      });

      if (error) {return [];
      }

      return data || [];
    } catch (error) {return [];
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
      const { data, error } = await supabase.rpc('save_delivery_with_items', {
        p_tender_id: request.tender_id,
        p_delivery_personnel: request.delivery_personnel,
        p_delivery_items: request.delivery_items,
        p_delivery_date: request.delivery_date,
        p_delivery_notes: request.delivery_notes || null,
        p_delivery_chalan: request.delivery_chalan || null,
        p_chalan_file_path: request.chalan_file_path || null
      });

      if (error) {
        throw new Error(`Failed to create delivery: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to create delivery');
      }

      // Get the created delivery
      const createdDelivery = await this.getDeliveryFromDatabaseById(data.delivery_id);
      
      if (!createdDelivery) {
        throw new Error('Failed to retrieve created delivery');
      }
      
      return createdDelivery;
    } catch (error) {throw error;
    }
  }
}
