import { ApiResponse } from './api';
import { ItemMaster, CreateItemMasterRequest } from '@/types/tender';

const API_BASE_URL = 'http://localhost:5000';

// Local SQL Server item master service
export const itemMasterLocalService = {
  // Get all item masters
  getItemMasters: async (): Promise<ApiResponse<ItemMaster[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-masters`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Item masters fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching item masters:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch item masters'
      };
    }
  },

  // Get single item master by ID
  getItemMaster: async (id: string): Promise<ApiResponse<ItemMaster>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-masters/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Item master fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching item master:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch item master'
      };
    }
  },

  // Create item master
  createItemMaster: async (itemData: CreateItemMasterRequest): Promise<ApiResponse<ItemMaster>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-masters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Item master created successfully'
      };
    } catch (error: any) {
      console.error('Error creating item master:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create item master'
      };
    }
  },

  // Update item master
  updateItemMaster: async (id: string, itemData: Partial<CreateItemMasterRequest>): Promise<ApiResponse<ItemMaster>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-masters/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Item master updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating item master:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update item master'
      };
    }
  },

  // Delete item master
  deleteItemMaster: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-masters/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'Item master deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting item master:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete item master'
      };
    }
  },
};
