const http = require('http');

function testEndpoint() {
  const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
  const url = `http://localhost:3001/api/inventory/my-forwarded-verifications?userId=${encodeURIComponent(storeKeeperId)}`;
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/inventory/my-forwarded-verifications?userId=${encodeURIComponent(storeKeeperId)}`,
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        } catch (e) {
        }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Cannot connect to server on port 3001');
    console.error('Error:', error.message);
    });
  
  req.on('timeout', () => {
    req.destroy();
    console.error('❌ Request timeout - server not responding');
  });
}

testEndpoint();
