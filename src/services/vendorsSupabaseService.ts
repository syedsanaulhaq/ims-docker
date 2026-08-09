import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './api';
import { Vendor } from '@/types/vendor';

export const vendorsSupabaseService = {
  // Get all vendors from Supabase
  getVendors: async (): Promise<ApiResponse<{ vendors: Vendor[] }>> => {
    try {
      
      const { data: vendorsData, error: vendorsError } = await (supabase as any)
        .from('vendors')
        .select('*')
        .limit(1000) // CRITICAL: Prevent memory overload
        .order('vendor_name');

      if (vendorsError) {
        
        throw new Error(`Failed to fetch vendors: ${vendorsError.message}`);
      }

      // Map snake_case DB fields to Vendor type
      const vendors: Vendor[] = (vendorsData || []).map((vendor: any) => ({
        id: vendor.id,
        vendor_code: vendor.vendor_code,
        vendor_name: vendor.vendor_name,
        contact_person: vendor.contact_person,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        city: vendor.city,
        country: vendor.country,
        tax_number: vendor.tax_number,
        status: vendor.status,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at,
      }));

      return {
        data: {
          vendors,
        },
        success: true,
        message: `Loaded ${vendors.length} vendors`
      };
    } catch (error) {
      
      return {
        data: {
          vendors: [],
        },
        success: false,
        message: `Error loading vendors: ${(error as Error).message}`
      };
    }
  },

  // Create vendor
  createVendor: async (vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Vendor>> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          vendor_code: vendor.vendor_code,
          vendor_name: vendor.vendor_name,
          contact_person: vendor.contact_person,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          city: vendor.city,
          country: vendor.country,
          tax_number: vendor.tax_number,
          status: vendor.status || 'Active',
        })
        .select()
        .single();
      if (error) {
        return { data: null as any, success: false, message: error.message };
      }
      const created: Vendor = {
        ...data,
        status: (data.status === 'Active' || data.status === 'Inactive' || data.status === 'Suspended') ? data.status : 'Active',
      };
      return { data: created, success: true, message: 'Vendor created successfully' };
    } catch (err: any) {
      return { data: null as any, success: false, message: err.message || 'Unexpected error creating vendor' };
    }
  },

  // Update vendor
  updateVendor: async (vendor: Vendor): Promise<ApiResponse<Vendor>> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update({
          vendor_code: vendor.vendor_code,
          vendor_name: vendor.vendor_name,
          contact_person: vendor.contact_person,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          city: vendor.city,
          country: vendor.country,
          tax_number: vendor.tax_number,
          status: vendor.status,
        })
        .eq('id', vendor.id)
        .select()
        .single();
      if (error) {
        return { data: null as any, success: false, message: error.message };
      }
      const updated: Vendor = {
        ...data,
        status: (data.status === 'Active' || data.status === 'Inactive' || data.status === 'Suspended') ? data.status : 'Active',
      };
      return { data: updated, success: true, message: 'Vendor updated successfully' };
    } catch (err: any) {
      return { data: null as any, success: false, message: err.message || 'Unexpected error updating vendor' };
    }
  },

  // Delete vendor
  deleteVendor: async (vendorId: string): Promise<ApiResponse<null>> => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);
      if (error) {
        return { data: null, success: false, message: error.message };
      }
      return { data: null, success: true, message: 'Vendor deleted successfully' };
    } catch (err: any) {
      return { data: null, success: false, message: err.message || 'Unexpected error deleting vendor' };
    }
  },
};
