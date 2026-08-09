-- Create users table in Supabase matching SQL Server AspNetUser structure
-- This table will store synchronized user data from SQL Server

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    full_name TEXT,
    father_or_husband_name TEXT,
    cnic VARCHAR(15),
    user_name VARCHAR(256),
    normalized_user_name VARCHAR(256),
    email VARCHAR(256),
    normalized_email VARCHAR(256),
    email_confirmed BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    security_stamp TEXT,
    concurrency_stamp TEXT,
    phone_number VARCHAR(50),
    phone_number_confirmed BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    lockout_end TIMESTAMPTZ,
    lockout_enabled BOOLEAN DEFAULT TRUE,
    access_failed_count INTEGER DEFAULT 0,
    added_by TEXT,
    added_on TIMESTAMPTZ,
    imei VARCHAR(50),
    ip_address VARCHAR(45),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    mac_address VARCHAR(50),
    modified_by TEXT,
    modified_on TIMESTAMPTZ,
    record_date_time TIMESTAMPTZ,
    password TEXT, -- Legacy password field
    is_active INTEGER DEFAULT 1,
    role VARCHAR(100),
    profile_photo TEXT,
    uid INTEGER,
    province_id INTEGER,
    division_id INTEGER,
    district_id INTEGER,
    office_id INTEGER,
    wing_id INTEGER,
    branch_id INTEGER,
    designation_id INTEGER,
    last_logged_in TIMESTAMPTZ,
    gender INTEGER,
    
    -- Sync tracking fields
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    
    -- Indexes for performance
    CONSTRAINT unique_user_name UNIQUE (user_name),
    CONSTRAINT unique_email UNIQUE (email),
    CONSTRAINT unique_cnic UNIQUE (cnic)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_name ON public.users(user_name);
CREATE INDEX IF NOT EXISTS idx_users_cnic ON public.users(cnic);
CREATE INDEX IF NOT EXISTS idx_users_office_id ON public.users(office_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_logged_in ON public.users(last_logged_in);
CREATE INDEX IF NOT EXISTS idx_users_synced_at ON public.users(synced_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data unless they have admin role
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text OR 
                     EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('Administrator', 'SECTAdmin')));

-- Only admins can insert/update user data
CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('Administrator', 'SECTAdmin')));

-- Create sync log table to track synchronization
CREATE TABLE IF NOT EXISTS public.user_sync_log (
    id SERIAL PRIMARY KEY,
    sync_started_at TIMESTAMPTZ DEFAULT NOW(),
    sync_completed_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    source_system VARCHAR(50) DEFAULT 'SQL_Server_AspNetUser'
);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_sync_log TO authenticated;
GRANT ALL ON SEQUENCE user_sync_log_id_seq TO authenticated;

-- Insert sample comment
COMMENT ON TABLE public.users IS 'Synchronized user data from SQL Server AspNetUser table for stock issuance and inventory management';
COMMENT ON COLUMN public.users.synced_at IS 'Timestamp when this record was last synchronized from SQL Server';
COMMENT ON COLUMN public.users.sync_version IS 'Version number for optimistic locking during sync operations';
