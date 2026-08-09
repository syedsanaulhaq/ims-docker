import { test, expect } from '@playwright/test';

const apiUrl = process.env.API_URL || 'http://localhost:5001';

test.describe('IMS system smoke', () => {
  test('backend health endpoint responds', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('ims-api');
  });

  test('frontend login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ECP Inventory Management System')).toBeVisible();
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('session endpoint rejects anonymous user', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/session`);
    expect(response.status()).toBe(401);
  });
});
