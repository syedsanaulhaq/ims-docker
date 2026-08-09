const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/my-approval-history',
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
    try {
      const parsed = JSON.parse(data);
      if (parsed.requests && parsed.requests.length > 0) {
        const first = parsed.requests[0];
        } else {
        }
    } catch (err) {
      console.error('❌ Error parsing response:', err.message);
      }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
});

req.end();
