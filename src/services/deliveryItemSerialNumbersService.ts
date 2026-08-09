import { supabase } from '@/integrations/supabase/client';

export interface DeliveryItemSerialNumber {
  id: string;
  delivery_item_id: string;
  delivery_id: string;
  item_master_id: string;
  serial_number: string;
  notes?: string | null;
  created_at?: string | null;
}

export const deliveryItemSerialNumbersService = {
  async createMany(serials: Array<Omit<DeliveryItemSerialNumber, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .insert(serials)
      .select();
    if (error) throw error;
    return data as DeliveryItemSerialNumber[];
  },

  async create(payload: Omit<DeliveryItemSerialNumber, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as DeliveryItemSerialNumber;
  },

  async getByDeliveryItemId(delivery_item_id: string) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .select('*')
      .eq('delivery_item_id', delivery_item_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as DeliveryItemSerialNumber[];
  },

  async getByDeliveryId(delivery_id: string) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .select('*')
      .eq('delivery_id', delivery_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as DeliveryItemSerialNumber[];
  },

  async getByItemMasterId(item_master_id: string) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .select('*')
      .eq('item_master_id', item_master_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as DeliveryItemSerialNumber[];
  },

  async update(id: string, payload: Partial<Omit<DeliveryItemSerialNumber, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('delivery_item_serial_numbers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as DeliveryItemSerialNumber;
  },

  async deleteByDeliveryItemId(delivery_item_id: string) {
    const { error } = await supabase
      .from('delivery_item_serial_numbers')
      .delete()
      .eq('delivery_item_id', delivery_item_id);
    if (error) throw error;
  },

  async deleteByDeliveryId(delivery_id: string) {
    const { error } = await supabase
      .from('delivery_item_serial_numbers')
      .delete()
      .eq('delivery_id', delivery_id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('delivery_item_serial_numbers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
