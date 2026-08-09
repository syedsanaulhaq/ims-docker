// Quick API connectivity test
const API_BASE = 'http://localhost:3001/api';

// Test all endpoints
async function testAPIs() {
  const tests = [
    { name: 'Item Masters', endpoint: '/item-masters' },
    { name: 'Categories', endpoint: '/categories' },
    { name: 'Sub-Categories', endpoint: '/sub-categories' },
    { name: 'Session', endpoint: '/session' }
  ];

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE}${test.endpoint}`);
      if (response.ok) {
        const data = await response.json();
        } else {
        }
    } catch (error) {
      }
  }
  
  }

// Run test
testAPIs();