import { ItemMaster, CreateItemMasterRequest } from '../types/tender';
import { invmisApi, type Item } from './invmisApi';

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

// Transform InvMIS API Item response to ItemMaster format
const transformToItemMaster = (apiItem: Item): ItemMaster => ({
  id: apiItem.item_id.toString(),
  itemCode: apiItem.item_code,
  nomenclature: apiItem.item_name,
  categoryId: apiItem.category_id,
  categoryName: apiItem.category_name,
  subCategoryId: apiItem.sub_category_id,
  subCategoryName: apiItem.sub_category_name,
  unit: apiItem.unit_of_measure,
  specifications: apiItem.description || '',
  description: apiItem.description || '',
  isActive: apiItem.is_active,
  createdAt: apiItem.created_at,
  updatedAt: apiItem.created_at, // InvMIS doesn't have updated_at yet
});

export const itemMasterApi = {
  // Get all item masters
  getItemMasters: async (): Promise<ItemMaster[]> => {
    try {
      const response = await invmisApi.items.getAll();
      
      if (response.success && Array.isArray(response.items)) {
        return response.items.map(transformToItemMaster);
      }

      return [];
    } catch (error) {
      console.error('Error fetching item masters:', error);
      throw error;
    }
  },

  // Get specific item master by ID
  getItemMaster: async (id: string): Promise<ItemMaster> => {
    try {
      // TODO: Need to add getById endpoint to InvMIS API
      const response = await invmisApi.items.getAll();
      const item = response.success 
        ? response.items.find(item => item.item_id.toString() === id)
        : null;
      
      if (!item) {
        throw new Error(`Item with ID ${id} not found`);
      }
      
      return transformToItemMaster(item);
    } catch (error) {
      console.error('Error fetching item master:', error);
      throw error;
    }
  },

  // Create new item master
  createItemMaster: async (itemData: CreateItemMasterRequest): Promise<ItemMaster> => {
    try {
      // TODO: Implement create endpoint in InvMIS API backend
      throw new Error('Create item master not yet implemented in InvMIS API');
    } catch (error) {
      console.error('Error creating item master:', error);
      throw error;
    }
  },

  // Update existing item master
  updateItemMaster: async (itemData: UpdateItemMasterRequest): Promise<ItemMaster> => {
    try {
      // TODO: Implement update endpoint in InvMIS API backend
      throw new Error('Update item master not yet implemented in InvMIS API');
    } catch (error) {
      console.error('Error updating item master:', error);
      throw error;
    }
  },

  // Delete item master
  deleteItemMaster: async (id: string): Promise<void> => {
    try {
      // TODO: Implement delete endpoint in InvMIS API backend
      throw new Error('Delete item master not yet implemented in InvMIS API');
    } catch (error) {
      console.error('Error deleting item master:', error);
      throw error;
    }
  },
};
