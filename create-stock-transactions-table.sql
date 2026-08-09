-- Create stock_transactions_clean table to track stock acquisition transactions
-- This table will store records when tenders are processed in the Transaction Manager
-- Adapted from Supabase structure to SQL Server

CREATE TABLE stock_transactions_clean (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tender_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id VARCHAR(50) NOT NULL,
    estimated_unit_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (estimated_unit_price >= 0),
    actual_unit_price DECIMAL(12,2) DEFAULT 0 CHECK (actual_unit_price >= 0),
    total_quantity_received INT DEFAULT 0 CHECK (total_quantity_received >= 0),
    type VARCHAR(10) NOT NULL DEFAULT 'IN' CHECK (type IN ('IN', 'OUT')),
    remarks NVARCHAR(MAX) NULL,
    pricing_confirmed BIT DEFAULT 0,
    created_at DATETIME2(7) DEFAULT GETDATE(),
    updated_at DATETIME2(7) DEFAULT GETDATE(),
    is_deleted BIT DEFAULT 0,
    deleted_at DATETIME2(7) NULL,
    deleted_by VARCHAR(50) NULL,
    
    -- Foreign key constraints
    CONSTRAINT FK_stock_transactions_tender 
        FOREIGN KEY (tender_id) REFERENCES tenders(id),
    CONSTRAINT FK_stock_transactions_item 
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
);

-- Create indexes for better performance
CREATE INDEX IX_stock_transactions_tender_id ON stock_transactions_clean(tender_id);
CREATE INDEX IX_stock_transactions_item_id ON stock_transactions_clean(item_master_id);
CREATE INDEX IX_stock_transactions_status ON stock_transactions_clean(status);
CREATE INDEX IX_stock_transactions_created_at ON stock_transactions_clean(created_at);

-- Insert some sample data based on existing tenders and their items
-- This will populate the dashboard with initial data
INSERT INTO stock_transactions_clean (
    tender_id, 
    item_master_id, 
    estimated_unit_price,
    actual_unit_price,
    total_quantity_received,
    type,
    pricing_confirmed
)
SELECT 
    ti.tender_id,
    ti.item_master_id,
    ISNULL(ti.unit_price, 0) as estimated_unit_price,
    ISNULL(ti.unit_price, 0) as actual_unit_price,
    ISNULL(ti.quantity, 0) as total_quantity_received,
    'IN' as type,
    CASE 
        WHEN t.is_finalized = 1 THEN 1
        ELSE 0
    END as pricing_confirmed
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN item_masters im ON ti.item_master_id = im.id
WHERE ti.is_deleted = 0 
AND t.is_deleted = 0
AND im.is_deleted = 0;

-- Show the results
SELECT 
    'stock_transactions_clean created and populated' as status,
    COUNT(*) as total_records
FROM stock_transactions_clean;

-- Show summary by tender
SELECT 
    t.title as tender_title,
    t.tender_number,
    COUNT(st.id) as item_count,
    SUM(st.total_quantity_received) as total_quantity,
    t.is_finalized,
    CASE WHEN st.pricing_confirmed = 1 THEN 'finalized' ELSE 'active' END as status
FROM stock_transactions_clean st
INNER JOIN tenders t ON st.tender_id = t.id
GROUP BY t.id, t.title, t.tender_number, t.is_finalized, st.pricing_confirmed
ORDER BY t.created_at DESC;
