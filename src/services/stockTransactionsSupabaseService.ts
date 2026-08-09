import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];

export const stockTransactionsSupabaseService = {
  async getAll() {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data as StockTransaction[];
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as StockTransaction;
  },
  async create(payload: Omit<StockTransaction, 'id'>) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as StockTransaction;
  },
  async update(id: string, payload: Partial<Omit<StockTransaction, 'id'>>) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as StockTransaction;
  },
  async delete(id: string) {
    const { error } = await supabase
      .from('stock_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  // Add more CRUD methods as needed
};
