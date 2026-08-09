// src/hooks/useVendors.ts
import { useCallback, useEffect, useState } from 'react';
import { vendorsApi } from '../services/vendorsApi';
import { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../types/vendor';

export function useVendors(includeDeleted = false) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorsApi.getVendors(includeDeleted);
      setVendors(res.data.vendors || res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [includeDeleted]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const createVendor = async (payload: CreateVendorRequest) => {
    setLoading(true);
    setError(null);
    try {
      // Ensure status is set (Supabase service expects it)
      const fullPayload = { ...payload, status: payload.status || 'Active' };
      await vendorsApi.createVendor(fullPayload);
      await fetchVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to create vendor');
    } finally {
      setLoading(false);
    }
  };

  const updateVendor = async (id: string, payload: UpdateVendorRequest) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the existing vendor to fill required fields
      const existing = vendors.find(v => v.id === id);
      if (!existing) throw new Error('Vendor not found');
      const merged = { ...existing, ...payload, id };
      await vendorsApi.updateVendor(merged);
      await fetchVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor');
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await vendorsApi.deleteVendor(id);
      await fetchVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor');
    } finally {
      setLoading(false);
    }
  };

  const restoreVendor = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await vendorsApi.restoreVendor(id);
      await fetchVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to restore vendor');
    } finally {
      setLoading(false);
    }
  };

  return { 
    vendors, 
    loading, 
    error, 
    createVendor, 
    updateVendor, 
    deleteVendor, 
    restoreVendor,
    refetch: fetchVendors 
  };
}
