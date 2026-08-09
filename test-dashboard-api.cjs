const http = require('http');

const supervisorId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/approvals/dashboard?userId=${supervisorId}`,
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      } catch (e) {
      }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
