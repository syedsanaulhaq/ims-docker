import { supabase } from '@/integrations/supabase/client';

interface ItemSerialNumber {
  id: string;
  tender_item_id: string;
  serial_number: string;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
}

export const itemSerialNumbersSupabaseService = {
  async createMany(serials: Array<Omit<ItemSerialNumber, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('item_serial_numbers')
      .insert(serials)
      .select();
    if (error) throw error;
    return data as ItemSerialNumber[];
  },
  async create(payload: Omit<ItemSerialNumber, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('item_serial_numbers')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as ItemSerialNumber;
  },
  async getByTenderItemId(tender_item_id: string) {
    const { data, error } = await supabase
      .from('item_serial_numbers')
      .select('*')
      .eq('tender_item_id', tender_item_id);
    if (error) throw error;
    return data as ItemSerialNumber[];
  },
  async update(id: string, payload: Partial<Omit<ItemSerialNumber, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('item_serial_numbers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ItemSerialNumber;
  },
  async deleteByTenderItemId(tender_item_id: string) {
    const { error } = await supabase
      .from('item_serial_numbers')
      .delete()
      .eq('tender_item_id', tender_item_id);
    if (error) throw error;
    return true;
  },
  async delete(id: string) {
    const { error } = await supabase
      .from('item_serial_numbers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};
