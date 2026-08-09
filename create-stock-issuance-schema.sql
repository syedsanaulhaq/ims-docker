-- =========================================
-- STOCK ISSUANCE SYSTEM DATABASE SCHEMA
-- =========================================
-- Complete schema for hierarchical stock issuance system

-- 1. Stock Issuance Requests Table
CREATE TABLE IF NOT EXISTS public.stock_issuance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('Individual', 'Organizational')),
    
    -- Requester Information (Using hierarchy)
    requester_office_id INTEGER NOT NULL REFERENCES public.offices(id),
    requester_wing_id INTEGER NOT NULL REFERENCES public.wings(id),
    requester_branch_id INTEGER REFERENCES public.decs(int_auto_id), -- Made nullable
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    
    -- Request Details
    purpose TEXT NOT NULL,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'Normal' 
        CHECK (urgency_level IN ('Low', 'Normal', 'High', 'Critical')),
    justification TEXT,
    expected_return_date DATE,
    is_returnable BOOLEAN NOT NULL DEFAULT false,
    
    -- Status & Workflow
    request_status VARCHAR(20) NOT NULL DEFAULT 'Submitted' 
        CHECK (request_status IN ('Submitted', 'Under Review', 'Approved', 'Partially Approved', 'Rejected', 'Issued', 'Completed')),
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES public.users(id),
    review_comments TEXT,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES public.users(id),
    issued_at TIMESTAMP,
    issued_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stock Issuance Request Items Table
CREATE TABLE IF NOT EXISTS public.stock_issuance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.stock_issuance_requests(id) ON DELETE CASCADE,
    
    -- Item Reference
    item_master_id UUID REFERENCES public.item_masters(id),
    nomenclature VARCHAR(500) NOT NULL,
    
    -- Quantities
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    approved_quantity INTEGER CHECK (approved_quantity >= 0),
    issued_quantity INTEGER CHECK (issued_quantity >= 0),
    
    -- Pricing
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total_value DECIMAL(15, 2) GENERATED ALWAYS AS (issued_quantity * unit_price) STORED,
    
    -- Status
    item_status VARCHAR(20) DEFAULT 'Pending' 
        CHECK (item_status IN ('Pending', 'Approved', 'Partially Approved', 'Rejected', 'Issued')),
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stock Issuance Approvals Workflow Table
CREATE TABLE IF NOT EXISTS public.stock_issuance_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.stock_issuance_requests(id) ON DELETE CASCADE,
    
    -- Approval Level (1 = Wing Level, 2 = Office Level, 3 = Higher Command)
    approval_level INTEGER NOT NULL CHECK (approval_level > 0),
    
    -- Approver Information (Using hierarchy)
    approver_office_id INTEGER REFERENCES public.offices(id),
    approver_wing_id INTEGER REFERENCES public.wings(id),
    approver_branch_id INTEGER REFERENCES public.decs(int_auto_id),
    approver_user_id UUID REFERENCES public.users(id),
    
    -- Approval Status
    approval_status VARCHAR(30) NOT NULL DEFAULT 'Pending'
        CHECK (approval_status IN ('Pending', 'Approved', 'Rejected', 'Returned for Clarification')),
    approval_date TIMESTAMP,
    comments TEXT,
    next_approver_user_id UUID REFERENCES public.users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Stock Movement Log Table
CREATE TABLE IF NOT EXISTS public.stock_movement_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    movement_type VARCHAR(20) NOT NULL 
        CHECK (movement_type IN ('Issue', 'Return', 'Transfer', 'Adjustment', 'Damage', 'Loss')),
    
    -- Reference
    reference_type VARCHAR(30) NOT NULL 
        CHECK (reference_type IN ('Issuance Request', 'Return', 'Transfer', 'Stock Adjustment')),
    reference_id UUID NOT NULL,
    
    -- Item & Hierarchy Information
    item_master_id UUID REFERENCES public.item_masters(id),
    nomenclature VARCHAR(500) NOT NULL,
    quantity INTEGER NOT NULL,
    
    -- Location & Personnel (Using hierarchy)
    from_office_id INTEGER REFERENCES public.offices(id),
    from_wing_id INTEGER REFERENCES public.wings(id),
    from_branch_id INTEGER REFERENCES public.decs(int_auto_id),
    from_user_id UUID REFERENCES public.users(id),
    
    to_office_id INTEGER REFERENCES public.offices(id),
    to_wing_id INTEGER REFERENCES public.wings(id),
    to_branch_id INTEGER REFERENCES public.decs(int_auto_id),
    to_user_id UUID REFERENCES public.users(id),
    
    -- Pricing
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total_value DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Tracking
    movement_notes TEXT,
    authorized_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Stock Returns Table
