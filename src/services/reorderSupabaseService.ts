import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Use generated Supabase types for reorder_requests
type ReorderRequest = Database['public']['Tables']['reorder_requests']['Row'];
type InsertReorderRequest = Database['public']['Tables']['reorder_requests']['Insert'];
type UpdateReorderRequest = Database['public']['Tables']['reorder_requests']['Update'];
const TABLE = 'reorder_requests';

export const reorderSupabaseService = {
  async getAll() {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return data as ReorderRequest[];
  },

  async getPending() {
    const { data, error } = await supabase.from(TABLE).select('*').eq('status', 'Pending');
    if (error) throw error;
    return data as ReorderRequest[];
  },

  async getById(id: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data as ReorderRequest;
  },

  async create(item: InsertReorderRequest) {
    const { data, error } = await supabase.from(TABLE).insert(item).select().single();
    if (error) throw error;
    return data as ReorderRequest;
  },

  async update(id: string, item: UpdateReorderRequest) {
    const { data, error } = await supabase.from(TABLE).update(item).eq('id', id).select().single();
    if (error) throw error;
    return data as ReorderRequest;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
