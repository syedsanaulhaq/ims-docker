// API Testing Script for InvMISDB Integration
// This script tests all major API endpoints to ensure they work correctly

const API_BASE = 'http://localhost:5000/api';

async function testApiEndpoint(endpoint, description) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runApiTests() {
  const tests = [
    { endpoint: '/users', description: 'Get all users from AspNetUsers table' },
    { endpoint: '/offices', description: 'Get all offices from organization structure' },
    { endpoint: '/wings', description: 'Get all wings/departments' },
    { endpoint: '/categories', description: 'Get all categories and subcategories' },
    { endpoint: '/items', description: 'Get all item master data' },
    { endpoint: '/current-stock', description: 'Get current stock levels' },
    { endpoint: '/tender-awards', description: 'Get all tender awards' },
    { endpoint: '/deliveries', description: 'Get all deliveries' },
    { endpoint: '/dashboard/summary', description: 'Get dashboard summary data' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testApiEndpoint(test.endpoint, test.description);
    results.push({ ...test, ...result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  if (failed > 0) {
    results.filter(r => !r.success).forEach(r => {
      });
  }
  
  }

// Run the tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testInvMISApis = runApiTests;
  } else {
  // Node.js environment
  runApiTests().catch(console.error);
}