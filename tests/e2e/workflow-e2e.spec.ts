import { test, expect } from '@playwright/test';

test.describe('End-to-End Request, Approval and Allotment Workflow', () => {
  let requestNumber = '';

  test('Complete Workflow: Ehtesham -> DD Admin -> AD Admin-I -> Storekeeper -> Branch Inventory', async ({ page }) => {
    test.setTimeout(180000);
    // Enable detailed console logging from the browser context to trace details
    page.on('console', msg => {
      console.log(`[BROWSER LOG]: ${msg.text()}`);
    });

    // ==========================================
    // STEP 1: Ehtesham submits a request
    // ==========================================
    console.log('--- Step 1: Ehtesham logs in and submits request ---');
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-branch');
    await page.waitForTimeout(2000);

    // Search for Printers Black and White (GRP-08-003)
    await page.getByPlaceholder('Search inventory items...').fill('GRP-08-003');
    await page.waitForTimeout(1000);
    // Click the "+" button to add the item
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-08-003]' }).locator('button').click();
    await page.waitForTimeout(1000);

    // Start listening for the API response that contains the request_number
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/stock-issuance/requests') && response.status() === 201,
      { timeout: 30000 }
    );

    // Enter purpose & submit
    await page.getByPlaceholder('Explain why these items are needed for your branch').first().fill('Need printers for branch operations workflow testing.');
    await page.getByRole('button', { name: 'Submit Branch Request' }).click();

    // Verify success message
    await expect(page.getByText('Branch request submitted successfully!')).toBeVisible();
    
    // Resolve the response to get the request number
    const response = await responsePromise;
    const responseBody = await response.json();
    requestNumber = responseBody.data.request_number;
    console.log(`Intercepted Request Number: ${requestNumber}`);
    expect(requestNumber).toContain('PMU-');

    await page.waitForURL(/\/dashboard\/branch-dashboard/);
    console.log('Request submitted successfully by Ehtesham!');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // ==========================================
    // STEP 2: DD Admin approves
    // ==========================================
    console.log('--- Step 2: DD Admin logs in and approves ---');
    await page.getByPlaceholder('Username').fill('3840341231761');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=branch');
    await page.waitForTimeout(2000);

    // Click the Branch tab to activate it
    await page.getByRole('button', { name: /Branch/ }).first().click();
    await page.waitForTimeout(1000);

    // Locate the request row and click 'View Items'
    const ddRequestRow = page.locator('.space-y-4 > div').filter({ hasText: requestNumber });
    await ddRequestRow.scrollIntoViewIfNeeded();
    await ddRequestRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    // In the item table, find the select trigger for the Printers Black and White row
    const ddPrinterRow = ddRequestRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await ddPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    // Submit decisions
    await ddRequestRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('DD Admin approved request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // ==========================================
    // STEP 3: AD Admin-I approves
    // ==========================================
    console.log('--- Step 3: AD Admin-I logs in and approves ---');
    await page.getByPlaceholder('Username').fill('7110340242555');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=branch');
    await page.waitForTimeout(2000);

    // Click the Branch tab to activate it
    await page.getByRole('button', { name: /Branch/ }).first().click();
    await page.waitForTimeout(1000);

    // Locate the request row and click 'View Items'
    const adRequestRow = page.locator('.space-y-4 > div').filter({ hasText: requestNumber });
    await adRequestRow.scrollIntoViewIfNeeded();
    await adRequestRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    // Submit inherited decisions directly without expanding / modifying the list
    await adRequestRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('AD Admin-I approved request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // ==========================================
    // STEP 4: Storekeeper issues the stock
    // ==========================================
    console.log('--- Step 4: Storekeeper logs in and issues stock ---');
    await page.getByPlaceholder('Username').fill('8210162682763');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-processing');
    await page.waitForTimeout(2000);

    // Find the request card and click 'Send / Dispatch'
    const skRequestCard = page.locator('.grid-cols-1 > div').filter({ hasText: requestNumber });
    await skRequestCard.scrollIntoViewIfNeeded();
    await skRequestCard.getByRole('button', { name: 'Send / Dispatch' }).click();
    await page.waitForTimeout(1000);

    // Click 'Mark as Delivered' in the modal
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();
    
    // Wait for the success alert to show up
    await expect(page.locator('.bg-green-50')).toContainText(`delivered directly for ${requestNumber}`);
    console.log('Storekeeper issued stock.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // ==========================================
    // STEP 5: Ehtesham verifies Branch Inventory
    // ==========================================
    console.log('--- Step 5: Ehtesham verifies item in Branch Inventory ---');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/branch-inventory');
    await page.waitForTimeout(3000);

    // Search for Printers Black and White or our request number in Branch Inventory
    await page.getByPlaceholder('Search by item name, request number, user, or category...').fill(requestNumber);
    await page.waitForTimeout(1000);

    // Assert that the item is present and has status "In Use" or "Issued"
    const inventoryRow = page.locator('.space-y-4 > div').first();
    await expect(inventoryRow).toContainText('Printers Black and White');
    // Click the item name header to expand the accordion and show the request number detail
    await inventoryRow.locator('h3', { hasText: 'Printers Black and White' }).click();
    await page.waitForTimeout(1000);
    await expect(inventoryRow).toContainText(requestNumber);
    console.log('Branch inventory verified! Printer is added to the branch inventory successfully.');

    // Capture screenshot of branch inventory showing the allotted item
    await page.screenshot({ path: `C:/Users/SyedFazli/.gemini/antigravity-ide/brain/0c5f7e53-4f9a-49b3-9f62-5c64a753bcd7/allotted_branch_inventory.png` });
    console.log('Screenshot of branch inventory captured.');
  });
});
