const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTest() {
  console.log('--- Starting Admin Panel Playwright Automated Test ---');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    console.error('[Browser PageError]:', err.message);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[Browser Console Error]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Secret Admin Login
    console.log('Navigating to secret-admin-login...');
    await page.goto('http://localhost:5173/secret-admin-login', { waitUntil: 'networkidle', timeout: 30000 });

    // Step 1: Submit email & password
    console.log('Requesting admin passcode...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Step 2: Wait for OTP input to appear and click verify
    console.log('Waiting for OTP verification step...');
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });
    await page.waitForTimeout(1000);

    console.log('Submitting OTP verification...');
    await page.click('button[type="submit"]');

    // Wait for redirection to /admin
    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Successfully authenticated into Admin Dashboard!');

    // Wait for overview tab to settle
    await page.waitForTimeout(2000);

    // List of tab keywords or buttons to test
    const tabsToTest = [
      { id: 'overview', name: 'Dashboard Overview', selector: 'button:has-text("Dashboard Overview")' },
      { id: 'pending', name: 'Verification Queue', selector: 'button:has-text("Verification Queue")' },
      { id: 'users', name: 'Customers', selector: 'button:has-text("Customers")' },
      { id: 'artists', name: 'Artists Directory', selector: 'button:has-text("Artists Directory")' },
      { id: 'bookings', name: 'Bookings Ledger', selector: 'button:has-text("Bookings Ledger")' },
      { id: 'ledger', name: 'Financial Ledger', selector: 'button:has-text("Financial Ledger")' },
      { id: 'wallet', name: 'Commission Wallet', selector: 'button:has-text("Commission Wallet")' },
      { id: 'chats', name: 'Chat Activity Stream', selector: 'button:has-text("Chat Activity Stream")' },
      { id: 'reviews', name: 'Review Moderation', selector: 'button:has-text("Review Moderation")' },
      { id: 'notifications', name: 'Dispatch Broadcaster', selector: 'button:has-text("Dispatch Broadcaster")' },
      { id: 'coupons', name: 'Coupons Manager', selector: 'button:has-text("Coupons Manager")' },
      { id: 'festivals', name: 'Festivals & Offers', selector: 'button:has-text("Festivals & Offers")' },
      { id: 'categories', name: 'Categories Manager', selector: 'button:has-text("Categories Manager")' },
      { id: 'referrals', name: 'Referral Campaigns', selector: 'button:has-text("Referral Campaigns")' },
      { id: 'tickets', name: 'Support Tickets & Queries', selector: 'button:has-text("Support Tickets")' },
      { id: 'analytics', name: 'BI Reports & Analytics', selector: 'button:has-text("BI Reports")' }
    ];

    const results = [];
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    for (const tab of tabsToTest) {
      console.log(`\nTesting tab: [${tab.name}]...`);
      const errorCountBefore = pageErrors.length;

      const btn = page.locator(tab.selector).first();
      await btn.click();
      await page.waitForTimeout(3000);

      if (tab.id === 'referrals') {
        try {
          await page.waitForSelector('.table tbody tr:has-text("Welcome Referral")', { timeout: 6000 });
        } catch (_) {}
        const tableText = await page.locator('.glass-panel:has-text("Referral Campaigns History")').textContent().catch(() => '');
        console.log('Referral Campaigns History Content Preview:', tableText.replace(/\s+/g, ' ').slice(0, 160));
      }

      await page.screenshot({ path: path.join(screenshotDir, `tab_${tab.id}.png`) });

      const hasError = pageErrors.length > errorCountBefore;

      results.push({
        tab: tab.name,
        status: hasError ? 'FAILED' : 'PASSED',
        errors: pageErrors.slice(errorCountBefore)
      });
      console.log(`Tab [${tab.name}] Status: ${hasError ? 'FAILED ❌' : 'PASSED ✅'}`);
    }

    console.log('\n================ TEST SUMMARY ================');
    let allPassed = true;
    for (const r of results) {
      console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.tab}: ${r.status}`);
      if (r.status !== 'PASSED') allPassed = false;
    }
    console.log(`Total Uncaught Page Errors: ${pageErrors.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);

    if (allPassed && pageErrors.length === 0) {
      console.log('\n🎉 ALL ADMIN PANEL TABS PASSED SUCCESSFULLY WITH ZERO RUNTIME ERRORS!');
    } else {
      console.log('\n⚠️ Some tabs encountered issues during execution.');
    }

  } catch (err) {
    console.error('Fatal error during test run:', err);
  } finally {
    await browser.close();
  }
}

runTest();
