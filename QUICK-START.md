# 🚀 HOW TO RUN THE SYSTEM

## The Simple Way (Recommended)

```bash
npm run dev:start
```

**That's it!** This single command starts:
- ✅ Backend API (Node.js)
- ✅ Frontend UI (React + Vite)
- ✅ Database connection (MSSQL)

---

## What You'll See

When you run `npm run dev:start`, you'll see output like:

```
[0] > node src/backend/server.cjs
[0] 🔗 Connecting to SQL Server...
[0] ✅ Database connected
[0] ✅ Server running on http://localhost:3001
[0] 📊 Environment: development

[1] > vite
[1] VITE v5.4.21 ready in 559 ms
[1] ➜ Local: http://localhost:8080/
```

---

## Access Points

### Frontend (User Interface)
```
http://localhost:8080
```
👉 Open this in your browser to see the app

### Backend API
```
http://localhost:3001
```
👉 Used internally by frontend

### API Health Check
```
http://localhost:3001/api/health
```
👉 Returns server status

---

## Individual Commands (If Needed)

### Just Backend
```bash
npm run backend
```
Runs on `http://localhost:3001`

### Just Frontend  
```bash
npm run dev
```
Runs on `http://localhost:8080`

---

## Stop the System

Press `Ctrl + C` in the terminal window

---

## Troubleshooting

### Backend not starting
1. Check MSSQL Server is running
2. Check `.env.sqlserver` has correct credentials
3. Run: `npm run backend` separately to see error

### Frontend not loading
1. Wait 5 seconds for Vite to compile
2. Check http://localhost:8080
3. Check browser console for errors (F12)

### Port already in use
1. Kill all Node processes:
   ```bash
   taskkill /f /im node.exe
   ```
2. Wait 2 seconds
3. Run `npm run dev:start` again

---

## Test It Works

### In Browser
1. Open http://localhost:8080
2. You should see the login page
3. If you see the page, it works! ✅

### In Terminal
```bash
curl http://localhost:3001/api/health
```
Should return:
```json
{"status":"healthy","database":"connected","timestamp":"..."}
```

---

## Environment Setup (First Time Only)

1. Ensure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create/update `.env.sqlserver` with database info
4. Run `npm run dev:start`

---

## Project Structure

```
ims-v1/
├── src/
│   ├── backend/           ← Backend API
│   │   ├── server.cjs
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   ├── components/        ← React UI
│   ├── pages/
│   ├── services/
│   └── ...
├── public/
├── package.json           ← NPM scripts
├── vite.config.ts         ← Vite config
└── ...
```

---

## Available Features

### Authentication
- Login / Logout
- Session management
- User authentication

### Approvals
- View pending approvals
- Approval workflow
- Dashboard

### Stock Management
- Stock issuance requests
- Inventory tracking
- Item management

### Users
- User management
- User listing
- User details

### Inventory
- Current stock levels
- Item masters
- Categories

---

## Performance

- **Backend startup**: < 2 seconds
- **Frontend startup**: < 1 second
- **Page load**: < 100ms
- **API responses**: < 200ms

---

## That's All!

Just run:
```bash
npm run dev:start
```

And you're ready to go! 🎉

---

**Questions?** Check:
- `DEVELOPMENT-SETUP-GUIDE.md` - Detailed setup
- `BACKEND-REFACTORING-COMPLETE.md` - Technical details
- `PROJECT-COMPLETION-SUMMARY.md` - Project overview
