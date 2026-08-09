// Test script to check dashboard data from API
const axios = require('axios');

const testDashboardAPI = async () => {
  try {
    // Test tenders endpoint
    try {
      const tendersResponse = await axios.get('http://localhost:3001/api/tenders');
      const tenders = tendersResponse.data;
      } catch (err) {
      }

    // Test vendors endpoint
    try {
      const vendorsResponse = await axios.get('http://localhost:3001/api/vendors');
      const vendors = vendorsResponse.data;
      } catch (err) {
      }

    // Test item masters endpoint
    try {
      const itemsResponse = await axios.get('http://localhost:3001/api/item-masters');
      const items = itemsResponse.data;
      } catch (err) {
      }

    // Test stock transactions endpoint
    try {
      const stockResponse = await axios.get('http://localhost:3001/api/stock-transactions');
      const stockTransactions = stockResponse.data;
      } catch (err) {
      }

    // Test deliveries endpoint
    try {
      const deliveriesResponse = await axios.get('http://localhost:3001/api/deliveries');
      const deliveries = deliveriesResponse.data;
      } catch (err) {
      }

  } catch (error) {
    console.error('Error testing API:', error);
  }
};

testDashboardAPI();
