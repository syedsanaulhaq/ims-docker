const axios = require('axios');

async function testItemsInsert() {
  const testData = {
    request_id: 'b4221f2f-76a9-4770-a477-e86c840baf0d', // Using a test GUID
    items: [
      {
        item_master_id: null,
        nomenclature: 'Test Item 1',
        requested_quantity: 2,
        unit_price: 0,
        item_type: 'inventory',
        custom_item_name: null
      }
    ]
  };

  try {
    const response = await axios.post('http://localhost:3001/api/stock-issuance/items', testData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testItemsInsert();