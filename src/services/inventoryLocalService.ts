// Local inventory service for SQL Server backend
import { getApiBaseUrl } from './invmisApi';

const getBaseUrl = () => `${getApiBaseUrl()}/inventory`;

export interface InventoryItem {
  intOfficeID: string;
  intItemMasterID: string;
  intVendorID?: string;
  intStoreID?: string;
  intCurrentStock: number;
  intMinimumLevel: number;
  intMaximumLevel: number;
  intReorderLevel: number;
  intReorderQuantity: number;
  fltUnitPrice: number;
  fltTotalValue: number;
  dtLastUpdated: string;
  strStockLocation?: string;
  strBatchNumber?: string;
  dtExpiryDate?: string;
  strSerialNumbers?: string;
  strRemarks?: string;
  boolActive: boolean;
  boolDeleted: boolean;
  // Related data
  item_masters?: {
    id: string;
    nomenclature: string;
    unit: string;
    categories?: { id: string; category_name: string };
    sub_categories?: { id: string; sub_category_name: string };
  };
  stores?: { id: string; store_name: string };
  vendors?: { id: string; vendor_name: string };
}

export interface CreateInventoryItem {
  intOfficeID: string;
  intItemMasterID: string;
  intVendorID?: string;
  intStoreID?: string;
  intCurrentStock: number;
  intMinimumLevel: number;
  intMaximumLevel: number;
  intReorderLevel: number;
  intReorderQuantity: number;
  fltUnitPrice: number;
  fltTotalValue: number;
  strStockLocation?: string;
  strBatchNumber?: string;
  dtExpiryDate?: string;
  strSerialNumbers?: string;
  strRemarks?: string;
}

export interface UpdateInventoryItem extends Partial<CreateInventoryItem> {}

export const inventoryLocalService = {
  async getAll(): Promise<InventoryItem[]> {
    try {
      let response = await fetch(`${getBaseUrl()}/current-stock`, {
        credentials: 'include'
      });

      // Scoped users (personal/wing/branch) are blocked from central current-stock.
      // For request forms, fall back to a limited catalog endpoint.
      if (response.status === 403) {
        response = await fetch(`${getBaseUrl()}/requestable-items`, {
          credentials: 'include'
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }
      const data = await response.json();
      // Return the inventory array from the response structure
      return data.inventory || data.data || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },

  // Always fetch the full requestable item catalog (all active item_masters).
  // Use this for request forms so users can request any active item, not only
  // items that currently happen to have a current_inventory_stock row.
  async getRequestableItems(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/requestable-items`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requestable items: ${response.statusText}`);
      }
      const data = await response.json();
      return data.inventory || data.data || [];
    } catch (error) {
      console.error('Error fetching requestable items:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/current-stock/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory item: ${response.statusText}`);
    }
    return response.json();
  },

  async getByOffice(officeId: string): Promise<InventoryItem[]> {
    const response = await fetch(`${getBaseUrl()}/current-stock?officeId=${officeId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch office inventory: ${response.statusText}`);
    }
    const data = await response.json();
    return data.inventory || data.data || [];
  },

  async create(item: CreateInventoryItem): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/current-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create inventory item: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async update(id: string, item: UpdateInventoryItem): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/current-stock/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update inventory item: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async remove(id: string): Promise<boolean> {
    const response = await fetch(`${getBaseUrl()}/current-stock/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete inventory item: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },

  async addTransaction(id: string, transaction: {
    transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reference_type?: string;
    reference_id?: string;
    remarks?: string;
  }): Promise<any> {
    const response = await fetch(`${getBaseUrl()}/current-stock/${id}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to add inventory transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Legacy compatibility methods for existing code
  async getOffices(): Promise<any[]> {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/offices`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch offices: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.offices || data?.data || []);
  },
};
