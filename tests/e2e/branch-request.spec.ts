import { test, expect } from '@playwright/test';

test.describe('Branch Request Workflow', () => {
  test('Branch Supervisor can login and request GRP-03-002 and GRP-03-003', async ({ page }) => {
    // Listen to console logs in the page
    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    });

    // 1. Navigate to the login page
    await page.goto('/login');
    await expect(page.getByText('ECP Inventory Management System')).toBeVisible();

    // 2. Login as Ehtesham (Branch Supervisor)
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();

    // 3. Wait for redirect to dashboard after successful login
    await page.waitForURL(/\/personal-dashboard/);

    // 4. Navigate to the Branch Stock Request page
    await page.goto('/dashboard/stock-issuance-branch');

    // Wait a couple of seconds for the session context to load completely
    await page.waitForTimeout(2000);

    // Assert using the specific class selector to avoid strict mode violation with layout title
    await expect(page.locator('h1.text-3xl')).toContainText('Branch Stock Request');

    // 5. Search for GRP-03-002 (Air Freshener)
    await page.getByPlaceholder('Search inventory items...').fill('GRP-03-002');
    
    // Wait for the item to render and click the plus button next to it inside the search container
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-03-002]' }).locator('button').click();

    // Verify it is added to the selected items table (the table displays the item nomenclature without the code prefix)
    await expect(page.locator('table').getByText('Air Freshener (Fresco or equivalent 300ml.) For Air Freshener Dispenser', { exact: true })).toBeVisible();

    // 6. Search for GRP-03-003 (Air Freshener Dispenser)
    await page.getByPlaceholder('Search inventory items...').fill('GRP-03-003');
    
    // Click the plus button next to it inside the search container
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-03-003]' }).locator('button').click();

    // Verify both items are added
    await expect(page.locator('table').getByText('Air Freshener Dispenser', { exact: true })).toBeVisible();

    // 7. Enter justification/purpose
    const justificationTextarea = page.getByPlaceholder('Explain why these items are needed for your branch').first();
    await justificationTextarea.fill('Branch stock request for Air Fresheners (GRP-03-002) and Dispensers (GRP-03-003) - Automated test.');

    // 8. Submit the request
    const submitBtn = page.getByRole('button', { name: 'Submit Branch Request' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 9. Verify the success message and that it redirects to the branch dashboard
    await expect(page.getByText('Branch request submitted successfully!')).toBeVisible();
    await page.waitForURL(/\/dashboard\/branch-dashboard/, { timeout: 15000 });
  });
});
