import { ItemMaster, CreateItemMasterRequest } from '../types/tender';

// Use Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ITEM_MASTER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/item-master`;

export interface UpdateItemMasterRequest {
  id: string;
  itemCode: string;
  nomenclature: string;
  categoryId: string;
  subCategoryId: string;
  unit: string;
  specifications?: string;
  description?: string;
}

// Helper function to make requests to Supabase Edge Function
const fetchFromItemMasterFunction = async (path: string = '', options: RequestInit = {}) => {
  const url = `${ITEM_MASTER_FUNCTION_URL}${path}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

// Transform API response to ItemMaster format
const transformToItemMaster = (apiItem: any): ItemMaster => ({
  id: apiItem.id || apiItem.Id,
  itemCode: apiItem.itemCode || apiItem.ItemCode,
  nomenclature: apiItem.nomenclature || apiItem.Nomenclature,
  categoryId: apiItem.categoryId || apiItem.CategoryId,
  categoryName: apiItem.categoryName || apiItem.CategoryName,
  subCategoryId: apiItem.subCategoryId || apiItem.SubCategoryId,
  subCategoryName: apiItem.subCategoryName || apiItem.SubCategoryName,
  unit: apiItem.unit || apiItem.Unit,
  specifications: apiItem.specifications || apiItem.Specifications || '',
  description: apiItem.description || apiItem.Description || '',
  isActive: apiItem.isActive !== undefined ? apiItem.isActive : (apiItem.status === 'Active' || apiItem.Status === 'Active'),
  createdAt: apiItem.createdAt || apiItem.CreatedDate || apiItem.created_at,
  updatedAt: apiItem.updatedAt || apiItem.ModifiedDate || apiItem.updated_at,
});

export const itemMasterApi = {
  // Get all item masters
  getItemMasters: async (): Promise<ItemMaster[]> => {
    try {
      
      const data = await fetchFromItemMasterFunction();
      
      if (Array.isArray(data)) {
        return data.map(transformToItemMaster);
      }

      return [];
    } catch (error) {
      
      throw error;
    }
  },

  // Get specific item master by ID
  getItemMaster: async (id: string): Promise<ItemMaster> => {
    try {
      
      const data = await fetchFromItemMasterFunction(`/${id}`);
      return transformToItemMaster(data);
    } catch (error) {
      
      throw error;
    }
  },

  // Create new item master
  createItemMaster: async (itemData: CreateItemMasterRequest): Promise<ItemMaster> => {
    try {

      const data = await fetchFromItemMasterFunction('', {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
      
      return transformToItemMaster(data);
    } catch (error) {
      
      throw error;
    }
  },

  // Update existing item master
  updateItemMaster: async (itemData: UpdateItemMasterRequest): Promise<ItemMaster> => {
    try {

      const data = await fetchFromItemMasterFunction(`/${itemData.id}`, {
        method: 'PUT',
        body: JSON.stringify(itemData),
      });
      
      return transformToItemMaster(data);
    } catch (error) {
      
      throw error;
    }
  },

  // Delete item master
  deleteItemMaster: async (id: string): Promise<void> => {
    try {

      await fetchFromItemMasterFunction(`/${id}`, {
        method: 'DELETE',
      });

    } catch (error) {
      
      throw error;
    }
  },
};
