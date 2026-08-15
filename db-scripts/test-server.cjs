const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors({ credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'test server working' });
});

app.listen(PORT, () => {
  });