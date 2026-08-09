import { useState, useEffect } from 'react';
import { Office, NewOffice, Wing, DEC } from '@/types/office';
import { useToast } from "@/hooks/use-toast";
import erpDatabaseService from '@/services/erpDatabaseService';

export const useOffices = () => {
  const { toast } = useToast();
  const [offices, setOffices] = useState<Office[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [decs, setDecs] = useState<DEC[]>([]);
  const [loading, setLoading] = useState(false);

  // Load offices from ERP database
  const loadOffices = async () => {
    try {
      setLoading(true);
      const data = await erpDatabaseService.getActiveOffices();
      setOffices(data);
    } catch (error) {
      console.error('Error loading offices:', error);
      toast({
        title: "Error",
        description: "Failed to load offices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load wings from ERP database
  const loadWings = async (officeId?: number) => {
    try {
      setLoading(true);
      const data = officeId 
        ? await erpDatabaseService.getWingsByOffice(officeId)
        : await erpDatabaseService.getActiveWings();
      setWings(data);
    } catch (error) {
      console.error('Error loading wings:', error);
      toast({
        title: "Error",
        description: "Failed to load wings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load DECs from ERP database
  const loadDECs = async (wingId?: number) => {
    try {
      setLoading(true);
      const data = wingId 
        ? await erpDatabaseService.getDecsByWing(wingId)
        : await erpDatabaseService.getActiveDecs();
      setDecs(data);
    } catch (error) {
      console.error('Error loading DECs:', error);
      toast({
        title: "Error",
        description: "Failed to load DECs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get office name by ID
  const getOfficeName = (officeId: number): string => {
    const office = offices.find(o => o.intOfficeID === officeId);
    return office ? office.strOfficeName : 'Unknown Office';
  };

  // Get wing name by ID
  const getWingName = (wingId: number): string => {
    const wing = wings.find(w => w.Id === wingId);
    return wing ? wing.Name : 'Unknown Wing';
  };

  // Get DEC name by ID
  const getDECName = (decId: number): string => {
    const dec = decs.find(d => d.intAutoID === decId);
    return dec ? dec.DECName : 'Unknown DEC';
  };

  // Load data on component mount
  useEffect(() => {
    loadOffices();
  }, []);

  return {
    // Data
    offices,
    wings,
    decs,
    loading,
    
    // Actions
    loadOffices,
    loadWings,
    loadDECs,
    
    // Helpers
    getOfficeName,
    getWingName,
    getDECName,
    
    // Legacy compatibility
    getParentOfficeName: getOfficeName
  };
};