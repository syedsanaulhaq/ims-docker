// Local stores service for SQL Server backend
const BASE_URL = 'http://localhost:3001/api';

export interface Store {
  id: string;
  store_name: string;
  description?: string;
  address?: string;
  office_id?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreRequest {
  store_name: string;
  description?: string;
  address?: string;
  office_id?: number;
}

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {
  active?: boolean;
}

export const storesLocalService = {
  async getAll(): Promise<Store[]> {
    const response = await fetch(`${BASE_URL}/stores`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stores: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<Store> {
    const response = await fetch(`${BASE_URL}/stores/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch store: ${response.statusText}`);
    }
    return response.json();
  },

  async create(store: CreateStoreRequest): Promise<Store> {
    const response = await fetch(`${BASE_URL}/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(store),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create store: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async update(id: string, store: UpdateStoreRequest): Promise<Store> {
    const response = await fetch(`${BASE_URL}/stores/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(store),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update store: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async remove(id: string): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/stores/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete store: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },
};
