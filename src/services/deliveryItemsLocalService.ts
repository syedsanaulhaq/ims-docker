import { ApiResponse } from './api';

const API_BASE_URL = 'http://localhost:3001/api';

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  unit?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  // Related data
  item_masters?: {
    id: string;
    nomenclature: string;
    specifications?: string;
    unit?: string;
    category_id?: string;
    sub_category_id?: string;
  };
}

export interface CreateDeliveryItemRequest {
  delivery_id: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  unit?: string;
  remarks?: string;
}

export interface UpdateDeliveryItemRequest {
  item_name?: string;
  delivery_qty?: number;
  unit?: string;
  remarks?: string;
}

// Local SQL Server delivery items service
export const deliveryItemsLocalService = {
  // Get all delivery items
  getDeliveryItems: async (): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery items fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery items:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch delivery items'
      };
    }
  },

  // Get delivery items by delivery ID
  getDeliveryItemsByDeliveryId: async (deliveryId: string): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items?delivery_id=${deliveryId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery items fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery items by delivery ID:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch delivery items'
      };
    }
  },

  // Get single delivery item by ID
  getDeliveryItem: async (id: string): Promise<ApiResponse<DeliveryItem>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery item fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery item:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch delivery item'
      };
    }
  },

  // Create delivery item
  createDeliveryItem: async (itemData: CreateDeliveryItemRequest): Promise<ApiResponse<DeliveryItem>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery item created successfully'
      };
    } catch (error: any) {
      console.error('Error creating delivery item:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create delivery item'
      };
    }
  },

  // Update delivery item
  updateDeliveryItem: async (id: string, itemData: UpdateDeliveryItemRequest): Promise<ApiResponse<DeliveryItem>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery item updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating delivery item:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update delivery item'
      };
    }
  },

  // Delete delivery item
  deleteDeliveryItem: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'Delivery item deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting delivery item:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete delivery item'
      };
    }
  },

  // Bulk create delivery items (for creating multiple items at once)
  bulkCreateDeliveryItems: async (items: CreateDeliveryItemRequest[]): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery items created successfully'
      };
    } catch (error: any) {
      console.error('Error bulk creating delivery items:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to create delivery items'
      };
    }
  },

  // Bulk update delivery items (for updating multiple items at once)
  bulkUpdateDeliveryItems: async (deliveryId: string, updates: Array<{
    id: string;
    delivery_qty?: number;
    item_name?: string;
    unit?: string;
    remarks?: string;
  }>): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delivery_id: deliveryId, updates }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery items updated successfully'
      };
    } catch (error: any) {
      console.error('Error bulk updating delivery items:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to update delivery items'
      };
    }
  },

  // Delete all delivery items for a delivery
  deleteByDeliveryId: async (deliveryId: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/delivery/${deliveryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'All delivery items deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting delivery items by delivery ID:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete delivery items'
      };
    }
  },

  // Get delivery items with item master details
  getDeliveryItemsWithDetails: async (deliveryId: string): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-items/${deliveryId}/with-details`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery items with details fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery items with details:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch delivery items with details'
      };
    }
  },

  // Initialize delivery items from stock transactions
  initializeFromStockTransactions: async (deliveryId: string, stockTransactionItems: Array<{
    item_master_id: string;
    nomenclature: string;
    total_quantity_received: number;
    unit?: string;
  }>): Promise<ApiResponse<DeliveryItem[]>> => {
    try {
      const deliveryItems: CreateDeliveryItemRequest[] = stockTransactionItems.map(item => ({
        delivery_id: deliveryId,
        item_master_id: item.item_master_id,
        item_name: item.nomenclature,
        delivery_qty: item.total_quantity_received || 0,
        unit: item.unit || '',
        remarks: 'Initialized from stock transactions'
      }));

      return await deliveryItemsLocalService.bulkCreateDeliveryItems(deliveryItems);
    } catch (error: any) {
      console.error('Error initializing delivery items from stock transactions:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to initialize delivery items'
      };
    }
  }
};

export default deliveryItemsLocalService;
