import { supabase } from '@/integrations/supabase/client';

// Run the migration to modify tenders table structure
const runMigration = async () => {
  try {

    // Step 1: Drop foreign key constraints
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_office_id_fkey' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_wing_id_fkey' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_dec_id_fkey' 
    });
    
    // Step 2: Drop existing columns
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP COLUMN IF EXISTS office_id' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP COLUMN IF EXISTS wing_id' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders DROP COLUMN IF EXISTS dec_id' 
    });
    
    // Step 3: Add array columns
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders ADD COLUMN office_ids INTEGER[]' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders ADD COLUMN wing_ids INTEGER[]' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.tenders ADD COLUMN dec_ids INTEGER[]' 
    });

  } catch (error) {
    
  }
};

// Execute migration
runMigration();
