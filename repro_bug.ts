
import { chromium, Browser, BrowserContext, Page } from 'playwright';

async function testVolunteerProfile() {
  const baseUrl = 'http://localhost:4200';
  const email = `vol_${Date.now()}@test.com`;
  const password = 'Password@123';
  const name = 'Test Volunteer';

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', exception => console.error('BROWSER ERROR:', exception.message));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`NETWORK ERROR: ${resp.status()} on ${resp.url()}`);
    }
  });

  try {
    console.log('Registering volunteer...');
    await page.goto(`${baseUrl}/register`);
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="username"]', 'vol' + Date.now());
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.fill('input[name="location"]', 'Test City');
    await page.selectOption('select', 'volunteer');
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    console.log('Logging in...');
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/volunteer/dashboard');
    console.log('Successfully logged into volunteer dashboard');

    console.log('Clicking Profile link...');
    // Find the profile link in the sidebar
    const profileLink = page.locator('a[routerLink="/volunteer/profile"]');
    await profileLink.click();

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('❌ BUG REPRODUCED: Redirected to login page!');
    } else if (currentUrl.includes('/volunteer/profile')) {
      console.log('✅ No redirect to login page. Checking for data errors...');
      const hasContent = await page.isVisible('h2:has-text("Profile Settings")');
      console.log('Profile settings visible:', hasContent);
    } else {
      console.log('Unexpected state. URL:', currentUrl);
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

testVolunteerProfile();
