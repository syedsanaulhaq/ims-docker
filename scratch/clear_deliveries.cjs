const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function clearDeliveries() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const poId = '14EF3FF0-7593-404D-87FA-BAF68C0CCC92';
    console.log(`Clearing deliveries and related items for PO: ${poId}`);

    // 1. Get deliveries linked to this PO
    const deliveriesResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, poId)
      .query(`SELECT id, delivery_number FROM deliveries WHERE po_id = @poId`);
    
    const deliveryIds = deliveriesResult.recordset.map(d => d.id);
    console.log(`Found deliveries to delete:`, deliveriesResult.recordset);

    if (deliveryIds.length > 0) {
      const idsStr = deliveryIds.map(id => `'${id}'`).join(',');

      // 2. Delete stock transactions referencing these deliveries or PO
      const deleteTxns = await pool.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`DELETE FROM stock_transactions WHERE reference_type = 'PURCHASE_ORDER' AND reference_id = @poId`);
      console.log(`Deleted ${deleteTxns.rowsAffected[0]} stock transactions.`);

      // 3. Delete stock acquisitions referencing these deliveries
      const deleteAcq = await pool.request()
        .query(`DELETE FROM stock_acquisitions WHERE delivery_id IN (${idsStr})`);
      console.log(`Deleted ${deleteAcq.rowsAffected[0]} stock acquisitions.`);

      // 4. Delete delivery items
      const deleteItems = await pool.request()
        .query(`DELETE FROM delivery_items WHERE delivery_id IN (${idsStr})`);
      console.log(`Deleted ${deleteItems.rowsAffected[0]} delivery items.`);

      // 5. Delete deliveries
      const deleteDels = await pool.request()
        .query(`DELETE FROM deliveries WHERE id IN (${idsStr})`);
      console.log(`Deleted ${deleteDels.rowsAffected[0]} deliveries.`);
    }

    // 6. Reset current_inventory_stock quantities for items in this PO back to 0 (or subtract the received quantities)
    // For this simple reset, we can just subtract what was added. Since it's a test database, let's reset it back.
    // Or we can rebuild/recalculate stock based on active transactions:
    console.log("Recalculating current_inventory_stock based on active stock_transactions...");
    await pool.request().query(`
      -- Clear all current inventory stock
      DELETE FROM current_inventory_stock;
      
      -- Insert totals from remaining stock_transactions
      INSERT INTO current_inventory_stock (id, item_master_id, current_quantity, last_transaction_date, last_transaction_type, last_updated)
      SELECT 
          NEWID(),
          item_master_id,
          SUM(CASE WHEN transaction_type = 'RECEIVED' THEN quantity ELSE -quantity END),
          MAX(transaction_date),
          'RECEIVED',
          GETDATE()
      FROM stock_transactions
      GROUP BY item_master_id;
    `);
    console.log("Recalculated current inventory stock!");

    // 7. Reset PO status back to 'finalized' so it can receive deliveries again
    await pool.request()
      .input('poId', sql.UniqueIdentifier, poId)
      .query(`UPDATE purchase_orders SET status = 'finalized' WHERE id = @poId`);
    console.log("Updated PO status back to finalized!");

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

clearDeliveries();
