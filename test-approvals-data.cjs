const http = require('http');

// Test the /api/approvals/my-approvals endpoint
const testUserId = 'b4ccc850-c1ae-495e-9b01-019ca8fc8c5e'; // Replace with actual user ID

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/approvals/my-approvals?userId=${testUserId}&status=pending`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
