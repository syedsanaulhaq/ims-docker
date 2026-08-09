# Complete Server Setup Guide for IMS (Inventory Management System)

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Server Setup](#backend-server-setup)
4. [Frontend Setup](#frontend-setup)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher (22.16.0 recommended)
- **SQL Server**: 2019, 2022, or SQL Server Express
- **Git**: Latest version
- **Text Editor**: VS Code (recommended)

### System Requirements
- **OS**: Windows Server 2019/2022 or Windows 10/11
- **RAM**: Minimum 4GB (8GB+ recommended)
- **Disk Space**: Minimum 10GB free space
- **Network**: Static IP address for production server

---

## Database Setup

### 1. SQL Server Installation

#### Option A: SQL Server Express (Free)
```powershell
# Download SQL Server 2022 Express from Microsoft
# https://www.microsoft.com/en-us/sql-server/sql-server-downloads

# During installation:
# - Choose "Basic" installation type
# - Accept default instance name (SQLEXPRESS) or use custom name
# - Enable Mixed Mode Authentication
# - Set a strong SA password
# - Enable Named Pipes and TCP/IP protocols
```

#### Option B: Full SQL Server
```powershell
# Use existing SQL Server 2019/2022 installation
# Ensure TCP/IP is enabled in SQL Server Configuration Manager
```

### 2. Create Database and Initial Schema

#### Step 1: Connect to SQL Server
```sql
-- Using SQL Server Management Studio (SSMS) or Azure Data Studio
-- Connect with:
-- Server: localhost\SQLEXPRESS (or your instance name)
-- Authentication: Windows or SQL Server Authentication
```

#### Step 2: Create Database
```sql
-- Create the main database
CREATE DATABASE InventoryManagementDB;
GO

USE InventoryManagementDB;
GO
```

#### Step 3: Run Migration Scripts
```powershell
# Navigate to project directory
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Run all SQL migration files in order
# The key migration files are already in the root directory:
# - add-approval-fields-simple.sql
# - add-category-codes.sql
# - add-custom-items-support.sql
# - add-dual-pricing-safe.sql
# - add-finalized-status-to-acquisitions.sql
# - add-inventory-verification-workflow.sql
# - add-purchase-orders.sql
# And many more...

# You can run them manually in SSMS or use sqlcmd:
sqlcmd -S localhost\SQLEXPRESS -d InventoryManagementDB -i add-approval-fields-simple.sql
sqlcmd -S localhost\SQLEXPRESS -d InventoryManagementDB -i add-category-codes.sql
# ... continue for each migration file
```

### 3. Configure Database Connection

#### Create `server/config/database.config.cjs`
```javascript
module.exports = {
  user: 'your_username',           // e.g., 'sa' or Windows account
  password: 'your_password',       // SQL Server password
  server: 'localhost\\SQLEXPRESS', // Or your server address
  database: 'InventoryManagementDB',
  options: {
    encrypt: true,                 // Use encryption for Azure
    trustServerCertificate: true,  // Trust self-signed certificates
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS',    // Instance name if using named instance
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};
```

---

## Backend Server Setup

### 1. Install Node.js Dependencies

```powershell
# Navigate to project root
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Install backend dependencies
npm install

# Key dependencies installed:
# - express: ^4.18.2 (Web framework)
# - mssql: ^9.1.1 (SQL Server driver)
# - cors: ^2.8.5 (CORS middleware)
# - multer: ^2.0.1 (File upload)
# - csv-parse: ^5.6.0 (CSV parsing)
# - dotenv: ^16.0.3 (Environment variables)
```

### 2. Configure Environment Variables

#### Create `.env` file in root directory
```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_USER=your_username
DB_PASSWORD=your_password
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=InventoryManagementDB
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# JWT Configuration (if using authentication)
JWT_SECRET=your-very-secure-random-string-here-minimum-32-characters
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CORS_ORIGIN=http://localhost:8080,http://your-domain.com
```

### 3. Test Database Connection

```powershell
# Create a test script: test-db-connection.cjs
node -e "const { getPool } = require('./server/config/connection.cjs'); (async () => { try { const pool = await getPool(); console.log('✅ Database connected successfully!'); const result = await pool.request().query('SELECT @@VERSION as version'); console.log('SQL Server Version:', result.recordset[0].version); } catch (err) { console.error('❌ Database connection failed:', err.message); } })();"
```

### 4. Start Backend Server

#### Development Mode
```powershell
# Start with nodemon (auto-restart on changes)
npm run dev:start

# Or using the concurrently script
npm run dev

# Server should start on http://localhost:3001
# You should see: "✅ Server is running on port 3001"
```

#### Production Mode
```powershell
# Start with PM2 (process manager)
npm install -g pm2

# Start the server
pm2 start server/index.cjs --name ims-backend

# View logs
pm2 logs ims-backend

# Set to auto-start on system boot
pm2 startup
pm2 save

# Other useful PM2 commands
pm2 list              # List all processes
pm2 restart ims-backend  # Restart server
pm2 stop ims-backend     # Stop server
pm2 delete ims-backend   # Remove from PM2
```

### 5. Verify Backend Endpoints

```powershell
# Test health check endpoint
curl http://localhost:3001/api/health

# Test vendors endpoint
curl http://localhost:3001/api/vendors

# Test tenders endpoint
curl http://localhost:3001/api/tenders
```

---

## Frontend Setup

### 1. Install Frontend Dependencies

```powershell
# In the same project root directory
# Dependencies are already in package.json

npm install

# Key frontend dependencies:
# - react: ^18.2.0
# - react-dom: ^18.2.0
# - vite: ^5.0.8 (Build tool)
# - typescript: ^5.2.2
# - tailwindcss: ^3.3.0
# - shadcn/ui components
```

### 2. Configure Frontend Environment

#### Create `.env.local` file
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_PORT=3001

# Environment
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_CSV_UPLOAD=true
VITE_ENABLE_NOTIFICATIONS=true
```

### 3. Build Frontend

#### Development Mode
```powershell
# Start Vite dev server
npm run dev

# Frontend will be available at http://localhost:8080
```

#### Production Build
```powershell
# Build for production
npm run build

# Output will be in ./dist directory
# Files are optimized and minified

# Preview production build locally
npm run preview
```

### 4. Serve Production Build

#### Option A: Using http-server (Simple)
```powershell
# Install http-server globally
npm install -g http-server

# Serve the dist folder
cd dist
http-server -p 8080 -c-1
```

#### Option B: Using IIS (Windows Server)
```powershell
# 1. Install IIS
Install-WindowsFeature -name Web-Server -IncludeManagementTools

# 2. Install URL Rewrite Module
# Download from: https://www.iis.net/downloads/microsoft/url-rewrite

# 3. Create website in IIS Manager
# - Site name: IMS-Frontend
# - Physical path: E:\ECP-Projects\inventory-management-system-ims\ims-v1\dist
# - Binding: http, port 8080

# 4. Add web.config to dist folder
```

#### web.config for IIS (create in dist folder after build)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

#### Option C: Using PM2 with serve
```powershell
# Install serve globally
npm install -g serve

# Start frontend with PM2
pm2 start "serve -s dist -l 8080" --name ims-frontend

# View logs
pm2 logs ims-frontend
```

---

## Production Deployment

### 1. Server Preparation

#### Set Static IP Address
```powershell
# Configure static IP in Windows Server
# Network and Sharing Center > Change adapter settings
# Right-click adapter > Properties > IPv4 > Use the following IP address
# IP: 192.168.1.100 (example)
# Subnet: 255.255.255.0
# Gateway: 192.168.1.1
# DNS: 8.8.8.8, 8.8.4.4
```

#### Configure Windows Firewall
```powershell
# Allow port 3001 (backend)
New-NetFirewallRule -DisplayName "IMS Backend API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Allow port 8080 (frontend)
New-NetFirewallRule -DisplayName "IMS Frontend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow

# If using SQL Server Express, allow port 1433
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
```

### 2. Production Environment Setup

#### Update `.env` for production
```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DB_SERVER=localhost\\SQLEXPRESS
CORS_ORIGIN=http://192.168.1.100:8080
```

#### Update `.env.local` for production frontend
```env
VITE_API_BASE_URL=http://192.168.1.100:3001/api
```

### 3. Deploy Application

```powershell
# 1. Clone repository on production server
git clone https://github.com/syedsanaulhaq/ims-v2.git
cd ims-v2

# 2. Checkout stable branch
git checkout stable-nov11-production

# 3. Install dependencies
npm install

# 4. Build frontend
npm run build

# 5. Start backend with PM2
pm2 start server/index.cjs --name ims-backend

# 6. Serve frontend
pm2 start "serve -s dist -l 8080" --name ims-frontend

# 7. Save PM2 configuration
pm2 save
pm2 startup

# 8. Set auto-start on Windows
# Run the command output by pm2 startup
```

### 4. Setup Scheduled Backups

#### Create backup script: `backup-db.ps1`
```powershell
# SQL Server Database Backup Script
$date = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupPath = "E:\Backups\IMS"
$backupFile = "$backupPath\InventoryManagementDB-$date.bak"

# Create backup directory if not exists
if (!(Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath
}

# Backup database
sqlcmd -S "localhost\SQLEXPRESS" -Q "BACKUP DATABASE [InventoryManagementDB] TO DISK = N'$backupFile' WITH FORMAT, INIT, NAME = N'IMS-Full-Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10"

Write-Host "✅ Backup completed: $backupFile"

# Delete backups older than 30 days
Get-ChildItem $backupPath -Filter "*.bak" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | Remove-Item
```

#### Schedule backup task
```powershell
# Create scheduled task to run daily at 2 AM
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File E:\ECP-Projects\inventory-management-system-ims\ims-v1\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "IMS-DatabaseBackup" -Action $action -Trigger $trigger -Principal $principal -Description "Daily backup of IMS database"
```

---

## Troubleshooting

### Backend Issues

#### Issue: Cannot connect to database
```powershell
# Check SQL Server is running
Get-Service | Where-Object {$_.DisplayName -like "*SQL Server*"}

# Start SQL Server if stopped
Start-Service -Name "MSSQL$SQLEXPRESS"

# Test connection
sqlcmd -S localhost\SQLEXPRESS -Q "SELECT @@VERSION"

# Check SQL Server Configuration Manager:
# - TCP/IP protocol enabled
# - Named Pipes enabled
# - SQL Server Browser service running
```

#### Issue: Port 3001 already in use
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in .env file
PORT=3002
```

#### Issue: CORS errors
```powershell
# Update CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:8080,http://192.168.1.100:8080

# Restart backend server
pm2 restart ims-backend
```

### Frontend Issues

#### Issue: API calls failing (404 errors)
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Verify VITE_API_BASE_URL in .env.local
VITE_API_BASE_URL=http://localhost:3001/api

# Rebuild frontend
npm run build
```

#### Issue: Blank page after deployment
```powershell
# Check browser console for errors
# Usually related to incorrect base URL

# Update vite.config.ts if deploying to subdirectory
base: '/ims/'

# Rebuild
npm run build
```

### Database Issues

#### Issue: Invalid column name errors
```sql
-- Check table schema
USE InventoryManagementDB;
GO

-- List all tables
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Check specific table columns
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tender_items';

-- Run missing migrations if columns don't exist
```

#### Issue: Connection timeout
```sql
-- Check SQL Server network configuration
-- SQL Server Configuration Manager > SQL Server Network Configuration
-- Protocols for SQLEXPRESS > TCP/IP > Enabled

-- Check firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*SQL*"}
```

---

## Performance Optimization

### Backend Optimization

```javascript
// Enable compression in server/index.cjs
const compression = require('compression');
app.use(compression());

// Add request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  next();
});

// Enable connection pooling (already configured)
pool: {
  max: 10,      // Maximum connections
  min: 2,       // Minimum connections
  idleTimeoutMillis: 30000
}
```

### Frontend Optimization

```powershell
# Analyze bundle size
npm run build -- --report

# Use production build (minified, tree-shaken)
npm run build

# Enable Brotli compression in IIS
# IIS Manager > Compression > Enable static/dynamic compression
```

### Database Optimization

```sql
-- Create indexes for frequently queried columns
CREATE INDEX IX_TenderItems_TenderId ON tender_items(tender_id);
CREATE INDEX IX_TenderItems_VendorId ON tender_items(vendor_id);
CREATE INDEX IX_PurchaseOrders_TenderId ON purchase_orders(tender_id);

-- Update statistics
UPDATE STATISTICS tender_items;
UPDATE STATISTICS vendors;
UPDATE STATISTICS item_masters;

-- Rebuild fragmented indexes
ALTER INDEX ALL ON tender_items REBUILD;
```

---

## Monitoring and Logging

### PM2 Monitoring

```powershell
# View real-time logs
pm2 logs

# Monitor CPU and memory usage
pm2 monit

# Generate full report
pm2 report

# View detailed process info
pm2 show ims-backend
```

### Application Logs

```javascript
// Backend logs are in console
// Redirect to file with PM2
pm2 start server/index.cjs --name ims-backend --output ./logs/out.log --error ./logs/error.log
```

### Database Monitoring

```sql
-- Monitor active connections
SELECT 
    session_id,
    login_name,
    program_name,
    client_interface_name,
    login_time,
    last_request_start_time
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('InventoryManagementDB');

-- Check long-running queries
SELECT 
    r.session_id,
    r.status,
    r.command,
    r.cpu_time,
    r.total_elapsed_time,
    t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID
ORDER BY r.total_elapsed_time DESC;
```

---

## Security Checklist

### Backend Security
- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable HTTPS in production (use reverse proxy like nginx)
- [ ] Implement rate limiting for API endpoints
- [ ] Sanitize user inputs to prevent SQL injection
- [ ] Use parameterized queries (already implemented)
- [ ] Enable CORS only for trusted origins
- [ ] Set secure HTTP headers (helmet middleware)
- [ ] Implement request validation and authentication

### Database Security
- [ ] Use strong SA password
- [ ] Create separate database user for application (not SA)
- [ ] Grant minimal required permissions
- [ ] Enable SQL Server encryption
- [ ] Regular security patches and updates
- [ ] Enable SQL Server auditing
- [ ] Implement database backup encryption

### Network Security
- [ ] Use firewall rules to restrict access
- [ ] Change default ports if possible
- [ ] Use VPN for remote database access
- [ ] Implement IP whitelisting
- [ ] Enable Windows Defender
- [ ] Regular security updates

---

## Quick Reference

### Common Commands

```powershell
# Start development servers
npm run dev

# Build for production
npm run build

# Start backend only
npm run dev:start

# Start frontend only
npm run dev:client

# Restart PM2 services
pm2 restart all

# View logs
pm2 logs

# Database backup
.\backup-db.ps1

# Git updates
git pull origin stable-nov11-production
npm install
npm run build
pm2 restart all
```

### Important URLs

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001/api
- **API Health**: http://localhost:3001/api/health
- **GitHub Repo**: https://github.com/syedsanaulhaq/ims-v2

### Key Files

- **Backend Entry**: `server/index.cjs`
- **Database Config**: `server/config/connection.cjs`
- **Environment**: `.env`
- **Frontend Config**: `vite.config.ts`
- **Frontend Entry**: `src/main.tsx`

---

## Support and Maintenance

### Monthly Maintenance Tasks
1. Review and rotate database backups
2. Update Node.js dependencies (`npm outdated`, `npm update`)
3. Review application logs for errors
4. Monitor disk space and database size
5. Review and optimize slow queries
6. Security patches for OS and SQL Server

### Emergency Contacts
- Database Issues: Check SQL Server error logs
- Application Issues: Check PM2 logs (`pm2 logs`)
- Network Issues: Check firewall and network configuration

---

## Version History

- **v1.0** - Initial setup (November 2025)
- **v1.1** - Added CSV bulk upload for annual tenders
- **v1.2** - Fixed tender details display and vendor management
- **v1.3** - Added purchase order form enhancements

---

**Last Updated**: January 29, 2026  
**Maintained By**: Development Team  
**Branch**: stable-nov11-production
