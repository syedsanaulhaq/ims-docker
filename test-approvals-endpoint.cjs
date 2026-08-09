const axios = require('axios');

async function testApprovalsEndpoint() {
  try {
    // First, let's try to get the dashboard stats
    const dashboardResponse = await axios.get('http://localhost:3001/api/approvals/dashboard', {
      withCredentials: true,
      headers: {
        'Cookie': 'session=test-session' // This won't work without a real session
      }
    });

    } catch (error) {
    }
}

testApprovalsEndpoint();