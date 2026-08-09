// Simple API Test Script
// This tests the invmisApi service directly from the frontend

import { invmisApi } from './src/services/invmisApi.js';

async function testInvMISApis() {
  const tests = [
    {
      name: 'Dashboard Summary',
      test: () => invmisApi.dashboard.getSummary(),
    },
    {
      name: 'Get All Users',
      test: () => invmisApi.users.getAll(),
    },
    {
      name: 'Get All Offices',
      test: () => invmisApi.offices.getAll(),
    },
    {
      name: 'Get All Categories',
      test: () => invmisApi.categories.getAll(),
    },
    {
      name: 'Get All Items',
      test: () => invmisApi.items.getAll(),
    },
    {
      name: 'Get Current Stock',
      test: () => invmisApi.stock.getCurrent(),
    },
    {
      name: 'Get Tender Awards',
      test: () => invmisApi.tenders.getAwards(),
    },
    {
      name: 'Get All Deliveries',
      test: () => invmisApi.deliveries.getAll(),
    },
  ];

  const results = [];

  for (const { name, test } of tests) {
    try {
      const startTime = Date.now();
      const result = await test();
      const duration = Date.now() - startTime;
      
      if (result && result.success !== false) {
        if (result.success) {
          }
        results.push({ name, status: 'success', duration, result });
      } else {
        results.push({ name, status: 'failed', error: result });
      }
    } catch (error) {
      results.push({ name, status: 'exception', error: error.message });
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const exceptions = results.filter(r => r.status === 'exception').length;
  
  const successRate = Math.round((successful / results.length) * 100);
  if (successful === results.length) {
    } else {
    results.filter(r => r.status !== 'success').forEach(r => {
      });
  }
  
  return results;
}

// Export for browser console use
window.testInvMISApis = testInvMISApis;
