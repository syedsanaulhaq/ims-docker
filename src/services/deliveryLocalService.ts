// Unified Delivery/Acquisition Service using SQL Server backend
// Replaces Supabase-based delivery service

const API_BASE_URL = 'http://localhost:3001/api';

export interface DeliveryItem {
  id?: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
}

export interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_items?: DeliveryItem[];
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  created_at: string;
  updated_at: string;
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
  tender_reference?: string;
  tender_title?: string;
}

export class DeliveryLocalService {
  
  /**
   * Get all deliveries
   */
  static async getAll(): Promise<DeliveryRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const deliveries = await response.json();
      return deliveries;
    } catch (error) {
      console.error('❌ Error fetching deliveries:', error);
      throw error;
    }
  }

  /**
   * Get deliveries for a specific tender
   */
  static async getByTenderId(tenderId: string): Promise<DeliveryRecord[]> {
    try {
      const allDeliveries = await this.getAll();
      const tenderDeliveries = allDeliveries.filter(d => d.tender_id === tenderId);
      return tenderDeliveries;
    } catch (error) {
      console.error('❌ Error fetching tender deliveries:', error);
      throw error;
    }
  }

  /**
   * Get single delivery by ID
   */
  static async getById(id: string): Promise<DeliveryRecord> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Delivery not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const delivery = await response.json();
      return delivery;
    } catch (error) {
      console.error('❌ Error fetching delivery:', error);
      throw error;
    }
  }

  /**
   * Create new delivery
   */
  static async create(deliveryData: Omit<DeliveryRecord, 'id' | 'created_at' | 'updated_at'>): Promise<DeliveryRecord> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error creating delivery:', error);
      throw error;
    }
  }

  /**
   * Update delivery
   */
  static async update(id: string, deliveryData: Partial<DeliveryRecord>): Promise<DeliveryRecord> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error updating delivery:', error);
      throw error;
    }
  }

  /**
   * Delete delivery
   */
  static async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      } catch (error) {
      console.error('❌ Error deleting delivery:', error);
      throw error;
    }
  }

  /**
   * Finalize delivery/acquisition - prevents further edits
   */
  static async finalize(id: string, finalizedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${id}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ finalizedBy }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error finalizing acquisition:', error);
      throw error;
    }
  }

  /**
   * Check if delivery is finalized
   */
  static async isFinalized(id: string): Promise<boolean> {
    try {
      const delivery = await this.getById(id);
      return delivery.is_finalized || false;
    } catch (error) {
      console.error('❌ Error checking finalization status:', error);
      return false;
    }
  }
}

export default DeliveryLocalService;
