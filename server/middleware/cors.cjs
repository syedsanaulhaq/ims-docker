// CORS middleware configuration
const cors = require('cors');
const config = require('../config/env.cjs');

const corsMiddleware = cors({
  origin: config.CORS_ORIGINS,
  credentials: true
});

module.exports = corsMiddleware;
