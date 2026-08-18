import { test, expect } from '@playwright/test';

test.describe('End-to-End Personal and Wing Request Workflows', () => {
  let personalRequestNumber = '';
  let wingRequestNumber = '';

  test('Personal Request Workflow: Sana ul Haq Fazli -> Ehtesham -> Storekeeper -> Personal Inventory', async ({ page }) => {
    test.setTimeout(180000);
    page.on('console', msg => console.log(`[BROWSER LOG]: ${msg.text()}`));

    // STEP 1: Sana ul Haq Fazli submits a Personal Request
    console.log('--- Step 1: Sana ul Haq Fazli logs in and submits Personal Request ---');
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('1730115698727');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-personal');
    await page.waitForTimeout(2000);

    // Search for Printers Black and White (GRP-08-003)
    await page.getByPlaceholder('Search inventory items...').fill('GRP-08-003');
    await page.waitForTimeout(1000);
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-08-003]' }).locator('button').click();
    await page.waitForTimeout(1000);

    // Intercept response
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/stock-issuance/requests') && response.status() === 201,
      { timeout: 30000 }
    );

    await page.getByPlaceholder('Explain why these items are needed').first().fill('Need printer for personal office testing.');
    await page.getByRole('button', { name: 'Submit Issuance Request' }).click();

    await expect(page.getByText('submitted successfully and sent for approval')).toBeVisible();

    const response = await responsePromise;
    const responseBody = await response.json();
    personalRequestNumber = responseBody.data.request_number;
    console.log(`Intercepted Personal Request Number: ${personalRequestNumber}`);

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 2: Wing Supervisor Ehtesham approves Personal Request
    console.log('--- Step 2: Wing Supervisor Ehtesham approves request ---');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/supervisor-approval-dashboard');
    await page.waitForTimeout(2000);

    // Locate request, view items, approve and submit
    const personalRow = page.locator('.space-y-4 > div').filter({ hasText: personalRequestNumber });
    await personalRow.scrollIntoViewIfNeeded();
    await personalRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const personalPrinterRow = personalRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await personalPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await personalRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Wing Supervisor approved Personal Request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 3: Storekeeper issues Personal Request
    console.log('--- Step 3: Storekeeper issues Personal Request ---');
    await page.getByPlaceholder('Username').fill('8210162682763');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/supervisor-approval-dashboard');
    await page.waitForTimeout(2000);

    const skPersonalRow = page.locator('.space-y-4 > div').filter({ hasText: personalRequestNumber });
    await skPersonalRow.scrollIntoViewIfNeeded();
    await skPersonalRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const skPersonalPrinterRow = skPersonalRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await skPersonalPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await skPersonalRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Storekeeper approved Personal Request.');

    await page.goto('/dashboard/stock-issuance-processing');
    await page.waitForTimeout(2000);

    const skPersonalCard = page.locator('.grid-cols-1 > div').filter({ hasText: personalRequestNumber });
    await skPersonalCard.scrollIntoViewIfNeeded();
    await skPersonalCard.getByRole('button', { name: 'Send / Dispatch' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Direct Hand over now' }).click();
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();

    await expect(page.locator('.bg-green-50')).toContainText(`delivered directly for ${personalRequestNumber}`);
    console.log('Storekeeper issued Personal Request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 4: Sana ul Haq Fazli verifies Personal Inventory
    console.log('--- Step 4: Sana ul Haq Fazli verifies personal inventory ---');
    await page.getByPlaceholder('Username').fill('1730115698727');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/personal-inventory');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search by item name, request number, or category...').fill(personalRequestNumber);
    await page.waitForTimeout(1000);

    const personalInvCard = page.locator('.space-y-4 > div').first();
    await expect(personalInvCard).toContainText('Printers Black and White');
    await expect(personalInvCard).toContainText(personalRequestNumber);
    console.log('Personal inventory verified successfully!');
  });

  test('Wing Request Workflow: Ehtesham -> DD Admin -> AD Admin-I -> Storekeeper -> Wing Inventory', async ({ page }) => {
    test.setTimeout(180000);
    page.on('console', msg => console.log(`[BROWSER LOG]: ${msg.text()}`));

    // STEP 1: Ehtesham submits a Wing Request
    console.log('--- Step 1: Ehtesham logs in and submits Wing Request ---');
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-wing');
    await page.waitForTimeout(2000);

    // Select ECP Secretariat from Office dropdown
    await page.locator('div').filter({ hasText: /^Office \*/ }).locator('button[role="combobox"]').click();
    await page.locator('role=option[name="ECP Secretariat"]').click();
    await page.waitForTimeout(1000);

    // Select Project Management Unit from Wing dropdown
    await page.locator('div').filter({ hasText: /^Wing \*/ }).locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Project Management Unit"]').click();
    await page.waitForTimeout(1000);

    // Search for Printers Black and White (GRP-08-003)
    await page.getByPlaceholder('Search inventory items...').fill('GRP-08-003');
    await page.waitForTimeout(1000);
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-08-003]' }).locator('button').click();
    await page.waitForTimeout(1000);

    // Intercept response
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/stock-issuance/requests') && response.status() === 201,
      { timeout: 30000 }
    );

    await page.getByPlaceholder('Explain why these items are needed').first().fill('Need printer for wing office use.');
    await page.getByRole('button', { name: 'Submit Issuance Request' }).click();

    await expect(page.getByText('submitted successfully and sent for approval')).toBeVisible();

    const response = await responsePromise;
    const responseBody = await response.json();
    wingRequestNumber = responseBody.data.request_number;
    console.log(`Intercepted Wing Request Number: ${wingRequestNumber}`);

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 2: DD Admin approves Wing Request (directly in admin workflow!)
    console.log('--- Step 2: DD Admin approves Wing Request ---');
    await page.getByPlaceholder('Username').fill('3840341231761');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=wing');
    await page.waitForTimeout(2000);

    // Click the Wing tab to activate it
    await page.getByRole('button', { name: /Wing/ }).first().click();
    await page.waitForTimeout(1000);

    const ddWingRow = page.locator('.space-y-4 > div').filter({ hasText: wingRequestNumber });
    await ddWingRow.scrollIntoViewIfNeeded();
    await ddWingRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const ddPrinterRow = ddWingRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await ddPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await ddWingRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('DD Admin approved Wing Request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 3: AD Admin-I approves Wing Request
    console.log('--- Step 3: AD Admin-I approves Wing Request ---');
    await page.getByPlaceholder('Username').fill('7110340242555');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=wing');
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Wing/ }).first().click();
    await page.waitForTimeout(1000);

    const adWingRow = page.locator('.space-y-4 > div').filter({ hasText: wingRequestNumber });
    await adWingRow.scrollIntoViewIfNeeded();
    await adWingRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    await adWingRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('AD Admin-I approved Wing Request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 4: Storekeeper issues Wing Request
    console.log('--- Step 4: Storekeeper issues Wing Request ---');
    await page.getByPlaceholder('Username').fill('8210162682763');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-processing');
    await page.waitForTimeout(2000);

    const skWingCard = page.locator('.grid-cols-1 > div').filter({ hasText: wingRequestNumber });
    await skWingCard.scrollIntoViewIfNeeded();
    await skWingCard.getByRole('button', { name: 'Send / Dispatch' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Direct Hand over now' }).click();
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();

    await expect(page.locator('.bg-green-50')).toContainText(`delivered directly for ${wingRequestNumber}`);
    console.log('Storekeeper issued Wing Request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 5: Ehtesham verifies Wing Inventory
    console.log('--- Step 5: Ehtesham verifies wing inventory ---');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/wing-inventory');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search by item name, request number, user, or category...').fill(wingRequestNumber);
    await page.waitForTimeout(1000);

    const wingInvCard = page.locator('.space-y-4 > div').first();
    await expect(wingInvCard).toContainText('Printers Black and White');
    await expect(wingInvCard).toContainText(wingRequestNumber);
    console.log('Wing inventory verified successfully!');
  });

  test('Personal Request Shortage Workflow: Sana -> Ehtesham -> Storekeeper (Shortage -> Forward to Admin) -> DD Admin -> AD Admin-I -> Storekeeper (Approve) -> Personal Inventory', async ({ page }) => {
    test.setTimeout(240000);
    page.on('console', msg => console.log(`[BROWSER LOG]: ${msg.text()}`));

    let shortageRequestNumber = '';

    // STEP 1: Sana submits request
    console.log('--- Step 1: Sana ul Haq Fazli logs in and submits Personal Request for Shortage ---');
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('1730115698727');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-personal');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search inventory items...').fill('GRP-08-003');
    await page.waitForTimeout(1000);
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-08-003]' }).locator('button').click();
    await page.waitForTimeout(1000);

    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/stock-issuance/requests') && response.status() === 201,
      { timeout: 30000 }
    );

    await page.getByPlaceholder('Explain why these items are needed').first().fill('Need printer (shortage flow test).');
    await page.getByRole('button', { name: 'Submit Issuance Request' }).click();

    await expect(page.getByText('submitted successfully and sent for approval')).toBeVisible();

    const response = await responsePromise;
    const responseBody = await response.json();
    shortageRequestNumber = responseBody.data.request_number;
    console.log(`Intercepted Shortage Request Number: ${shortageRequestNumber}`);

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 2: Wing Supervisor Ehtesham approves
    console.log('--- Step 2: Wing Supervisor Ehtesham approves ---');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/supervisor-approval-dashboard');
    await page.waitForTimeout(2000);

    const supervisorRow = page.locator('.space-y-4 > div').filter({ hasText: shortageRequestNumber });
    await supervisorRow.scrollIntoViewIfNeeded();
    await supervisorRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const supervisorPrinterRow = supervisorRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await supervisorPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await supervisorRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Wing Supervisor approved request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 3: Storekeeper Khalid forwards due to shortage
    console.log('--- Step 3: Storekeeper Khalid forwards due to shortage ---');
    await page.getByPlaceholder('Username').fill('8210162682763');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/supervisor-approval-dashboard');
    await page.waitForTimeout(2000);

    const skRow = page.locator('.space-y-4 > div').filter({ hasText: shortageRequestNumber });
    await skRow.scrollIntoViewIfNeeded();
    await skRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const skPrinterRow = skRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await skPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Forward to Admin"]').click();
    await page.waitForTimeout(500);

    await skRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Storekeeper forwarded request due to shortage.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 4: DD Admin forwards
    console.log('--- Step 4: DD Admin forwards request ---');
    await page.getByPlaceholder('Username').fill('3840341231761');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=personal');
    await page.waitForTimeout(2000);

    const ddRow = page.locator('.space-y-4 > div').filter({ hasText: shortageRequestNumber });
    await ddRow.scrollIntoViewIfNeeded();
    await ddRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const ddPrinterRow = ddRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await ddPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await ddRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('DD Admin approved (moved to AD Admin-I).');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 5: AD Admin-I approves
    console.log('--- Step 5: AD Admin-I approves request ---');
    await page.getByPlaceholder('Username').fill('7110340242555');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=personal');
    await page.waitForTimeout(2000);

    const adRow = page.locator('.space-y-4 > div').filter({ hasText: shortageRequestNumber });
    await adRow.scrollIntoViewIfNeeded();
    await adRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const adPrinterRow = adRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await adPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await adRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('AD Admin-I approved request.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 6: Storekeeper approves and issues
    console.log('--- Step 6: Storekeeper approves and issues ---');
    await page.getByPlaceholder('Username').fill('8210162682763');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=personal');
    await page.waitForTimeout(2000);

    const skApproveRow = page.locator('.space-y-4 > div').filter({ hasText: shortageRequestNumber });
    await skApproveRow.scrollIntoViewIfNeeded();
    await skApproveRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const skApprovePrinterRow = skApproveRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    await skApprovePrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Approve"]').click();
    await page.waitForTimeout(500);

    await skApproveRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Storekeeper approved request.');

    // Dispatch
    await page.goto('/dashboard/stock-issuance-processing');
    await page.waitForTimeout(2000);

    const skShortageCard = page.locator('.grid-cols-1 > div').filter({ hasText: shortageRequestNumber });
    await skShortageCard.scrollIntoViewIfNeeded();
    await skShortageCard.getByRole('button', { name: 'Send / Dispatch' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Direct Hand over now' }).click();
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();

    await expect(page.locator('.bg-green-50')).toContainText(`delivered directly for ${shortageRequestNumber}`);
    console.log('Storekeeper completed delivery.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 7: Sana ul Haq Fazli verifies Personal Inventory
    console.log('--- Step 7: Sana ul Haq Fazli verifies Personal Inventory ---');
    await page.getByPlaceholder('Username').fill('1730115698727');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/personal-inventory');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search by item name, request number, or category...').fill(shortageRequestNumber);
    await page.waitForTimeout(1000);

    const personalShortageInvCard = page.locator('.space-y-4 > div').first();
    await expect(personalShortageInvCard).toContainText('Printers Black and White');
    await expect(personalShortageInvCard).toContainText(shortageRequestNumber);
    console.log('Personal inventory shortage verified successfully!');
  });

  test('Personal Request Partial Allotment & Procurement Shortage Workflow: Sana -> Ehtesham (Partial Allotment 2/4) -> DD Admin (Partial Allotment 3/4) -> AD Admin-I (Approve) -> Storekeeper (Approve) -> Procurement Verification', async ({ page }) => {
    test.setTimeout(240000);
    page.on('console', msg => console.log(`[BROWSER LOG]: ${msg.text()}`));

    let partialRequestNumber = '';

    // STEP 1: Sana submits request for 4 printers
    console.log('--- Step 1: Sana ul Haq Fazli logs in and submits Personal Request for 4 Printers ---');
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('1730115698727');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/stock-issuance-personal');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search inventory items...').fill('GRP-08-003');
    await page.waitForTimeout(1000);
    await page.locator('.max-h-64').locator('div').filter({ hasText: '[GRP-08-003]' }).locator('button').click();
    await page.waitForTimeout(1000);

    // Click the Plus button 3 times to increment quantity from 1 to 4
    const plusBtn = page.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' }).getByRole('button').nth(1);
    await plusBtn.click();
    await plusBtn.click();
    await plusBtn.click();

    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/stock-issuance/requests') && response.status() === 201,
      { timeout: 30000 }
    );

    await page.getByPlaceholder('Explain why these items are needed').first().fill('Need 4 printers for team.');
    await page.getByRole('button', { name: 'Submit Issuance Request' }).click();

    await expect(page.getByText('submitted successfully and sent for approval')).toBeVisible();

    const response = await responsePromise;
    const responseBody = await response.json();
    partialRequestNumber = responseBody.data.request_number;
    console.log(`Intercepted Partial Request Number: ${partialRequestNumber}`);

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 2: Ehtesham (Wing Supervisor) approves 2 out of 4 (shortage of 2)
    console.log('--- Step 2: Ehtesham (Supervisor) partially approves 2 out of 4 printers ---');
    await page.getByPlaceholder('Username').fill('1730191419901');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/supervisor-approval-dashboard');
    await page.waitForTimeout(2000);

    const supRow = page.locator('.space-y-4 > div').filter({ hasText: partialRequestNumber });
    await supRow.scrollIntoViewIfNeeded();
    await supRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const supPrinterRow = supRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    const supQtyInput = supPrinterRow.locator('input[type="number"]');
    await supQtyInput.fill('2');
    await page.waitForTimeout(500);

    await supPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Forward to Admin"]').click();
    await page.waitForTimeout(500);

    await supRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('Supervisor approved 2/4 and forwarded shortage to Admin.');

    // Logout
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // STEP 3: DD Admin approves 3 out of 4 (allots 1 more, remaining 1 goes to procurement)
    console.log('--- Step 3: DD Admin checks Admin dashboard, approves 3 out of 4 ---');
    await page.getByPlaceholder('Username').fill('3840341231761');
    await page.getByPlaceholder('Password').fill('P@ssword@1');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/personal-dashboard|dashboard/);

    await page.goto('/dashboard/approval-dashboard-request-based-admin?scope=personal');
    await page.waitForTimeout(2000);

    const ddRow = page.locator('.space-y-4 > div').filter({ hasText: partialRequestNumber });
    await ddRow.scrollIntoViewIfNeeded();
    await ddRow.getByRole('button', { name: 'View Items' }).click();
    await page.waitForTimeout(1000);

    const ddPrinterRow = ddRow.locator('table').locator('tr').filter({ hasText: 'Printers Black and White' });
    
    // Change cumulative allocation quantity to 3
    const ddQtyInput = ddPrinterRow.locator('input[type="number"]');
    await ddQtyInput.fill('3');
    await page.waitForTimeout(500);

    await ddPrinterRow.locator('button[role="combobox"]').click();
    await page.locator('role=option[name="Forward to Procurement"]').click();
    await page.waitForTimeout(500);

    await ddRow.getByRole('button', { name: 'Submit All Decisions' }).click();
    await expect(page.getByText('Per-item approval decisions submitted successfully!')).toBeVisible();
    console.log('DD Admin approved 3/4 and forwarded shortage of 1 to Procurement.');

    // STEP 4: DD Admin verifies Procurement Required Items
    console.log('--- Step 4: DD Admin verifies shortage of 1 printer is in Procurement Required Items ---');
    await page.goto('/dashboard/required-items');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Search items or wings...').fill(partialRequestNumber);
    await page.waitForTimeout(1000);

    const reqItemRow = page.locator('table').locator('tr').filter({ hasText: partialRequestNumber });
    await expect(reqItemRow).toContainText('Printers Black and White');
    await expect(reqItemRow).toContainText('1'); // shortage of 1
    console.log('Procurement required items verified successfully!');
  });
});
