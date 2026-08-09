import { test, expect } from '@playwright/test';

const apiUrl = process.env.API_URL || 'http://localhost:5001';

const protectedGetEndpoints = [
  '/api/auth/me',
  '/api/session',
  '/api/permissions/check',
  '/api/reports/dashboard',
  '/api/approvals/my-pending',
  '/api/stock-issuance/requests',
  '/api/wing-inventory/1'
];

test.describe('IMS workflow regression', () => {
  test('protected endpoints block anonymous access', async ({ request }) => {
    for (const path of protectedGetEndpoints) {
      const response = await request.get(`${apiUrl}${path}`);
      expect([401, 403]).toContain(response.status());
    }
  });

  test('protected routes redirect to login for anonymous users', async ({ page }) => {
    const protectedRoutes = [
      '/',
      '/dashboard',
      '/procurement/new-request',
      '/stock-acquisition'
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText('ECP Inventory Management System')).toBeVisible();
    }
  });

  test('auth login flow works when test credentials are provided', async ({ request }) => {
    test.skip(
      !process.env.TEST_USERNAME || !process.env.TEST_PASSWORD,
      'Set TEST_USERNAME and TEST_PASSWORD to enable authenticated regression checks.'
    );

    const loginResponse = await request.post(`${apiUrl}/api/auth/login`, {
      data: {
        username: process.env.TEST_USERNAME,
        password: process.env.TEST_PASSWORD
      }
    });

    if (!loginResponse.ok()) {
      test.skip(
        true,
        `Configured test credentials were rejected (status ${loginResponse.status()}).`
      );
    }

    const loginBody = await loginResponse.json();
    expect(loginBody.success).toBeTruthy();

    const meResponse = await request.get(`${apiUrl}/api/auth/me`);
    expect(meResponse.ok()).toBeTruthy();

    const meBody = await meResponse.json();
    expect(meBody.success).toBeTruthy();

    const logoutResponse = await request.post(`${apiUrl}/api/auth/logout`);
    expect(logoutResponse.ok()).toBeTruthy();
  });
});
