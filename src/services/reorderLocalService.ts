// Local reorder requests service for SQL Server backend
const BASE_URL = 'http://localhost:3001/api';

export interface ReorderRequest {
  id: string;
  item_master_id: string;
  office_id: string;
  current_stock: number;
  minimum_level: number;
  reorder_level: number;
  suggested_quantity: number;
  actual_quantity?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReorderRequest {
  item_master_id: string;
  office_id: string;
  current_stock: number;
  minimum_level: number;
  reorder_level: number;
  suggested_quantity: number;
  actual_quantity?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requested_by: string;
  remarks?: string;
}

export interface UpdateReorderRequest extends Partial<CreateReorderRequest> {
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approved_by?: string;
  approved_at?: string;
}

export const reorderLocalService = {
  async getAll(): Promise<ReorderRequest[]> {
    const response = await fetch(`${BASE_URL}/reorder-requests`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reorder requests: ${response.statusText}`);
    }
    return response.json();
  },

  async getPending(): Promise<ReorderRequest[]> {
    const response = await fetch(`${BASE_URL}/reorder-requests?status=Pending`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pending reorder requests: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<ReorderRequest> {
    const response = await fetch(`${BASE_URL}/reorder-requests/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reorder request: ${response.statusText}`);
    }
    return response.json();
  },

  async create(item: CreateReorderRequest): Promise<ReorderRequest> {
    const response = await fetch(`${BASE_URL}/reorder-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create reorder request: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async update(id: string, item: UpdateReorderRequest): Promise<ReorderRequest> {
    const response = await fetch(`${BASE_URL}/reorder-requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update reorder request: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async remove(id: string): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/reorder-requests/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete reorder request: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },

  async approve(id: string, approvedBy: string, actualQuantity?: number): Promise<ReorderRequest> {
    return this.update(id, {
      status: 'Approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      actual_quantity: actualQuantity,
    });
  },

  async reject(id: string, approvedBy: string, remarks?: string): Promise<ReorderRequest> {
    return this.update(id, {
      status: 'Rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      remarks: remarks,
    });
  },

  async complete(id: string): Promise<ReorderRequest> {
    return this.update(id, {
      status: 'Completed',
    });
  },
};