CREATE TABLE IF NOT EXISTS public.stock_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(50) UNIQUE NOT NULL,
    original_request_id UUID NOT NULL REFERENCES public.stock_issuance_requests(id),
    
    -- Returner Information (Using hierarchy)
    returner_office_id INTEGER NOT NULL REFERENCES public.offices(id),
    returner_wing_id INTEGER NOT NULL REFERENCES public.wings(id),
    returner_branch_id INTEGER NOT NULL REFERENCES public.decs(int_auto_id),
    returner_user_id UUID NOT NULL REFERENCES public.users(id),
    
    -- Return Details
    return_reason VARCHAR(50) NOT NULL 
        CHECK (return_reason IN ('Completed Task', 'Damaged', 'No Longer Needed', 'Excess Quantity')),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_notes TEXT,
    
    -- Status
    return_status VARCHAR(20) DEFAULT 'Submitted' 
        CHECK (return_status IN ('Submitted', 'Under Review', 'Accepted', 'Rejected')),
    
    -- Processing
    processed_by UUID REFERENCES public.users(id),
    processed_at TIMESTAMP,
    processing_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Stock Return Items Table
CREATE TABLE IF NOT EXISTS public.stock_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.stock_returns(id) ON DELETE CASCADE,
    original_item_id UUID NOT NULL REFERENCES public.stock_issuance_items(id),
    
    -- Item Details
    nomenclature VARCHAR(500) NOT NULL,
    return_quantity INTEGER NOT NULL CHECK (return_quantity > 0),
    
    -- Condition Assessment
    condition_on_return VARCHAR(20) NOT NULL 
        CHECK (condition_on_return IN ('Good', 'Fair', 'Damaged', 'Lost')),
    damage_description TEXT,
    replacement_required BOOLEAN DEFAULT false,
    replacement_cost DECIMAL(15, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Stock Issuance Requests Indexes
CREATE INDEX IF NOT EXISTS idx_stock_requests_office ON public.stock_issuance_requests(requester_office_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_wing ON public.stock_issuance_requests(requester_wing_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_branch ON public.stock_issuance_requests(requester_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_user ON public.stock_issuance_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON public.stock_issuance_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_date ON public.stock_issuance_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_stock_requests_number ON public.stock_issuance_requests(request_number);

-- Stock Issuance Items Indexes
CREATE INDEX IF NOT EXISTS idx_stock_items_request ON public.stock_issuance_items(request_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_master ON public.stock_issuance_items(item_master_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_status ON public.stock_issuance_items(item_status);

-- Approvals Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_request ON public.stock_issuance_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON public.stock_issuance_approvals(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.stock_issuance_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_approvals_level ON public.stock_issuance_approvals(approval_level);

-- Movement Log Indexes
CREATE INDEX IF NOT EXISTS idx_movement_date ON public.stock_movement_log(movement_date);
CREATE INDEX IF NOT EXISTS idx_movement_type ON public.stock_movement_log(movement_type);
CREATE INDEX IF NOT EXISTS idx_movement_item ON public.stock_movement_log(item_master_id);
CREATE INDEX IF NOT EXISTS idx_movement_from_office ON public.stock_movement_log(from_office_id);
CREATE INDEX IF NOT EXISTS idx_movement_to_office ON public.stock_movement_log(to_office_id);

-- Returns Indexes
CREATE INDEX IF NOT EXISTS idx_returns_original_request ON public.stock_returns(original_request_id);
CREATE INDEX IF NOT EXISTS idx_returns_returner ON public.stock_returns(returner_user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.stock_returns(return_status);
CREATE INDEX IF NOT EXISTS idx_returns_date ON public.stock_returns(return_date);

-- =============================================
-- FUNCTIONS FOR AUTO-GENERATION
-- =============================================

-- Function to generate request numbers
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    sequence_number INTEGER;
    request_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COUNT(*) + 1 INTO sequence_number
    FROM public.stock_issuance_requests
    WHERE EXTRACT(YEAR FROM submitted_at) = current_year;
    
    -- Format: SIR-2025-001
    request_number := 'SIR-' || current_year || '-' || LPAD(sequence_number::TEXT, 3, '0');
    
    RETURN request_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate return numbers
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    sequence_number INTEGER;
    return_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get next sequence number for this year
    SELECT COUNT(*) + 1 INTO sequence_number
    FROM public.stock_returns
    WHERE EXTRACT(YEAR FROM return_date) = current_year;
    
    -- Format: SRN-2025-001
    return_number := 'SRN-' || current_year || '-' || LPAD(sequence_number::TEXT, 3, '0');
    
    RETURN return_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATES
-- =============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_stock_requests_updated_at ON public.stock_issuance_requests;
CREATE TRIGGER update_stock_requests_updated_at
    BEFORE UPDATE ON public.stock_issuance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_items_updated_at ON public.stock_issuance_items;
CREATE TRIGGER update_stock_items_updated_at
    BEFORE UPDATE ON public.stock_issuance_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_returns_updated_at ON public.stock_returns;
CREATE TRIGGER update_stock_returns_updated_at
    BEFORE UPDATE ON public.stock_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.stock_issuance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_issuance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_issuance_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Stock Issuance Requests
CREATE POLICY "Users can view requests from their hierarchy" ON public.stock_issuance_requests
    FOR SELECT USING (
        requester_user_id = auth.uid()::uuid OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::uuid 
            AND (
                role IN ('Administrator', 'SECTAdmin') OR
                (office_id = requester_office_id AND role LIKE '%Admin%') OR
                (office_id = requester_office_id AND wing_id = requester_wing_id AND role LIKE '%Manager%')
            )
        )
    );

CREATE POLICY "Users can create their own requests" ON public.stock_issuance_requests
    FOR INSERT WITH CHECK (requester_user_id = auth.uid()::uuid);

CREATE POLICY "Authorized users can update requests" ON public.stock_issuance_requests
    FOR UPDATE USING (
        requester_user_id = auth.uid()::uuid OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('Administrator', 'SECTAdmin', 'StoreKeeper', 'Store Manager')
        )
    );

-- Similar policies for other tables (simplified for brevity)
CREATE POLICY "Users can view related items" ON public.stock_issuance_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stock_issuance_requests sir
            WHERE sir.id = request_id
            AND (
                sir.requester_user_id = auth.uid()::uuid OR
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid()::uuid 
                    AND role IN ('Administrator', 'SECTAdmin', 'StoreKeeper', 'Store Manager')
                )
            )
        )
    );

-- Grant permissions
GRANT ALL ON public.stock_issuance_requests TO authenticated;
GRANT ALL ON public.stock_issuance_items TO authenticated;
GRANT ALL ON public.stock_issuance_approvals TO authenticated;
GRANT ALL ON public.stock_movement_log TO authenticated;
GRANT ALL ON public.stock_returns TO authenticated;
GRANT ALL ON public.stock_return_items TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT '========================================' as separator;
SELECT 'STOCK ISSUANCE SCHEMA SETUP COMPLETE!' as title;
SELECT '========================================' as separator;

-- Count tables created
SELECT 'Tables Created:' as info;
SELECT 'stock_issuance_requests' as table_name, COUNT(*) as record_count FROM public.stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items' as table_name, COUNT(*) as record_count FROM public.stock_issuance_items
UNION ALL
SELECT 'stock_issuance_approvals' as table_name, COUNT(*) as record_count FROM public.stock_issuance_approvals
UNION ALL
SELECT 'stock_movement_log' as table_name, COUNT(*) as record_count FROM public.stock_movement_log
UNION ALL
SELECT 'stock_returns' as table_name, COUNT(*) as record_count FROM public.stock_returns
UNION ALL
SELECT 'stock_return_items' as table_name, COUNT(*) as record_count FROM public.stock_return_items;

SELECT 'Schema ready for hierarchical stock issuance system! ✅' as status;
