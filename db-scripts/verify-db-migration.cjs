const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Syed@1234',
    server: 'SYED-FAZLI-LAPT',
    database: 'InventoryManagementDB',
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableKeepAlive: true
    }
};

async function verifyMigration() {
    try {
        await sql.connect(config);
        // Check table exists
        const tableCheck = await sql.query`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'inventory_verification_requests'
        `;

        if (tableCheck.recordset.length > 0) {
            // Count columns
            const colCount = await sql.query`
                SELECT COUNT(*) as col_count FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'inventory_verification_requests'
            `;
            } else {
            }

        // Check view exists
        const viewCheck = await sql.query`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'View_Pending_Inventory_Verifications'
        `;

        if (viewCheck.recordset.length > 0) {
            } else {
            }

        // Check indexes
        const indexCheck = await sql.query`
            SELECT name FROM sys.indexes 
            WHERE object_id = OBJECT_ID('dbo.inventory_verification_requests')
            AND name LIKE 'idx_%'
        `;

        indexCheck.recordset.forEach(idx => {
            });

        await sql.close();
    } catch (err) {
        console.error('❌ Verification Error:', err.message);
        process.exit(1);
    }
}

verifyMigration();
