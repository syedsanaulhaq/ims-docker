const axios = require('axios');

// ========================================
// API ENDPOINT TEST SUITE
// ========================================

const BASE_URL = 'http://localhost:3001';

// Helper function to make API calls
async function callAPI(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      data
    };
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test data
const testData = {
  stock_issuance_request_id: '00000000-0000-0000-0000-000000000001', // Example UUID
  stock_issuance_item_id: '00000000-0000-0000-0000-000000000002',
  item_master_id: '00000000-0000-0000-0000-000000000003',
  quantity: 10,
  wing_id: 1,
  issued_by: 'Test User',
  verification_result: 'available',
  available_quantity: 10,
  verification_notes: 'Inventory verified and available',
  verified_by: 'Test Verifier',
  finalized_by: 'Test Admin'
};

// Main test runner
async function runTests() {
  // Test 1: Determine issuance source
  const determineTest = await callAPI('POST', '/api/issuance/determine-source', {
    item_master_id: testData.item_master_id,
    required_quantity: testData.quantity
  });
  // Test 2: Issue from wing store
  const wingIssueTest = await callAPI('POST', '/api/issuance/issue-from-wing', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    stock_issuance_request_id: testData.stock_issuance_request_id,
    item_master_id: testData.item_master_id,
    quantity: testData.quantity,
    wing_id: testData.wing_id,
    issued_by: testData.issued_by
  });
  // Test 3: Issue from admin store
  const adminIssueTest = await callAPI('POST', '/api/issuance/issue-from-admin', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    stock_issuance_request_id: testData.stock_issuance_request_id,
    item_master_id: testData.item_master_id,
    quantity: testData.quantity,
    issued_by: testData.issued_by
  });
  // Test 4: Handle verification result
  const verificationTest = await callAPI('POST', '/api/issuance/handle-verification-result', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    verification_result: testData.verification_result,
    available_quantity: testData.available_quantity,
    verification_notes: testData.verification_notes,
    verified_by: testData.verified_by
  });
  // Test 5: Finalize issuance
  const finalizeTest = await callAPI('POST', '/api/issuance/finalize', {
    stock_issuance_request_id: testData.stock_issuance_request_id,
    finalized_by: testData.finalized_by
  });
  // Test 6: Get issuance status
  const statusTest = await callAPI('GET', `/api/issuance/status/${testData.stock_issuance_request_id}`);
  // Summary
  const allTests = [
    { name: 'Determine Source', result: determineTest },
    { name: 'Wing Store Issue', result: wingIssueTest },
    { name: 'Admin Store Issue', result: adminIssueTest },
    { name: 'Verification Result', result: verificationTest },
    { name: 'Finalize Issuance', result: finalizeTest },
    { name: 'Get Status', result: statusTest }
  ];

  const passed = allTests.filter(t => t.result.success).length;
  const total = allTests.length;

  allTests.forEach(test => {
    const status = test.result.success ? '✅' : '❌';
    });

  }

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
