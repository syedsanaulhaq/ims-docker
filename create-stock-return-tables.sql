-- Create stock returns tables if they don't exist

-- Stock returns table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_returns' and xtype='U')
BEGIN
    CREATE TABLE stock_returns (
        id int IDENTITY(1,1) PRIMARY KEY,
        return_date date NOT NULL,
        returned_by varchar(255) NOT NULL,
        verified_by varchar(255),
        return_notes text,
        return_status varchar(50) DEFAULT 'Completed',
        created_at datetime DEFAULT GETDATE()
    );
    PRINT 'Created stock_returns table';
END
ELSE
BEGIN
    PRINT 'stock_returns table already exists';
END

-- Stock return items table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_return_items' and xtype='U')
BEGIN
    CREATE TABLE stock_return_items (
        id int IDENTITY(1,1) PRIMARY KEY,
        return_id int NOT NULL,
        issued_item_id varchar(255) NOT NULL,
        nomenclature varchar(500) NOT NULL,
        return_quantity int NOT NULL,
        condition_on_return varchar(50) NOT NULL,
        damage_description text,
        created_at datetime DEFAULT GETDATE(),
        FOREIGN KEY (return_id) REFERENCES stock_returns(id)
    );
    PRINT 'Created stock_return_items table';
END
ELSE
BEGIN
    PRINT 'stock_return_items table already exists';
END

PRINT 'Stock return tables setup completed';
