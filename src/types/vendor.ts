export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CreateVendorRequest {
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}
