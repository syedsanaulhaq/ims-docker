/**
 * CSV User Import Service
 * 
 * Alternative to SQL Server sync - imports user data from CSV file
 * This can be used for initial data load or when SQL Server connection is not available
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';

interface CSVUser {
  Id: string;
  FullName: string;
  FatherOrHusbandName: string;
  CNIC: string;
  UserName: string;
  NormalizedUserName: string;
  Email: string;
  NormalizedEmail: string;
  EmailConfirmed: string;
  PasswordHash: string;
  SecurityStamp: string;
  ConcurrencyStamp: string;
  PhoneNumber: string;
  PhoneNumberConfirmed: string;
  TwoFactorEnabled: string;
  LockoutEnd: string;
  LockoutEnabled: string;
  AccessFailedCount: string;
  AddedBy: string;
  AddedOn: string;
  IMEI: string;
  IPAddress: string;
  Latitude: string;
  Longitude: string;
  MacAddress: string;
  ModifiedBy: string;
  ModifiedOn: string;
  RecordDateTime: string;
  Password: string;
  ISACT: string;
  Role: string;
  ProfilePhoto: string;
  UID: string;
  intProvinceID: string;
  intDivisionID: string;
  intDistrictID: string;
  intOfficeID: string;
  intWingID: string;
  intBranchID: string;
  intDesignationID: string;
  LastLoggedIn: string;
  Gender: string;
}

export class CSVUserImportService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Import users from CSV file
   */
  async importFromCSV(csvFilePath: string): Promise<{
    success: boolean;
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsFailed: number;
    errors: string[];
  }> {
    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {// Start sync log
      const { data: syncLog } = await this.supabase
        .from('user_sync_log')
        .insert({
          sync_started_at: new Date().toISOString(),
          sync_status: 'running',
          source_system: 'CSV_Import'
        })
        .select()
        .single();

      // Read and parse CSV file
      const csvContent = readFileSync(csvFilePath, 'utf-8');
      const records: CSVUser[] = await new Promise((resolve, reject) => {
        parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });// Process users in batches
      const batchSize = 50;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        for (const csvUser of batch) {
          try {
            const supabaseUser = this.transformCSVUser(csvUser);
            
            // Check if user exists
            const { data: existingUser } = await this.supabase
              .from('users')
              .select('id, sync_version')
              .eq('id', csvUser.Id)
              .single();

            if (existingUser) {
              // Update existing user
              const { error } = await this.supabase
                .from('users')
                .update({
                  ...supabaseUser,
                  sync_version: existingUser.sync_version + 1
                })
                .eq('id', csvUser.Id);

              if (error) {
                errors.push(`Update failed for user ${csvUser.Id}: ${error.message}`);
                recordsFailed++;
              } else {
                recordsUpdated++;
              }
            } else {
              // Insert new user
              const { error } = await this.supabase
                .from('users')
                .insert(supabaseUser);

              if (error) {
                errors.push(`Insert failed for user ${csvUser.Id}: ${error.message}`);
                recordsFailed++;
              } else {
                recordsInserted++;
              }
            }

            recordsProcessed++;
          } catch (error) {
            errors.push(`Processing failed for user ${csvUser.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            recordsFailed++;
          }
        }}

      // Update sync log
      await this.supabase
        .from('user_sync_log')
        .update({
          sync_completed_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          records_inserted: recordsInserted,
          records_updated: recordsUpdated,
          records_failed: recordsFailed,
          sync_status: 'completed',
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', syncLog?.id);return {
        success: true,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        errors
      };

    } catch (error) {return {
        success: false,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Transform CSV user data to Supabase format
   */
  private transformCSVUser(csvUser: CSVUser) {
    const parseDate = (dateStr: string): string => {
      if (!dateStr || dateStr === '0001-01-01 00:00:00.0000000') {
        return new Date().toISOString();
      }
      try {
        return new Date(dateStr).toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const parseNumber = (numStr: string): number => {
      const parsed = parseInt(numStr) || 0;
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseFloat = (numStr: string): number => {
      const parsed = parseFloat(numStr) || 0;
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseBoolean = (boolStr: string): boolean => {
      return boolStr === '1' || boolStr?.toLowerCase() === 'true';
    };

    return {
      id: csvUser.Id,
      full_name: csvUser.FullName || '',
      father_or_husband_name: csvUser.FatherOrHusbandName || '',
      cnic: csvUser.CNIC || '',
      user_name: csvUser.UserName || '',
      normalized_user_name: csvUser.NormalizedUserName || '',
      email: csvUser.Email || '',
      normalized_email: csvUser.NormalizedEmail || '',
      email_confirmed: parseBoolean(csvUser.EmailConfirmed),
      password_hash: csvUser.PasswordHash || '',
      security_stamp: csvUser.SecurityStamp || '',
      concurrency_stamp: csvUser.ConcurrencyStamp || '',
      phone_number: csvUser.PhoneNumber || '',
      phone_number_confirmed: parseBoolean(csvUser.PhoneNumberConfirmed),
      two_factor_enabled: parseBoolean(csvUser.TwoFactorEnabled),
      lockout_end: csvUser.LockoutEnd && csvUser.LockoutEnd !== '' ? parseDate(csvUser.LockoutEnd) : null,
      lockout_enabled: parseBoolean(csvUser.LockoutEnabled),
      access_failed_count: parseNumber(csvUser.AccessFailedCount),
      added_by: csvUser.AddedBy || '',
      added_on: parseDate(csvUser.AddedOn),
      imei: csvUser.IMEI || '',
      ip_address: csvUser.IPAddress || '',
      latitude: parseFloat(csvUser.Latitude),
      longitude: parseFloat(csvUser.Longitude),
      mac_address: csvUser.MacAddress || '',
      modified_by: csvUser.ModifiedBy || '',
      modified_on: parseDate(csvUser.ModifiedOn),
      record_date_time: parseDate(csvUser.RecordDateTime),
      password: csvUser.Password || '',
      is_active: parseNumber(csvUser.ISACT),
      role: csvUser.Role || '',
      profile_photo: csvUser.ProfilePhoto || '',
      uid: parseNumber(csvUser.UID),
      province_id: parseNumber(csvUser.intProvinceID),
      division_id: parseNumber(csvUser.intDivisionID),
      district_id: parseNumber(csvUser.intDistrictID),
      office_id: parseNumber(csvUser.intOfficeID),
      wing_id: parseNumber(csvUser.intWingID),
      branch_id: parseNumber(csvUser.intBranchID),
      designation_id: parseNumber(csvUser.intDesignationID),
      last_logged_in: parseDate(csvUser.LastLoggedIn),
      gender: parseNumber(csvUser.Gender),
      synced_at: new Date().toISOString(),
      sync_version: 1
    };
  }
}

// Export singleton instance
export const csvUserImportService = new CSVUserImportService();
