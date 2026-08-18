// ============================================================================
// Main Server Entry Point
// ============================================================================
// This file orchestrates the Express app and all middleware/routes
// All business logic is split into separate modules for maintainability

console.log('🚀 server/index.cjs starting...');

const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config/env.cjs');
const { initializePool } = require('./db/connection.cjs');
const corsMiddleware = require('./middleware/cors.cjs');
const requestLogger = require('./middleware/logger.cjs');

const app = express();

// ============================================================================
// Session Configuration
// ============================================================================
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: config.SESSION_MAX_AGE
  }
}));

// ============================================================================
// Global Middleware
// ============================================================================
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ims-api',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Routes (To be implemented from original backend-server.cjs)
// ============================================================================
// Import route modules here
const authRoutes = require('./routes/auth.cjs');
const usersRoutes = require('./routes/users.cjs');
const approvalsRoutes = require('./routes/approvals.cjs');
const permissionsRoutes = require('./routes/permissions.cjs');
const purchaseOrderRoutes = require('./routes/purchaseOrders.cjs');
const tenderRoutes = require('./routes/tenders.cjs');
const vendorRoutes = require('./routes/vendors.cjs');
const itemRoutes = require('./routes/items.cjs');
const categoryRoutes = require('./routes/categories.cjs');
const inventoryRoutes = require('./routes/inventory.cjs');
const stockIssuanceRoutes = require('./routes/stockIssuance.cjs');
const stockAcquisitionsRoutes = require('./routes/stockAcquisitions.cjs');
const reportsRoutes = require('./routes/reports.cjs');
const utilsRoutes = require('./routes/utils.cjs');
const deliveriesRoutes = require('./routes/deliveries.cjs');
const reorderRequestsRoutes = require('./routes/reorderRequests.cjs');
const stockReturnsRoutes = require('./routes/stockReturns.cjs');
const annualTendersRoutes = require('./routes/annualTenders.cjs');
const tenderItemsRoutes = require('./routes/tender-items.cjs');
const requiredItemsRoutes = require('./routes/requiredItems.cjs');
const wingInventoryRoutes = require('./routes/wingInventory.cjs');
const branchInventoryRoutes = require('./routes/branchInventory.cjs');

app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // Legacy mount for /api/session and /api/sso-login
app.use('/api/users', usersRoutes);
app.use('/api/ims/users', usersRoutes); // Alias for wing pages compatibility
app.use('/api/approvals', approvalsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/items-master', itemRoutes);
app.use('/api/item-masters', itemRoutes); // Alias for frontend compatibility
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-stock', inventoryRoutes); // Alias for legacy frontend calls
app.use('/api/stock-issuance', stockIssuanceRoutes);
app.use('/api/stock-acquisitions', stockAcquisitionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', utilsRoutes); // Single mount point for all utility routes
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/reorder-requests', reorderRequestsRoutes);
app.use('/api/stock-returns', stockReturnsRoutes);
app.use('/api/annual-tenders', annualTendersRoutes);
app.use('/api/tender-items', tenderItemsRoutes);
app.use('/api/required-items', requiredItemsRoutes);
app.use('/api/wing-inventory', wingInventoryRoutes);
app.use('/api/wing-request-history', wingInventoryRoutes); // Alias: requests sub-route serves history
app.use('/api/branch-inventory', branchInventoryRoutes);
app.use('/api/branch-request-history', branchInventoryRoutes); // Alias: requests sub-route serves history
app.use('/api/ims/users', require('./routes/users.cjs')); // Alias used by wing pages

// ============================================================================
// Error Handler (To be implemented)
// ============================================================================
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal server error'
//   });
// });

// ============================================================================
// Server Startup
// ============================================================================
async function startServer() {
  try {
    // Initialize database connection
    await initializePool();

    // Start listening
    app.listen(config.PORT, () => {
      console.log(`✅ Server listening on port ${config.PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Start the server
startServer();

module.exports = app;
