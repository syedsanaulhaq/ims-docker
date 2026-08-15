const http = require('http');

const apiUrl = 'http://localhost:3001';
const userId = '4dae06b7-17cd-480b-81eb-da9c76ad5728'; // Muhammad Ehtesham Siddiqui

async function testApprovalEndpoints() {
  try {
    // Test 1: Get approvals via /api/approvals/my-approvals
    const myApprovalsRes = await fetch(`${apiUrl}/api/approvals/my-approvals?userId=${userId}&status=pending`, {
      credentials: 'include'
    });
    const myApprovalsData = await myApprovalsRes.json();
    if (myApprovalsData.data && myApprovalsData.data.length > 0) {
      const firstApproval = myApprovalsData.data[0];
      // Test 2: Get full details
      const detailRes = await fetch(`${apiUrl}/api/approvals/${firstApproval.id}`, {
        credentials: 'include'
      });
      const detailData = await detailRes.json();
      const approval = detailData.data || detailData;
      } else {
      }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testApprovalEndpoints();
