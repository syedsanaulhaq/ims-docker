import { getApiBaseUrl } from './invmisApi';

export interface DirectIssuanceChildItem {
  id: string;
  direct_issuance_id: string;
  item_master_id: string;
  quantity_issued: number;
  item_status: 'pending' | 'received';
  nomenclature?: string;
  item_code?: string;
  group_number?: number | null;
  unit?: string;
  category_name?: string;
}

export interface DirectIssuanceItem {
  id: string;
  issuance_number: string;
  to_whom_issued_name: string;
  recipient_user_id?: string | null;
  recipient_branch_id?: string | null;
  recipient_wing_id?: number | null;
  item_master_id?: string | null;
  item_nomenclature?: string;
  item_unit?: string;
  item_group_number?: number;
  quantity_issued?: number;
  items_count?: number;
  total_quantity_issued?: number;
  items?: DirectIssuanceChildItem[];
  source_store_type: string;
  source_wing_id?: number | null;
  source_branch_id?: string | null;
  received_by_name: string;
  issued_by_user_id: string;
  issued_by_name?: string | null;
  issuer_full_name?: string | null;
  recipient_full_name?: string | null;
  category_name?: string | null;
  issuance_date: string;
  slip_status: 'slip_not_received' | 'slip_received';
  slip_proof_url?: string | null;
  slip_received_at?: string | null;
  slip_received_by?: string | null;
  reminder_count: number;
  last_reminder_sent_at?: string | null;
  escalated_to_designation?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  item_code: string;
  nomenclature: string;
  group_number: number | null;
  unit: string;
  category_id: string;
  category_name: string;
  available_quantity: number;
}

export interface EmployeeUser {
  Id: string;
  FullName: string;
  UserName: string;
  CNIC: string;
  Email?: string | null;
  DesignationName?: string | null;
  WingName?: string | null;
  DECName?: string | null;
  OfficeName?: string | null;
  wing_id?: number | null;
  branch_id?: string | number | null;
  Role?: string | null;
}

export interface DirectIssuancePayloadItem {
  item_master_id: string;
  quantity_issued: number;
}

export interface CreateDirectIssuancePayload {
  items?: DirectIssuancePayloadItem[];
  item_master_id?: string;
  quantity_issued?: number;
  to_whom_issued_name: string;
  received_by_name: string;
  recipient_user_id?: string;
  recipient_branch_id?: string;
  recipient_wing_id?: number;
  source_store_type?: string;
  source_wing_id?: number;
  notes?: string;
}

const API_BASE = () => getApiBaseUrl();

export const directIssuanceService = {
  async getDirectIssuances(params?: {
    status?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{ success: boolean; data: DirectIssuanceItem[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.from_date) query.append('from_date', params.from_date);
    if (params?.to_date) query.append('to_date', params.to_date);

    const url = `${API_BASE()}/direct-issuance${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch direct issuances');
    }
    return res.json();
  },

  async getItemsCatalog(): Promise<{ success: boolean; data: CatalogItem[]; count: number }> {
    const url = `${API_BASE()}/direct-issuance/items`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch items catalog');
    }
    return res.json();
  },

  async getEmployees(): Promise<{ success: boolean; data: EmployeeUser[]; count: number }> {
    const url = `${API_BASE()}/direct-issuance/users`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch employees');
    }
    return res.json();
  },

  async createDirectIssuance(payload: CreateDirectIssuancePayload): Promise<{ success: boolean; message: string; data: DirectIssuanceItem }> {
    const res = await fetch(`${API_BASE()}/direct-issuance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create direct issuance');
    }
    return data;
  },

  async uploadReceivingSlip(id: string, file: File): Promise<{ success: boolean; message: string; data: DirectIssuanceItem }> {
    const formData = new FormData();
    formData.append('slip_proof', file);

    const res = await fetch(`${API_BASE()}/direct-issuance/${id}/upload-slip`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload receiving slip');
    }
    return data;
  },

  async sendReminder(id: string, targetDesignation = 'DD Admin'): Promise<{ success: boolean; message: string; data: DirectIssuanceItem }> {
    const res = await fetch(`${API_BASE()}/direct-issuance/${id}/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target_designation: targetDesignation })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send reminder');
    }
    return data;
  }
};
