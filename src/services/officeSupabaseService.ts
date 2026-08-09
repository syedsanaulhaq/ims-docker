// Supabase service for office hierarchy management
import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './api';

export interface OfficeSupabaseRow {
  intOfficeID: number;
  strOfficeName: string;
  description?: string;
  telephone_number?: string;
  email?: string;
  office_code?: string;
  IS_ACT: boolean;
  IS_DELETED: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WingSupabaseRow {
  intOfficeID: number;
  strOfficeName: string;
  short_strOfficeName: string;
  focal_person?: string;
  contact_no?: string;
  creator?: string;
  create_date?: string;
  modifier?: string;
  modify_date?: string;
  office_intOfficeID: number;
  IS_ACT: boolean;
  hod_id?: string;
  hod_name?: string;
  wing_code?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DecSupabaseRow {
  int_auto_intOfficeID: number;
  wing_intOfficeID: number;
  dec_strOfficeName: string;
  dec_acronym?: string;
  dec_address?: string;
  location?: string;
  IS_ACT: boolean;
  date_added?: string;
  dec_code?: number;
  hod_id?: string;
  hod_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Transform database rows to API response format
const transformOfficeData = (data: OfficeSupabaseRow[]): any[] => {
  return data.map((office: OfficeSupabaseRow) => ({
    Id: office.intOfficeID,
    Name: office.strOfficeName,
    Description: office.strOfficeDescription || '',
    TelephoneNumber: office.strTelephoneNumber || '',
    Email: office.strEmail || '',
    OfficeCode: office.OfficeCode || '',
    IsActive: office.IS_ACT,
    IsDeleted: office.IS_DELETED
  }));
};

const transformWingData = (data: WingSupabaseRow[]): any[] => {
  return data.map((wing: WingSupabaseRow) => ({
    Id: wing.intOfficeID,
    Name: wing.strOfficeName,
    ShortName: wing.ShortName,
    FocalPerson: wing.FocalPerson || '',
    ContactNo: wing.ContactNo || '',
    Creator: wing.Creator,
    CreateDate: wing.CreateDate || wing.CreatedAt,
    Modifier: wing.Modifier,
    ModifyDate: wing.ModifyDate || wing.UpdatedAt,
    OfficeID: wing.OfficeID,
    IS_ACT: wing.IS_ACT,
    HODID: wing.HODID,
    HODName: wing.HODName,
    WingCode: wing.WingCode || 0
  }));
};

const transformDecData = (data: DecSupabaseRow[]): any[] => {
  return data.map((dec: DecSupabaseRow) => ({
    Id: dec.intAutoID,
    WingID: dec.WingID,
    Name: dec.DECName,
    ShortName: dec.DECAcronym || '',
    OfficeID: 0, // Will need to get this via wing relation
    FocalPerson: '',
    ContactNo: '',
    Creator: null,
    CreateDate: dec.DateAdded || dec.CreatedAt || '',
    Modifier: null,
    ModifyDate: dec.UpdatedAt || '',
    IS_ACT: dec.IS_ACT,
    HODID: dec.HODID,
    HODName: dec.HODName,
    DecCode: dec.DECCode || 0
  }));
};

export const officeSupabaseService = {
  async getOffices(): Promise<ApiResponse<any[]>> {
    try {

      const { data, error } = await supabase
        .from('tblOffices')
        .select('*')
        .eq('IS_DELETED', false)
        .eq('IS_ACT', true)
        .order('strOfficeName');

      if (error) {
        
        throw error;
      }

      const transformedData = transformOfficeData(data || []);

      return {
        success: true,
        data: transformedData,
        message: 'Offices fetched successfully'
      };
    } catch (error) {
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async getWings(): Promise<ApiResponse<any[]>> {
    try {

      const { data, error } = await supabase
        .from('WingsInformation')
        .select('*')
        .eq('IS_ACT', true)
        .order('strOfficeName');

      if (error) {
        
        throw error;
      }

      const transformedData = transformWingData(data || []);

      return {
        success: true,
        data: transformedData,
        message: 'Wings fetched successfully'
      };
    } catch (error) {
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async getDecs(): Promise<ApiResponse<any[]>> {
    try {

      const { data, error } = await supabase
        .from('DEC_MST')
        .select('*')
        .eq('IS_ACT', true)
        .order('DECName');

      if (error) {
        
        throw error;
      }

      const transformedData = transformDecData(data || []);

      return {
        success: true,
        data: transformedData,
        message: 'DECs fetched successfully'
      };
    } catch (error) {
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async getWingsByOfficeId(officeId: number): Promise<ApiResponse<any[]>> {
    try {

      const { data, error } = await supabase
        .from('WingsInformation')
        .select('*')
        .eq('OfficeID', officeId)
        .eq('IS_ACT', true)
        .order('strOfficeName');

      if (error) {
        
        throw error;
      }

      const transformedData = transformWingData(data || []);

      return {
        success: true,
        data: transformedData,
        message: 'Wings fetched successfully'
      };
    } catch (error) {
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async getDecsByWingId(wingId: number): Promise<ApiResponse<any[]>> {
    try {

      const { data, error } = await supabase
        .from('DEC_MST')
        .select('*')
        .eq('WingID', wingId)
        .eq('IS_ACT', true)
        .order('DECName');

      if (error) {
        
        throw error;
      }

      const transformedData = transformDecData(data || []);

      return {
        success: true,
        data: transformedData,
        message: 'DECs fetched successfully'
      };
    } catch (error) {
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
