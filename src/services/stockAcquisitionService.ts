// Stock Acquisition Service - Unified API
// This service handles all stock acquisition operations using the unified backend API

const API_BASE_URL = 'http://localhost:5000/api';

export interface Delivery {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes: string;
  delivery_chalan: string;
  chalan_file_path?: string;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  tender_reference?: string;
  tender_title?: string;
  tender_is_finalized?: boolean; // Tender's is_finalized field for finalization logic
}

export interface AcquisitionItem {
  id: string;
  item_master_id: string;
  nomenclature: string;
  specifications: string;
  unit: string;
  tender_qty: number;
  received_qty: number;
  pending_qty: number;
  overall_status: 'pending' | 'partial' | 'completed';
  visits?: DeliveryVisit[];
}

export interface DeliveryVisit {
  id: string;
  delivery_id: string;
  item_master_id: string;
  received_qty: number;
  received_by?: string;
  received_date?: string;
  delivery_notes?: string;
  delivery_status: 'pending' | 'partial' | 'completed' | 'cancelled';
}

class StockAcquisitionService {
  // Get acquisition details by tender ID
  async getAcquisitionByTenderId(tenderId: string): Promise<Delivery[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const deliveries: Delivery[] = await response.json();
      
      // Filter by tender_id
      return deliveries.filter(d => d.tender_id === tenderId);
    } catch (error) {
      console.error('Error fetching acquisitions:', error);
      throw error;
    }
  }

  // Get single acquisition/delivery by ID
  async getAcquisitionById(deliveryId: string): Promise<Delivery> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching acquisition:', error);
      throw error;
    }
  }

  // Create new acquisition/delivery
  async createAcquisition(acquisitionData: Partial<Delivery>): Promise<Delivery> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acquisitionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating acquisition:', error);
      throw error;
    }
  }

  // Update acquisition/delivery
  async updateAcquisition(deliveryId: string, updateData: Partial<Delivery>): Promise<Delivery> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.reason === 'tender_finalized') {
          throw new Error('Cannot update acquisition - the tender has been finalized');
        }
        if (errorData.reason === 'delivery_finalized') {
          throw new Error('Cannot update acquisition - the delivery has been finalized');
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating acquisition:', error);
      throw error;
    }
  }

  // FINALIZE ACQUISITION - Lock from further edits
  async finalizeAcquisition(deliveryId: string, finalizedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ finalizedBy }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.reason === 'tender_finalized') {
          throw new Error('Cannot finalize delivery - the tender has already been finalized');
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error finalizing acquisition:', error);
      throw error;
    }
  }

  // Delete acquisition/delivery
  async deleteAcquisition(deliveryId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.reason === 'tender_finalized') {
          throw new Error('Cannot delete acquisition - the tender has been finalized');
        }
        if (errorData.reason === 'delivery_finalized') {
          throw new Error('Cannot delete acquisition - the delivery has been finalized');
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting acquisition:', error);
      throw error;
    }
  }

  // Check if acquisition is finalized (read-only) - now checks tender is_finalized
  isFinalized(acquisition: Delivery): boolean {
    // Check tender is_finalized first - if tender is finalized, acquisition is read-only
    if (acquisition.tender_is_finalized === true) {
      return true;
    }
    // Fallback to delivery's own finalization status
    return acquisition.is_finalized || false;
  }

  // Get finalization info - now includes tender is_finalized
  getFinalizationInfo(acquisition: Delivery): {
    isFinalized: boolean;
    finalizedAt?: string;
    finalizedBy?: string;
    reason: 'tender' | 'delivery' | 'none';
  } {
    if (acquisition.tender_is_finalized === true) {
      return {
        isFinalized: true,
        reason: 'tender',
      };
    }
    if (acquisition.is_finalized) {
      return {
        isFinalized: true,
        finalizedAt: acquisition.finalized_at,
        finalizedBy: acquisition.finalized_by,
        reason: 'delivery',
      };
    }
    return {
      isFinalized: false,
      reason: 'none',
    };
  }
}

// Export singleton instance
export const stockAcquisitionService = new StockAcquisitionService();

// Export service class for dependency injection if needed
export default StockAcquisitionService;
