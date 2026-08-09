-- Create Purchase Orders table
CREATE TABLE purchase_orders (
    id INT PRIMARY KEY IDENTITY(1,1),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    tender_id INT NOT NULL,
    vendor_id INT NOT NULL,
    po_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, issued, confirmed, closed
    remarks NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(255) NULL,
    updated_by NVARCHAR(255) NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    INDEX idx_tender_id (tender_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_po_date (po_date),
    INDEX idx_status (status)
);

-- Create Purchase Order Items table
CREATE TABLE purchase_order_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    po_id INT NOT NULL,
    item_master_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    specifications NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
    INDEX idx_po_id (po_id),
    INDEX idx_item_master_id (item_master_id)
);

-- Create index for PO number lookup
CREATE INDEX idx_po_number ON purchase_orders(po_number);

-- Create trigger to auto-update total_amount in purchase_orders when items are added/modified
CREATE TRIGGER tr_update_po_total_amount
ON purchase_order_items
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    UPDATE purchase_orders
    SET total_amount = ISNULL((
        SELECT SUM(total_price) 
        FROM purchase_order_items 
        WHERE po_id = purchase_orders.id
    ), 0)
    WHERE id IN (
        SELECT DISTINCT po_id FROM inserted
        UNION
        SELECT DISTINCT po_id FROM deleted
    );
END;
