const axios = require('axios');

async function testUpdateRequest() {
  try {
    const response = await axios.put('http://localhost:3001/api/stock-issuance/requests/test-id', {
      purpose: 'Test purpose',
      urgency_level: 'Normal',
      justification: 'Test justification',
      expected_return_date: null,
      is_returnable: false,
      items: []
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    } catch (error) {
    console.error('❌ Update failed:', error.response?.data || error.message);
  }
}

testUpdateRequest();