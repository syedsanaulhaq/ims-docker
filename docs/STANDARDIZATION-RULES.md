# IMS Standardization Rules & Standards

**Effective Date:** December 28, 2025  
**Version:** 1.0  
**Status:** Final - No Deviations Allowed

---

## 🔒 Absolute Standards (Non-Negotiable)

### 1. Database Standard

**Single, Only Database:**
```
✅ ALWAYS use: InventoryManagementDB
❌ NEVER use: InvMISDB, ims_db, test_db, or any other database
```

**Connection Rule:**
```javascript
// backend-server.cjs ONLY connection allowed:
const config = {
  server: 'localhost',
  database: 'InventoryManagementDB',  // ← ONLY THIS
  user: 'your_username',
  password: 'your_password',
  pool: {
    max: 10,
    min: 0
  }
};
```

**Violation Consequence:** Code review rejection, must fix before merge

---

### 2. Documentation Standard

**Single Source of Truth:**
- All developers refer to `/docs` folder
- No redundant documentation
- All information must be in one place, not duplicated

**Reference Structure:**
```
/docs/
├── DEVELOPMENT-STANDARDS.md      ← Development guidelines (mandatory read)
├── DATABASE-SCHEMA.md            ← Database structure (reference)
├── ARCHITECTURE.md               ← System design (reference)
├── API-REFERENCE.md              ← API endpoints (reference)
├── TESTING.md                    ← Testing procedures (reference)
├── TROUBLESHOOTING.md            ← Problem solutions (reference)
├── CLEANUP-SUMMARY.md            ← History (reference)
└── STANDARDIZATION-RULES.md      ← This file (mandatory)
```

**No Exceptions:**
- ❌ Don't create additional documentation files
- ❌ Don't store notes outside `/docs`
- ❌ Don't reference outdated/moved documentation
- ✅ Update existing docs if information changes

---

### 3. Code Standards

**TypeScript:**
```typescript
// ✅ Correct
const result: RequestApproval = await approvalService.approveRequest(id, action);
if (result.id) {
  // Handle success
}

// ❌ Wrong
const result = await approveApproval(id);  // Method doesn't exist
if (result.success) {  // Property doesn't exist
  // Will fail
}
```

**Service Methods (ApprovalForwardingService):**
```typescript
// ✅ Available methods - USE THESE:
- approveRequest(approvalId, action)
- rejectRequest(approvalId, action)
- forwardRequest(approvalId, action)

// ❌ Non-existent methods - DON'T USE:
- approveApproval()
- rejectApproval()
- Any other variations
```

**JSX Rules:**
```typescript
// ❌ WRONG - console.log returns void
return <div>{console.log('test')}</div>

// ✅ CORRECT
return <div>content</div>
```

---

### 4. Database Rules

**Only One Database:** InventoryManagementDB
- Connection established in `backend-server.cjs`
- All queries point to this database
- No other databases referenced anywhere
- No hardcoded connection strings

**Query Standards:**
```sql
-- ✅ ALWAYS use parameterized queries:
SELECT * FROM approvals WHERE id = @id

-- ❌ NEVER use string concatenation:
SELECT * FROM approvals WHERE id = '${id}'
```

**Soft Delete Rule:**
```sql
-- ✅ Always filter active records:
SELECT * FROM item_masters 
WHERE is_deleted = 0

-- ❌ Never query without soft delete filter:
SELECT * FROM item_masters  -- Missing is_deleted check
```

---

### 5. API Standards

**Response Format (All Endpoints):**
```json
{
  "success": true,
  "data": { /* resource */ },
  "message": "Description"
}
```

**Status Codes:**
```
200 - OK (GET)
201 - Created (POST)
204 - No Content (DELETE)
400 - Bad Request (validation)
401 - Unauthorized (auth required)
403 - Forbidden (no permission)
404 - Not Found
500 - Server Error
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🎯 Development Standards (Mandatory)

### Before Writing Code

1. ✅ Read `DEVELOPMENT-STANDARDS.md` (sections relevant to task)
2. ✅ Check `DATABASE-SCHEMA.md` for table structure
3. ✅ Review `API-REFERENCE.md` for endpoint patterns
4. ✅ Verify using `InventoryManagementDB` only
5. ✅ Run TypeScript compiler: `npm run build`

### During Development

1. ✅ Follow code style (camelCase, PascalCase, UPPER_SNAKE_CASE)
2. ✅ Add type annotations to all functions
3. ✅ Use parameterized SQL queries
4. ✅ Handle errors properly
5. ✅ Write meaningful comments for complex logic
6. ✅ Test locally before committing

### Before Committing

1. ✅ No TypeScript errors: `npm run build`
2. ✅ All tests passing: `npm test`
3. ✅ Code follows standards
4. ✅ Commit message follows format: `type(scope): description`
5. ✅ Database backup created (if schema changes)

### Git Commit Message Format

```
type(scope): description

type: feat|fix|docs|style|refactor|test|chore
scope: Component or area affected

