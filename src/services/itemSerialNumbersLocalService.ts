import { ApiResponse } from './api';

const API_BASE_URL = 'http://localhost:5000';

// Interface for item serial numbers
export interface ItemSerialNumber {
  id: string;
  tender_item_id: string;
  serial_number: string;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
}

export interface CreateSerialNumberRequest {
  tender_item_id: string;
  serial_number: string;
  status?: string | null;
  remarks?: string | null;
}

export interface UpdateSerialNumberRequest {
  serial_number?: string;
  status?: string | null;
  remarks?: string | null;
}

// Local SQL Server item serial numbers service
export const itemSerialNumbersLocalService = {
  // Get all serial numbers by tender item ID
  getByTenderItemId: async (tenderItemId: string): Promise<ItemSerialNumber[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers/tender-item/${tenderItemId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching serial numbers:', error);
      throw new Error(error.message || 'Failed to fetch serial numbers');
    }
  },

  // Create single serial number
  create: async (serialNumber: CreateSerialNumberRequest): Promise<ItemSerialNumber> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serialNumber),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Return the created serial number with the ID
      return {
        id: result.id,
        ...serialNumber,
        created_at: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error creating serial number:', error);
      throw new Error(error.message || 'Failed to create serial number');
    }
  },

  // Create multiple serial numbers
  createMany: async (serialNumbers: CreateSerialNumberRequest[]): Promise<ItemSerialNumber[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serials: serialNumbers }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Return the created serial numbers with generated IDs
      return serialNumbers.map((serialNumber, index) => ({
        id: result.ids[index],
        ...serialNumber,
        created_at: new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('Error creating serial numbers in bulk:', error);
      throw new Error(error.message || 'Failed to create serial numbers');
    }
  },

  // Update serial number
  update: async (id: string, serialNumber: UpdateSerialNumberRequest): Promise<ItemSerialNumber> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serialNumber),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Return updated serial number with the new data
      // Note: In a real implementation, you might want to fetch the complete updated record
      return {
        id,
        tender_item_id: '', // This would need to be provided or fetched separately
        serial_number: serialNumber.serial_number || '',
        status: serialNumber.status,
        remarks: serialNumber.remarks,
        created_at: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error updating serial number:', error);
      throw new Error(error.message || 'Failed to update serial number');
    }
  },

  // Delete serial number by ID
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error deleting serial number:', error);
      throw new Error(error.message || 'Failed to delete serial number');
    }
  },

  // Delete all serial numbers by tender item ID
  deleteByTenderItemId: async (tenderItemId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/item-serial-numbers/tender-item/${tenderItemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error deleting serial numbers by tender item ID:', error);
      throw new Error(error.message || 'Failed to delete serial numbers');
    }
  }
};
