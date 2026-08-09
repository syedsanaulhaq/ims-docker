# 📍 How to Access Annual Tender System from Menu

## ✅ NEW: Menu Items Added!

Your Annual Tender pages are now visible in the **Procurement Menu** in the sidebar.

---

## 🎯 VISUAL GUIDE

### Step 1: Login to Dashboard
```
1. Go to: http://localhost:8080
2. Login with your credentials
3. You'll see the main dashboard with a sidebar on the left
```

### Step 2: Find the Procurement Menu
```
Look at the LEFT SIDEBAR and find:
┌─────────────────────────────────┐
│ 📦 Procurement Menu             │
│ ├─ Contract/Tender              │
│ ├─ Spot Purchase                │
│ ├─ Stock Acquisition            │
│ ├─ Review Requests              │
│ ├─ Vendor Management            │
│ ├─ ✨ Annual Tenders      ← CLICK HERE
│ ├─ ✨ Item Groups         ← CLICK HERE
│ ├─ ✨ Vendor Assignment   ← CLICK HERE
│ └─ ✨ Vendor Proposals    ← CLICK HERE
└─────────────────────────────────┘
```

### Step 3: Click on Annual Tenders
```
Click on "Annual Tenders" in the menu
→ Takes you to: /dashboard/annual-tenders
```

---

## 📋 MENU STRUCTURE

### Procurement Menu Items (Updated)
| Menu Item | Icon | Purpose |
|-----------|------|---------|
| Contract/Tender | 📄 | General tenders |
| Spot Purchase | 🛒 | Quick purchases |
| Stock Acquisition | 📦 | Acquisition dashboard |
| Review Requests | ✅ | Review requests |
| Vendor Management | 🏢 | Manage vendors |
| **Annual Tenders** | 📄 | **Framework agreements** |
| **Item Groups** | 📦 | **Product groups** |
| **Vendor Assignment** | 👥 | **Assign vendors to groups** |
| **Vendor Proposals** | 🛒 | **Item pricing** |

---

## 🎬 QUICK TEST WORKFLOW

### Test 1: Access from Menu
```
1. Login to dashboard
2. Look at LEFT SIDEBAR
3. Find "Procurement Menu" section
4. Click "Annual Tenders"
5. Should see: "Create Annual Tender" button ✅
```

### Test 2: Create Item Group
```
1. Click "Item Groups" in menu
2. Click "Create Item Group"
3. Fill form:
   - Group Code: FUR-001
   - Group Name: Furniture
4. Click "Create Group"
5. Success! ✅
```

### Test 3: Create Annual Tender
```
1. Click "Annual Tenders" in menu
2. Click "Create Annual Tender"
3. Fill form:
   - Tender Number: AT-2026-001
   - Title: Test Tender
   - Budget: 500000
4. Select Item Group
5. Click "Create Tender"
6. Success! ✅
```

---

## 🔍 If You Can't See the Menu

**Problem 1: Sidebar collapsed**
- Look for menu icon (☰) at top left
- Click to expand sidebar

**Problem 2: Procurement Menu not visible**
- Scroll down in sidebar (may have many menus)
- Look for "🏢 Procurement Menu"

**Problem 3: No permissions**
- Need 'procurement.manage' permission
- Contact admin to grant permission
- Or try logging in as admin user

**Problem 4: Pages still loading**
- Clear browser cache: Ctrl+Shift+Delete
- Refresh page: F5
- Restart servers:
  - Terminal 1: `npm run backend`
  - Terminal 2: `npm run dev`

---

## 📱 Desktop vs Mobile View

### Desktop (1920px+)
- Sidebar always visible on left
- Menu items fully labeled
- Easy to click

### Tablet (768px - 1024px)
- Sidebar may collapse to icons
- Hover to see full names
- Click icon to expand

### Mobile (< 768px)
- Menu button (☰) at top
- Click to open sidebar
- Full labels when open

---

## 🖥️ DIRECT URL ACCESS

If menu doesn't work, use direct URLs:

| Page | Direct URL |
|------|-----------|
| Annual Tenders | http://localhost:8080/dashboard/annual-tenders |
| Item Groups | http://localhost:8080/dashboard/item-groups |
| Vendor Assignment | http://localhost:8080/dashboard/vendor-assignment |
| Vendor Proposals | http://localhost:8080/dashboard/vendor-proposals |

**Just type in address bar and press Enter**

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend running: `npm run backend`
- [ ] Frontend running: `npm run dev`
- [ ] Logged in to http://localhost:8080
- [ ] Can see Procurement Menu in left sidebar
- [ ] Can see 4 new Annual Tender items
- [ ] Can click on "Annual Tenders"
- [ ] Page loads without errors
- [ ] See "Create Annual Tender" button
- [ ] Can create item groups
- [ ] Can create annual tenders

---

## 🆘 TROUBLESHOOTING

### "I see old menu without Annual Tender items"
**Solution:** Clear browser cache and restart servers
```
1. Press Ctrl+Shift+Delete to clear cache
2. Refresh page (F5 or Ctrl+R)
3. If still not showing:
   - Kill backend: taskkill /F /IM node.exe
   - Kill frontend: taskkill /F /IM node.exe
   - Restart both: npm run dev:start
```

### "Menu items are there but pages show blank"
**Solution:** Check browser console for errors
```
1. Press F12 to open DevTools
2. Click "Console" tab
3. Look for red error messages
4. Screenshot and share with support
```

### "Can't click menu items"
**Solution:** Ensure permissions
```
1. You need 'procurement.manage' permission
2. Login as admin user
3. Go to Settings → Roles
4. Assign permission to your user
5. Logout and login again
```

---

## 📊 WHAT'S SHOWING IN THE MENU

### The 4 New Menu Items:

**1. Annual Tenders** 📄
- Create year-long vendor contracts
- Manage framework agreements
- Track tender lifecycle

**2. Item Groups** 📦
- Create product groups
- Organize items by category
- Manage group definitions

**3. Vendor Assignment** 👥
- Assign vendors to groups
- Multi-vendor selection
- Group-vendor mapping

**4. Vendor Proposals** 🛒
- Enter item pricing
- Admin sets unit prices
- Vendor-item pricing matrix

---

## 🎯 WORKFLOW USING MENU

```
START
  ↓
Click "Item Groups" 
  → Create groups
  ↓
Click "Annual Tenders"
  → Create tender
  → Select groups
  ↓
Click "Vendor Assignment"
  → Select tender
  → Assign vendors to groups
  ↓
Click "Vendor Proposals"
  → Select tender & vendor
  → Enter item prices
  ↓
END (Ready for PO creation)
```

---

## 🎉 YOU'RE ALL SET!

The Annual Tender System is now fully accessible from:
- ✅ The menu (easiest)
- ✅ Direct URLs (if menu not working)
- ✅ Browser address bar

**Start by clicking "Annual Tenders" in the Procurement Menu!**

---

**Last Updated:** January 7, 2026
**Status:** ✅ Menu Items Added & Working
**Server Status:** Ready to test
