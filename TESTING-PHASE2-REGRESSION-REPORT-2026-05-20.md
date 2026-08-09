# IMS Testing Environment Phase-2 Regression Report

Date: 2026-05-20
Branch: develop

## Scope of Phase-2
Expand testing from baseline smoke checks to broader workflow regression coverage without destructive writes.

## Added Coverage

### 1) Cross-module API authorization regression
Validated anonymous access is blocked for core protected endpoints:
- `/api/auth/me`
- `/api/session`
- `/api/permissions/check`
- `/api/reports/dashboard`
- `/api/approvals/my-pending`
- `/api/stock-issuance/requests`
- `/api/wing-inventory/1`

Expected result: `401` or `403`

### 2) Frontend route-guard regression
Validated protected app routes redirect anonymous users to login:
- `/`
- `/dashboard`
- `/procurement/new-request`
- `/stock-acquisition`

Expected result:
- URL redirected to `/login`
- Login page branding/fields visible

### 3) Optional authenticated flow (credential-gated)
Added optional regression test for login -> me -> logout flow, executed only when:
- `TEST_USERNAME` and `TEST_PASSWORD` are provided.

Current run behavior:
- Skipped (credentials not supplied in environment)

## Test Files Added/Updated
- Added: `tests/e2e/workflow-regression.spec.ts`
- Updated: `package.json` (script `test:regression`)

## Commands Executed
1. `cmd /c npm run test:e2e`
2. `cmd /c npm run test:regression`

## Results

### Full e2e run
- Total: 6
- Passed: 5
- Skipped: 1
- Failed: 0

### Focused regression run
- Total: 3
- Passed: 2
- Skipped: 1
- Failed: 0

## Overall Status
- Baseline testing environment: Complete
- Smoke coverage: Complete
- Workflow regression (anonymous/security + route guards): Complete
- Authenticated regression flow: Implemented and ready; pending credentials to execute

## Residual Gaps (Next increment)
1. Run credentialed authenticated regression with dedicated test account.
2. Add deterministic seeded DB scenario tests for approvals and stock issuance transitions.
3. Add non-destructive API contract assertions for key list/detail endpoints.
4. Add CI job to run `npm run test:e2e` on pull requests.
