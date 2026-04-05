import { chromium, Browser, BrowserContext, Page } from 'playwright';

async function testRole(baseUrl: string, roleStr: string, routes: string[], emailPrefix: string): Promise<string[]> {
  const email = `${emailPrefix}_${Date.now()}@test.com`;
  const password = 'Password@123';
  const name = `Test ${roleStr}`;
  let errors: string[] = [];

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  // Capture all console errors and uncaught exceptions
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[${roleStr}] Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', exception => {
    errors.push(`[${roleStr}] Uncaught Exception: ${exception.message}`);
  });
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      errors.push(`[${roleStr}] Network Error: ${resp.status()} on ${resp.url()}`);
    }
  });

  try {
    console.log(`\n--- Testing ${roleStr} ---`);
    console.log('Registering...');
    await page.goto(`${baseUrl}/register`);
    await page.waitForLoadState('load');
    
    // Fill register form
    await page.fill('input[name="name"]', name).catch(() => {});
    await page.fill('input[name="username"]', name.toLowerCase().replace(' ', '')).catch(() => {});
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password).catch(() => {});
    await page.fill('input[name="location"]', '123 Test St').catch(() => {});
    
    // Select role
    const roleSelect = await page.$('select');
    if (roleSelect) {
      // Find option looking like the role string
      const options = await page.$$eval('select option', opts => 
        (opts as HTMLOptionElement[]).map(o => ({ v: o.value, t: o.textContent || '' }))
      );
      const match = options.find((o: {v: string, t: string}) => 
        o.t.toLowerCase().includes(roleStr.toLowerCase()) || 
        o.v.toLowerCase().includes(roleStr.toLowerCase())
      );
      if (match) {
        await page.selectOption('select', match.v);
      }
    }
    
    // Check terms
    await page.check('input[name="terms"]').catch(() => {});

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // wait for redirect

    console.log(`Logging in as ${email}...`);
    // Wait for the login page to appear
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('load');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for login success
    await page.waitForTimeout(3000);

    for (const route of routes) {
      console.log(`Visiting ${route}...`);
      await page.goto(`${baseUrl}${route}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1500); // Allow render and backend requests
    }
    
  } catch (err: any) {
    errors.push(`[${roleStr}] Execution Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  return errors;
}

async function main() {
  const baseUrl = 'http://localhost:4200';
  const allErrors: string[] = [];

  const citizenRoutes = [
    '/citizen/dashboard',
    '/citizen/pickup-request',
    '/citizen/pickup-history',
    '/citizen/statistics',
    '/citizen/messages',
    '/citizen/profile'
  ];
  
  const volunteerRoutes = [
    '/volunteer/dashboard',
    '/volunteer/opportunities',
    '/volunteer/my-pickups',
    '/volunteer/messages',
    '/volunteer/profile'
  ];

  const adminRoutes = [
    '/admin',
    '/messages',
    '/opportunities'
  ];

  console.log('Starting Playwright E2E Dashboards Test in TypeScript...');
  
  const citErrs = await testRole(baseUrl, 'Citizen', citizenRoutes, 'cit');
  allErrors.push(...citErrs);

  const volErrs = await testRole(baseUrl, 'Volunteer', volunteerRoutes, 'vol');
  allErrors.push(...volErrs);

  const admErrs = await testRole(baseUrl, 'NGO', adminRoutes, 'adm');
  allErrors.push(...admErrs);

  console.log('\n================ RESULTS ================');
  if (allErrors.length === 0) {
    console.log('✅ No errors found across all dashboards!');
  } else {
    console.log(`❌ Found ${allErrors.length} errors:`);
    const uniqueErrors = [...new Set(allErrors)];
    uniqueErrors.forEach(e => console.log(e));
  }
}

main().catch(console.error);
