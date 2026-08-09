import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TenderItem = Database["public"]["Tables"]["tender_items"]["Row"];

export const tenderItemsSupabaseService = {
  async update(id: string, payload: Partial<Omit<TenderItem, 'id'>>) {
    const { data, error } = await supabase
      .from('tender_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TenderItem;
  },
};
