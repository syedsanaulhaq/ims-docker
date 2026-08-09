/**
 * SQL Server to Supabase User Synchronization Service
 * 
 * This service handles the synchronization of user data from SQL Server AspNetUser table
 * to Supabase users table for inventory management and stock issuance workflows.
 */

import { createClient } from '@supabase/supabase-js';
import sql from 'mssql';

interface AspNetUser {
  Id: string;
  FullName: string;
  FatherOrHusbandName: string;
  CNIC: string;
  UserName: string;
  NormalizedUserName: string;
  Email: string;
  NormalizedEmail: string;
  EmailConfirmed: boolean;
  PasswordHash: string;
  SecurityStamp: string;
  ConcurrencyStamp: string;
  PhoneNumber: string;
  PhoneNumberConfirmed: boolean;
  TwoFactorEnabled: boolean;
  LockoutEnd: Date | null;
  LockoutEnabled: boolean;
  AccessFailedCount: number;
  AddedBy: string;
  AddedOn: Date;
  IMEI: string;
  IPAddress: string;
  Latitude: number;
  Longitude: number;
  MacAddress: string;
  ModifiedBy: string;
  ModifiedOn: Date;
  RecordDateTime: Date;
  Password: string;
  ISACT: number;
  Role: string;
  ProfilePhoto: string;
  UID: number;
  intProvinceID: number;
  intDivisionID: number;
  intDistrictID: number;
  intOfficeID: number;
  intWingID: number;
  intBranchID: number;
  intDesignationID: number;
  LastLoggedIn: Date;
  Gender: number;
}

interface SupabaseUser {
  id: string;
  full_name: string;
  father_or_husband_name: string;
  cnic: string;
  user_name: string;
  normalized_user_name: string;
  email: string;
  normalized_email: string;
  email_confirmed: boolean;
  password_hash: string;
  security_stamp: string;
  concurrency_stamp: string;
  phone_number: string;
  phone_number_confirmed: boolean;
  two_factor_enabled: boolean;
  lockout_end: string | null;
  lockout_enabled: boolean;
  access_failed_count: number;
  added_by: string;
  added_on: string;
  imei: string;
  ip_address: string;
  latitude: number;
  longitude: number;
  mac_address: string;
  modified_by: string;
  modified_on: string;
  record_date_time: string;
  password: string;
  is_active: number;
  role: string;
  profile_photo: string;
  uid: number;
  province_id: number;
  division_id: number;
  district_id: number;
  office_id: number;
  wing_id: number;
  branch_id: number;
  designation_id: number;
  last_logged_in: string;
  gender: number;
  synced_at: string;
  sync_version: number;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  duration: number;
}

