// Quick test to check backend connectivity from frontend context
fetch('http://localhost:3001/api/tenders')
  .then(response => {
    return response.json();
  })
  .then(data => {
    })
  .catch(error => {
    console.error('❌ Backend connection failed:', error);
  });
