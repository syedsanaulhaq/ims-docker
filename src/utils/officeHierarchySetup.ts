// Utility to setup office hierarchy tables and data in Supabase
import { supabase } from '@/integrations/supabase/client';

export interface SetupResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export const officeHierarchySetup = {
  async checkTablesExist(): Promise<SetupResult> {
    try {

      // Try to query each table to see if it exists
      const { count: officesCount, error: officesError } = await supabase
        .from('tblOffices')
        .select('*', { count: 'exact', head: true });

      const { count: wingsCount, error: wingsError } = await supabase
        .from('WingsInformation')
        .select('*', { count: 'exact', head: true });

      const { count: decsCount, error: decsError } = await supabase
        .from('DEC_MST')
        .select('*', { count: 'exact', head: true });

      const result = {
        offices: {
          exists: !officesError,
          error: officesError?.message,
          count: officesCount || 0
        },
        wings: {
          exists: !wingsError,
          error: wingsError?.message,
          count: wingsCount || 0
        },
        decs: {
          exists: !decsError,
          error: decsError?.message,
          count: decsCount || 0
        }
      };

      return {
        success: true,
        message: 'Tables check completed',
        details: result
      };
    } catch (error) {
      
      return {
        success: false,
        message: 'Failed to check tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async createSampleData(): Promise<SetupResult> {
    try {

      // First, try to insert sample tblOffices
      const { data: officesData, error: officesError } = await supabase
        .from('tblOffices')
        .upsert([
          {
            intOfficeID: 1,
            strOfficeName: 'Pakistan Air Force Headquarters',
            strOfficeDescription: 'Main headquarters of Pakistan Air Force',
            OfficeCode: 'PAF-HQ',
            IS_ACT: true,
            IS_DELETED: false
          },
          {
            intOfficeID: 2,
            strOfficeName: 'Combat Command PAF',
            strOfficeDescription: 'Combat operations command',
            OfficeCode: 'CC-PAF',
            IS_ACT: true,
            IS_DELETED: false
          },
          {
            intOfficeID: 3,
            strOfficeName: 'Training Command PAF',
            strOfficeDescription: 'Training and education command',
            OfficeCode: 'TC-PAF',
            IS_ACT: true,
            IS_DELETED: false
          }
        ], { onConflict: 'intOfficeID' })
        .select();

      if (officesError) {
        
        return {
          success: false,
          message: 'Failed to create offices',
          error: officesError.message
        };
      }

      // Next, create sample WingsInformation
      const { data: wingsData, error: wingsError } = await supabase
        .from('WingsInformation')
        .upsert([
          {
            intOfficeID: 1,
            strOfficeName: 'Operations Wing',
            short_strOfficeName: 'Ops Wing',
            office_intOfficeID: 1,
            IS_ACT: true,
            WingCode: 1001
          },
          {
            intOfficeID: 2,
            strOfficeName: 'Intelligence Wing',
            short_strOfficeName: 'Int Wing',
            office_intOfficeID: 1,
            IS_ACT: true,
            WingCode: 1002
          },
          {
            intOfficeID: 3,
            strOfficeName: 'Administration Wing',
            short_strOfficeName: 'Admin Wing',
            office_intOfficeID: 1,
            IS_ACT: true,
            WingCode: 1003
          },
          {
            intOfficeID: 4,
            strOfficeName: 'Logistics Wing',
            short_strOfficeName: 'Log Wing',
            office_intOfficeID: 2,
            IS_ACT: true,
            WingCode: 2001
          }
        ], { onConflict: 'intOfficeID' })
        .select();

      if (wingsError) {
        
        return {
          success: false,
          message: 'Failed to create wings',
          error: wingsError.message
        };
      }

      // Finally, create sample DECs
      const { data: decsData, error: decsError } = await supabase
        .from('DEC_MST')
        .upsert([
          {
            int_auto_intOfficeID: 1,
            dec_strOfficeName: 'Operations Planning DEC',
            DECAcronym: 'Ops Plan',
            wing_intOfficeID: 1,
            IS_ACT: true,
            DECCode: 100101
          },
          {
            int_auto_intOfficeID: 2,
            dec_strOfficeName: 'Flight Operations DEC',
            DECAcronym: 'Flt Ops',
            wing_intOfficeID: 1,
            IS_ACT: true,
            DECCode: 100102
          },
          {
            int_auto_intOfficeID: 3,
            dec_strOfficeName: 'Intelligence Analysis DEC',
            DECAcronym: 'Int Anal',
            wing_intOfficeID: 2,
            IS_ACT: true,
            DECCode: 100201
          },
          {
            int_auto_intOfficeID: 4,
            dec_strOfficeName: 'Human Resources DEC',
            DECAcronym: 'HR',
            wing_intOfficeID: 3,
            IS_ACT: true,
            DECCode: 100301
          }
        ], { onConflict: 'intAutoID' })
        .select();

      if (decsError) {
        
        return {
          success: false,
          message: 'Failed to create DECs',
          error: decsError.message
        };
      }

      return {
        success: true,
        message: 'Sample data created successfully',
        details: {
          offices: officesData?.length || 0,
          wings: wingsData?.length || 0,
          decs: decsData?.length || 0
        }
      };
    } catch (error) {
      
      return {
        success: false,
        message: 'Failed to create sample data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async runFullSetup(): Promise<SetupResult> {
    try {

      // First check if tables exist
      const checkResult = await this.checkTablesExist();

      // If tables exist but are empty, create sample data
      if (checkResult.success && checkResult.details) {
        const { offices, wings, decs } = checkResult.details;
        
        if (offices.exists && wings.exists && decs.exists) {
          // Tables exist, check if they have data
          if (offices.count === 0 || wings.count === 0 || decs.count === 0) {
            
            return await this.createSampleData();
          } else {
            return {
              success: true,
              message: 'Tables already exist with data',
              details: checkResult.details
            };
          }
        } else {
          // Some tables don't exist
          return {
            success: false,
            message: 'Some office hierarchy tables do not exist',
            details: checkResult.details,
            error: 'Please create the tables using the SQL script first'
          };
        }
      }

      return checkResult;
    } catch (error) {
      
      return {
        success: false,
        message: 'Failed to run full setup',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