Examples:
✅ feat(approvals): Add per-item approval decisions
✅ fix(dashboard): Resolve submitted_by_name display
✅ docs: Update API reference
✅ refactor(services): Extract common logic
```

---

## 🚫 Prohibited Practices

### Database
- ❌ Using wrong database (InvMISDB, test_db, etc.)
- ❌ Hardcoded passwords or connection strings
- ❌ Dynamic SQL (string concatenation)
- ❌ Queries without soft delete filter
- ❌ Missing timestamps (created_at, updated_at)

### Code
- ❌ `any` type without justification (use `unknown` instead)
- ❌ Unhandled promises
- ❌ console.log in production code
- ❌ No error handling (try-catch, error boundaries)
- ❌ Accessing non-existent methods or properties
- ❌ Bypassing approval workflow
- ❌ Direct stock manipulation (must use workflows)

### Documentation
- ❌ Creating new documentation files outside `/docs`
- ❌ Referencing old/removed files
- ❌ Conflicting information in multiple places
- ❌ Outdated examples
- ❌ Misleading descriptions

### Deployment
- ❌ Deploying with TypeScript errors
- ❌ Deploying without tests passing
- ❌ Deploying without backup
- ❌ Deploying without code review
- ❌ Deploying wrong database connection string

---

## ✅ Required Checklist Before PR

### Code Quality
- [ ] 0 TypeScript errors
- [ ] All tests pass
- [ ] Code follows standards
- [ ] No console.log in JSX
- [ ] Proper error handling
- [ ] Type annotations present

### Database
- [ ] Using InventoryManagementDB only
- [ ] Parameterized SQL queries
- [ ] Soft delete filter present
- [ ] Timestamps included
- [ ] No schema conflicts

### Documentation
- [ ] Code comments added
- [ ] Function documentation complete
- [ ] API endpoint documented
- [ ] Database changes documented
- [ ] References updated

### Testing
- [ ] Unit tests written
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered
- [ ] Error scenarios tested

### Git
- [ ] Commit message proper format
- [ ] No merge conflicts
- [ ] Branch up-to-date with main
- [ ] Related issues referenced
- [ ] PR description clear

---

## 🔍 Code Review Standards

**Reviewer Must Verify:**

1. ✅ Code follows DEVELOPMENT-STANDARDS.md
2. ✅ Only InventoryManagementDB referenced
3. ✅ No TypeScript errors
4. ✅ Tests passing
5. ✅ API responses match API-REFERENCE.md
6. ✅ Database queries match DATABASE-SCHEMA.md
7. ✅ Documentation updated
8. ✅ No prohibited practices used

**Reviewer Can Reject If:**
- Wrong database referenced
- TypeScript errors present
- Prohibited practices used
- Standards not followed
- Tests failing
- Misleading documentation added

---

## 📊 System Inventory

### Fixed Assets

**Database:** InventoryManagementDB
- 61 tables
- 15 item_masters
- 7 categories
- 7 vendors
- 499 AspNetUsers

**Backend:** Node.js Express
- backend-server.cjs
- All API endpoints
- Business logic
- Database access

**Frontend:** React + TypeScript
- src/components/
- src/services/
- src/pages/
- Vite build

**Documentation:** `/docs` folder
- 7 reference documents
- Single source of truth
- All practices documented
- All endpoints documented

---

## 🎓 Onboarding Steps

For new developers:

1. **Read (30 min)**
   - README.md (5 min)
   - This file (10 min)
   - DEVELOPMENT-STANDARDS.md (15 min)

2. **Understand (30 min)**
   - DATABASE-SCHEMA.md - Tables overview
   - ARCHITECTURE.md - System design
   - Run database queries to see data

3. **Setup (30 min)**
   - Clone repository
   - Install dependencies: `npm install`
   - Start backend: `node backend-server.cjs`
   - Start frontend: `npm run dev`
   - Verify connection to InventoryManagementDB

4. **Practice (1 hour)**
   - Make small code change
   - Follow all standards
   - Run tests
   - Commit and push
   - Create PR

---

## 📞 Questions & Violations

### Standard Questions
- Check [DEVELOPMENT-STANDARDS.md](DEVELOPMENT-STANDARDS.md)
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Check relevant doc in `/docs`

### Standard Violations
- **Minor (style):** PR comment request to fix
- **Major (wrong database):** Immediate rejection, must fix
- **Critical (security):** Security review required before fix
- **Pattern (repeated):** Team discussion and training

---

## 🔄 Keeping Standards Updated

**When to Update Standards:**

1. New feature added → Document in DEVELOPMENT-STANDARDS.md
2. Database schema changed → Update DATABASE-SCHEMA.md
3. API endpoint added → Update API-REFERENCE.md
4. Workflow changed → Update ARCHITECTURE.md
5. New issue found → Update TROUBLESHOOTING.md

**Update Process:**
```
1. Create PR with documentation changes
2. PR must clearly explain what changed
3. Team review and approve
4. Merge to main
5. All developers review updated docs
```

---

## ⚖️ Enforcement

### Automated
- TypeScript compilation check (CI/CD)
- Test running (CI/CD)
- Code review requirement (GitHub)

### Manual
- Code reviewer verification
- Standards adherence check
- Documentation review
- PR description clarity

### Consequences
- **First violation:** Warning and education
- **Second violation:** PR rejection until fixed
- **Pattern (3+):** Team meeting and training
- **Security/Critical:** Immediate escalation

---

## 📅 This Document

- **Version:** 1.0
- **Effective:** December 28, 2025
- **Created:** System Cleanup Phase
- **Status:** FINAL - No Deviations
- **Review:** Quarterly (every 3 months)
- **Next Review:** March 28, 2026

---

**Remember:** These standards exist to:
- Keep code clean and maintainable
- Prevent costly mistakes
- Ensure consistency across team
- Protect data integrity
- Make onboarding easier

**All standards are non-negotiable unless formally changed through team consensus.**

---

**Last Updated:** December 28, 2025  
**Maintained By:** Development Team  
**Reference:** GitHub: syedsanaulhaq/ims-v2