export class UserSyncService {
  private supabase;
  private sqlConfig: sql.config;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // SQL Server configuration
    this.sqlConfig = {
      user: process.env.SQL_SERVER_USER!,
      password: process.env.SQL_SERVER_PASSWORD!,
      server: process.env.SQL_SERVER_HOST!,
      database: process.env.SQL_SERVER_DATABASE!,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  /**
   * Main synchronization method
   */
  async syncUsers(): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    // Start sync log
    const { data: syncLog } = await this.supabase
      .from('user_sync_log')
      .insert({
        sync_started_at: new Date().toISOString(),
        sync_status: 'running'
      })
      .select()
      .single();

    try {// Connect to SQL Server
      const pool = await sql.connect(this.sqlConfig);
      
      // Fetch all users from SQL Server
      const result = await pool.request().query(`
        SELECT 
          Id, FullName, FatherOrHusbandName, CNIC, UserName, NormalizedUserName,
          Email, NormalizedEmail, EmailConfirmed, PasswordHash, SecurityStamp,
          ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled,
          LockoutEnd, LockoutEnabled, AccessFailedCount, AddedBy, AddedOn,
          IMEI, IPAddress, Latitude, Longitude, MacAddress, ModifiedBy,
          ModifiedOn, RecordDateTime, Password, ISACT, Role, ProfilePhoto,
          UID, intProvinceID, intDivisionID, intDistrictID, intOfficeID,
          intWingID, intBranchID, intDesignationID, LastLoggedIn, Gender
        FROM AspNetUsers
        ORDER BY ModifiedOn DESC
      `);

      const sqlServerUsers: AspNetUser[] = result.recordset;// Process users in batches
      const batchSize = 50;
      for (let i = 0; i < sqlServerUsers.length; i += batchSize) {
        const batch = sqlServerUsers.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch);
        
        recordsProcessed += batchResult.processed;
        recordsInserted += batchResult.inserted;
        recordsUpdated += batchResult.updated;
        recordsFailed += batchResult.failed;
        errors.push(...batchResult.errors);}

      await pool.close();

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
        .eq('id', syncLog?.id);

      const duration = Date.now() - startTime;return {
        success: true,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        errors,
        duration
      };

    } catch (error) {// Update sync log with error
      await this.supabase
        .from('user_sync_log')
        .update({
          sync_completed_at: new Date().toISOString(),
          sync_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', syncLog?.id);

      return {
        success: false,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Process a batch of users
   */
  private async processBatch(users: AspNetUser[]): Promise<{
    processed: number;
    inserted: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const supabaseUser = this.transformUser(user);
        
        // Check if user exists
        const { data: existingUser } = await this.supabase
          .from('users')
          .select('id, sync_version')
          .eq('id', user.Id)
          .single();

        if (existingUser) {
          // Update existing user
          const { error } = await this.supabase
            .from('users')
            .update({
              ...supabaseUser,
              sync_version: existingUser.sync_version + 1
            })
            .eq('id', user.Id);

          if (error) {
            errors.push(`Update failed for user ${user.Id}: ${error.message}`);
            failed++;
          } else {
            updated++;
          }
        } else {
          // Insert new user
          const { error } = await this.supabase
            .from('users')
            .insert(supabaseUser);

          if (error) {
            errors.push(`Insert failed for user ${user.Id}: ${error.message}`);
            failed++;
          } else {
            inserted++;
          }
        }

        processed++;
      } catch (error) {
        errors.push(`Processing failed for user ${user.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { processed, inserted, updated, failed, errors };
  }

  /**
   * Transform SQL Server user to Supabase format
   */
  private transformUser(sqlUser: AspNetUser): SupabaseUser {
    return {
      id: sqlUser.Id,
      full_name: sqlUser.FullName || '',
      father_or_husband_name: sqlUser.FatherOrHusbandName || '',
      cnic: sqlUser.CNIC || '',
      user_name: sqlUser.UserName || '',
      normalized_user_name: sqlUser.NormalizedUserName || '',
      email: sqlUser.Email || '',
      normalized_email: sqlUser.NormalizedEmail || '',
      email_confirmed: sqlUser.EmailConfirmed || false,
      password_hash: sqlUser.PasswordHash || '',
      security_stamp: sqlUser.SecurityStamp || '',
      concurrency_stamp: sqlUser.ConcurrencyStamp || '',
      phone_number: sqlUser.PhoneNumber || '',
      phone_number_confirmed: sqlUser.PhoneNumberConfirmed || false,
      two_factor_enabled: sqlUser.TwoFactorEnabled || false,
      lockout_end: sqlUser.LockoutEnd ? sqlUser.LockoutEnd.toISOString() : null,
      lockout_enabled: sqlUser.LockoutEnabled || false,
      access_failed_count: sqlUser.AccessFailedCount || 0,
      added_by: sqlUser.AddedBy || '',
      added_on: sqlUser.AddedOn ? sqlUser.AddedOn.toISOString() : new Date().toISOString(),
      imei: sqlUser.IMEI || '',
      ip_address: sqlUser.IPAddress || '',
      latitude: sqlUser.Latitude || 0,
      longitude: sqlUser.Longitude || 0,
      mac_address: sqlUser.MacAddress || '',
      modified_by: sqlUser.ModifiedBy || '',
      modified_on: sqlUser.ModifiedOn ? sqlUser.ModifiedOn.toISOString() : new Date().toISOString(),
      record_date_time: sqlUser.RecordDateTime ? sqlUser.RecordDateTime.toISOString() : new Date().toISOString(),
      password: sqlUser.Password || '',
      is_active: sqlUser.ISACT || 1,
      role: sqlUser.Role || '',
      profile_photo: sqlUser.ProfilePhoto || '',
      uid: sqlUser.UID || 0,
      province_id: sqlUser.intProvinceID || 0,
      division_id: sqlUser.intDivisionID || 0,
      district_id: sqlUser.intDistrictID || 0,
      office_id: sqlUser.intOfficeID || 0,
      wing_id: sqlUser.intWingID || 0,
      branch_id: sqlUser.intBranchID || 0,
      designation_id: sqlUser.intDesignationID || 0,
      last_logged_in: sqlUser.LastLoggedIn ? sqlUser.LastLoggedIn.toISOString() : new Date().toISOString(),
      gender: sqlUser.Gender || 0,
      synced_at: new Date().toISOString(),
      sync_version: 1
    };
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<any> {
    const { data: logs } = await this.supabase
      .from('user_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(10);

    const { data: userCount } = await this.supabase
      .from('users')
      .select('id', { count: 'exact' });

    return {
      totalUsers: userCount?.length || 0,
      recentSyncs: logs || [],
      lastSyncTime: logs?.[0]?.sync_completed_at || null
    };
  }

  /**
   * Manual sync trigger for testing
   */
  async manualSync(): Promise<SyncResult> {return await this.syncUsers();
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();
