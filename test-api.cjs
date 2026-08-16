const http = require('http');

http.get('http://127.0.0.1:3000/api/items-master', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const items = json.items || [];
      const target = items.find(i => i.item_code === 'GRP-03-002' || (i.nomenclature && i.nomenclature.includes('Air Freshener')));
      console.log('Target item:', target);
      if(!target) {
        console.log("Could not find GRP-03-002 in API response.");
        console.log("Sample items:", items.slice(0, 2));
      }
    } catch(e) {
      console.log("Error parsing JSON:", e.message);
    }
  });
}).on('error', e => console.error(e));
