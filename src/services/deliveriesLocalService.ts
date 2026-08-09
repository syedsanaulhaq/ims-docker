import { ApiResponse } from './api';
import { DeliveryRecord } from './deliveryService';

const API_BASE_URL = 'http://localhost:3001/api';

// Local SQL Server delivery service
export const deliveriesLocalService = {
  // Get all deliveries
  getAll: async (): Promise<ApiResponse<DeliveryRecord[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deliveries`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Transform the data to match frontend expectations
      const transformedData = rawData.map((delivery: any) => ({
        ...delivery,
        // Ensure proper field mapping
        delivery_items: delivery.delivery_items || [],
        is_finalized: delivery.is_finalized || false,
        finalized_at: delivery.finalized_at,
        finalized_by: delivery.finalized_by
      }));
      
      return {
        success: true,
        data: transformedData,
        message: 'Deliveries fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch deliveries'
      };
    }
  },

  // Get single delivery by ID
  getById: async (id: string): Promise<ApiResponse<DeliveryRecord>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deliveries/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Transform the data to match frontend expectations
      const transformedData = {
        ...rawData,
        delivery_items: rawData.delivery_items || [],
        is_finalized: rawData.is_finalized || false,
        finalized_at: rawData.finalized_at,
        finalized_by: rawData.finalized_by
      };
      
      return {
        success: true,
        data: transformedData,
        message: 'Delivery fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch delivery'
      };
    }
  },

  // Finalize delivery
  finalize: async (id: string, finalizedBy: string): Promise<ApiResponse<DeliveryRecord>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deliveries/${id}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: finalizedBy,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Delivery finalized successfully'
      };
    } catch (error: any) {
      console.error('Error finalizing delivery:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to finalize delivery'
      };
    }
  }
};
