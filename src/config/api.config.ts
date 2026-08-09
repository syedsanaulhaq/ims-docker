
// Supabase Direct Connection Configuration
// No API endpoints needed - using direct Supabase client

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

// Simplified config - only for fallback purposes
export const getApiConfig = (): ApiConfig => {
  return {
    baseUrl: 'https://euhthwosspivtzmqifsy.supabase.co', // Supabase URL
    timeout: 30000,
    retryAttempts: 3
  };
};

export const API_ENDPOINTS = {
  // Office Hierarchy - Using Supabase Edge Functions
  OFFICES: '/office-info',
  WINGS: '/wings',
  WINGS_BY_OFFICE: '/wings/office',
  DECS: '/decs',
  DECS_BY_WING: '/decs/wing',
  
  // Inventory - Now using Supabase Edge Functions
  INVENTORY_ITEMS: '/inventory-items',
  INVENTORY_STATS: '/inventory-stats',
  LOW_STOCK_ITEMS: '/inventory-items?filter=low-stock',
  
  // Vendors - Now using Supabase Edge Functions
  VENDORS: '/vendors',
  ACTIVE_VENDORS: '/vendors?status=active',
  
  // Categories - Now using Supabase Edge Functions
  CATEGORIES: '/categories',
  SUB_CATEGORIES: '/subcategories',
  
  // Locations - Using office-info for now
  LOCATIONS: '/office-info',
  
  // Transactions - Mock data for now (can be implemented later)
  TRANSACTIONS: '/transactions',
  STOCK_TRANSACTIONS: '/stock-transactions',
  STOCK_ISSUANCES: '/stock-issuances',
  
  // Item Masters - Now using dedicated item-master function
  ITEM_MASTERS: '/item-master',
  
  // Tenders - Mock data for now (can be implemented later)
  TENDERS: '/tenders',
  TENDER_STATS: '/tenders/stats',
  ACTIVE_TENDERS: '/tenders/active',
  CONTRACT_TENDERS: '/tenders/contract',
  SPOT_PURCHASES: '/tenders/spot-purchase',
  
  // Reports & Export
  EXPORT_INVENTORY: '/inventory-items/export',
  EXPORT_TRANSACTIONS: '/stock-transactions/export',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  DASHBOARD_STATS: '/inventory-stats'
} as const;
