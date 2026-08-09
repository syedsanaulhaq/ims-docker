// Mock Supabase client - prevents import errors when removing Supabase
export const supabase = {
  from: () => ({
    select: () => ({ error: new Error('Supabase disabled - use SQL Server backend') }),
    insert: () => ({ error: new Error('Supabase disabled - use SQL Server backend') }),
    update: () => ({ error: new Error('Supabase disabled - use SQL Server backend') }),
    delete: () => ({ error: new Error('Supabase disabled - use SQL Server backend') })
  }),
  rpc: () => ({ error: new Error('Supabase disabled - use SQL Server backend') }),
  auth: {
    getUser: () => ({ error: new Error('Supabase disabled - use SQL Server backend') })
  }
};

export default supabase;
