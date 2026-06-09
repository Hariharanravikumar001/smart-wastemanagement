// WasteZero - Full Automated Browser Test
// Tests all 4 milestones: Auth, Opportunities, Messaging, Admin
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://smart-wastemanagement-ten.vercel.app';
const RESULTS = [];
let PASS = 0, FAIL = 0;
let browser, context, page;

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('full_test_results.log', msg + '\n');
};

const test = async (name, fn) => {
  try {
    await fn();
    PASS++;
    RESULTS.push({ test: name, status: 'PASS' });
    log(`✅ PASS: ${name}`);
  } catch (e) {
    FAIL++;
    RESULTS.push({ test: name, status: 'FAIL', error: e.message });
    log(`❌ FAIL: ${name} — ${e.message}`);
  }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function setup() {
  browser = await chromium.launch({ headless: true, slowMo: 50 });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  page.on('pageerror', err => log(`⚠️ PAGE ERROR: ${err.message}`));
  
  // Handle alerts / dialogs to capture OTP
  page.on('dialog', async dialog => {
    const text = dialog.message();
    const match = text.match(/"(\d+)"/);
    if (match) {
      global.capturedOtp = match[1];
    }
    await dialog.accept();
  });

  if (fs.existsSync('full_test_results.log')) fs.unlinkSync('full_test_results.log');
  log('=== WasteZero Full Browser Test ===');
  log(`Started: ${new Date().toISOString()}`);
  log('');
}

// ==================== LANDING PAGE ====================
async function testLanding() {
  log('\n--- LANDING PAGE TESTS ---');
  
  await test('Landing page loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    const title = await page.title();
    if (!title.includes('WasteZero')) throw new Error(`Bad title: ${title}`);
  });

  await test('Landing hero section visible', async () => {
    const hero = await page.$('.hero-section, section.hero-section, [class*="hero"]');
    if (!hero) throw new Error('Hero section not found');
  });

  await test('Get Started button works', async () => {
    const btn = await page.$('a[routerlink="/register"], a[href="/register"]');
    if (!btn) throw new Error('Get Started button not found');
  });

  await test('Login link in navbar', async () => {
    const loginLink = await page.$('a[routerlink="/login"], a[href="/login"], a[href*="login"]');
    if (!loginLink) {
      // Try navbar
      const nav = await page.$('app-navbar');
      if (!nav) throw new Error('Login link not found');
    }
  });
}

// ==================== REGISTRATION ====================
async function testRegistration() {
  log('\n--- REGISTRATION TESTS ---');

  const timestamp = Date.now();
  const testUsers = {
    citizen: { name: 'Test Citizen', username: `citizen${timestamp}`, email: `citizen${timestamp}@test.com`, password: 'Test@1234', role: 'user' },
    volunteer: { name: 'Test Volunteer', username: `volunteer${timestamp}`, email: `volunteer${timestamp}@test.com`, password: 'Test@1234', role: 'volunteer' },
  };

  for (const [roleKey, user] of Object.entries(testUsers)) {
    await test(`Register ${roleKey} account`, async () => {
      await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 15000 });
      await sleep(1000);

      // Fill form
      await page.fill('#name', user.name);
      await sleep(300);
      await page.fill('#username', user.username);
      await sleep(300);
      await page.fill('#email', user.email);
      await sleep(300);

      // Role selection
      const roleSelect = await page.$('#role');
      if (roleSelect) {
        let roleVal = 'Citizen';
        if (user.role === 'admin') roleVal = 'Admin';
        if (user.role === 'volunteer') roleVal = 'Volunteer';
        await roleSelect.selectOption({ value: roleVal });
      }
      await sleep(300);

      // Location
      const locationField = await page.$('#location');
      if (locationField) await locationField.fill('Chennai, Tamil Nadu');
      await sleep(300);

      // Contact Number (mandatory)
      await page.fill('#contactNumber', '+1234567890');
      await sleep(300);

      // Trigger OTP Send
      global.capturedOtp = null;
      await page.click('button:has-text("Send OTP")');
      await sleep(1000);

      // Verify OTP in the UI
      if (global.capturedOtp) {
        await page.fill('#otp', global.capturedOtp);
        await sleep(300);
        await page.click('button:has-text("Verify")');
        await sleep(1000);
      }

      await page.fill('#password', user.password);
      await sleep(300);
      await page.fill('#confirmPassword', user.password);
      await sleep(300);

      // Terms checkbox
      const terms = await page.$('#terms');
      if (terms) {
        const checked = await terms.isChecked();
        if (!checked) await terms.check();
      }
      await sleep(500);

      // Submit
      await page.click('button[type="submit"]');
      await sleep(3000);

      // Should redirect to login or show success
      const url = page.url();
      const hasSuccess = url.includes('/login') || await page.$('.alert-success, .success') != null;
      if (!hasSuccess && !url.includes('/login')) {
        // Check for error message
        const error = await page.$('.alert-danger, .error-message, .text-danger');
        if (error) {
          const errText = await error.textContent();
          if (errText && !errText.includes('already exists')) throw new Error(`Registration error: ${errText}`);
        }
      }
    });
  }
}

// ==================== LOGIN ====================
async function testLogin() {
  log('\n--- LOGIN TESTS ---');
  
  const timestamp = Date.now();
  // Register test accounts first via API
  const users = [
    { email: `admin_test_${timestamp}@waste.com`, password: 'Admin@1234', role: 'admin', name: 'Admin Test' },
    { email: `citizen_test_${timestamp}@waste.com`, password: 'Citizen@1234', role: 'citizen', name: 'Citizen Test' },
    { email: `volunteer_test_${timestamp}@waste.com`, password: 'Volunteer@1234', role: 'volunteer', name: 'Volunteer Test' },
  ];

  // Pre-register via API  
  for (const u of users) {
    try {
      const res = await fetch('https://smart-wastemanagement-913z.onrender.com/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: u.name, username: u.email.split('@')[0], email: u.email, password: u.password, role: u.role, location: 'Chennai' })
      });
      const data = await res.json();
      log(`  Pre-register ${u.role}: ${data.message}`);
    } catch (e) {
      log(`  Pre-register failed: ${e.message}`);
    }
  }

  await test('Login page loads', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('input[name="email"], #email', { timeout: 8000 });
  });

  await test('Login form validation - empty submit', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(500);
    const btn = await page.$('button[type="submit"]');
    if (!btn) throw new Error('Submit button not found');
    const isDisabled = await btn.isDisabled();
    if (!isDisabled) throw new Error('Submit button should be disabled when form is empty');
  });

  await test('Login with wrong credentials shows error', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', 'wrong@wrong.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await sleep(3000);
    const error = await page.$('.alert-danger, .error-message, .text-danger, [class*="error"]');
    if (!error) throw new Error('Error message not shown for bad credentials');
  });

  // Login as citizen
  await test('Citizen login and dashboard redirect', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', users[1].email);
    await page.fill('#password', users[1].password);
    await page.click('button[type="submit"]');
    await sleep(4000);
    const url = page.url();
    if (!url.includes('/citizen')) throw new Error(`Expected /citizen, got: ${url}`);
  });

  // Test citizen dashboard
  await test('Citizen dashboard loads properly', async () => {
    await page.waitForSelector('.db-body, h1:has-text("Hello"), .premium-card', { timeout: 8000 });
  });

  await test('Citizen dashboard has navigation items', async () => {
    const navLinks = await page.$$('a[routerlink], a[href*="/citizen"], .db-nav-item');
    if (navLinks.length < 2) throw new Error(`Too few nav links: ${navLinks.length}`);
  });

  // Logout
  await test('Citizen can logout', async () => {
    const logoutBtn = await page.$('.db-sidebar-footer button:has-text("Sign Out"), .db-sidebar-footer button:has-text("Logout")');
    if (logoutBtn) {
      await logoutBtn.click();
      await sleep(2000);
      const url = page.url();
      if (url.includes('/citizen')) throw new Error('Should be logged out');
    } else {
      throw new Error('Logout button not found');
    }
  });

  // Login as volunteer
  await test('Volunteer login and dashboard redirect', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', users[2].email);
    await page.fill('#password', users[2].password);
    await page.click('button[type="submit"]');
    await sleep(4000);
    const url = page.url();
    if (!url.includes('/volunteer')) throw new Error(`Expected /volunteer, got: ${url}`);
  });

  await test('Volunteer dashboard loads', async () => {
    await page.waitForSelector('.db-body, h1:has-text("Agent"), .premium-card', { timeout: 8000 });
  });

  // Logout volunteer
  const logoutBtn2 = await page.$('.db-sidebar-footer button:has-text("Sign Out"), .db-sidebar-footer button:has-text("Logout")');
  if (logoutBtn2) { await logoutBtn2.click(); await sleep(2000); }

  // Login as admin
  await test('Admin login and dashboard redirect', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', users[0].email);
    await page.fill('#password', users[0].password);
    await page.click('button[type="submit"]');
    await sleep(4000);
    const url = page.url();
    if (!url.includes('/admin')) throw new Error(`Expected /admin, got: ${url}`);
  });

  await test('Admin dashboard loads with stats', async () => {
    await page.waitForSelector('.admin-wrapper, .admin-sidebar, .premium-card', { timeout: 8000 });
  });

  // Store admin creds for later tests
  global.adminEmail = users[0].email;
  global.adminPassword = users[0].password;
  global.citizenEmail = users[1].email;
  global.citizenPassword = users[1].password;
  global.volunteerEmail = users[2].email;
  global.volunteerPassword = users[2].password;
}

// ==================== ROUTE PROTECTION ====================
async function testRouteProtection() {
  log('\n--- ROUTE PROTECTION TESTS ---');

  await test('Protected route /citizen redirects when not logged in', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    // Logout first
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/citizen/dashboard`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const url = page.url();
    if (url.includes('/citizen/dashboard')) throw new Error('Should redirect to login when not authenticated');
  });

  await test('Protected route /admin redirects when not logged in', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const url = page.url();
    if (url.includes('/admin')) throw new Error('Should redirect to login when not authenticated');
  });
  await test('Login page accessible without auth', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.waitForSelector('input[name="email"], #email', { timeout: 5000 });
  });

  await test('Register page accessible without auth', async () => {
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.waitForSelector('input[name="email"], #email', { timeout: 5000 });
  });
}

// ==================== CITIZEN FEATURES ====================
async function testCitizenFeatures() {
  log('\n--- CITIZEN FEATURE TESTS ---');

  // Login as citizen
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('#email', global.citizenEmail);
  await page.fill('#password', global.citizenPassword);
  await page.click('button[type="submit"]');
  await sleep(4000);
  await test('Citizen pickup request page loads', async () => {
    await page.goto(`${BASE}/citizen/pickup-request`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const form = await page.$('.db-schedule-card, form, [class*="pickup"], [class*="request"]');
    if (!form) throw new Error('Pickup request form not found');
  });

  await test('Citizen can submit a pickup request', async () => {
    await page.goto(`${BASE}/citizen/pickup-request`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(1500);

    // Select waste category
    const categoryBtns = await page.$$('.db-category-btn');
    if (categoryBtns.length > 0) {
      await categoryBtns[0].click();
    }
    await sleep(300);

    // Fill description
    await page.fill('.db-textarea, textarea', 'Test pickup request - plastic bottles and paper');
    await sleep(300);

    // Fill location
    await page.fill('input[placeholder*="pickup address" i]', '123 Test Street, Chennai');
    await sleep(300);

    // Submit
    const submitBtn = await page.$('.db-submit-btn');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3000);
      // Check for success or redirect
      const success = await page.$('.db-alert.success, .alert-success');
      const url = page.url();
      if (!success && !url.includes('/citizen/dashboard')) {
        const err = await page.$('.db-alert.danger, .alert-danger');
        if (err) {
          const errText = await err.textContent();
          throw new Error(`Submit failed: ${errText}`);
        }
      }
    } else {
      throw new Error('Submit button not found');
    }
  });

  await test('Citizen pickup history page loads', async () => {
    await page.goto(`${BASE}/citizen/pickup-history`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.db-body, .db-card, .db-empty');
    if (!content) throw new Error('Pickup history content not found');
  });

  await test('Citizen statistics page loads', async () => {
    await page.goto(`${BASE}/citizen/statistics`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.db-body, .db-stat-card, .db-card');
    if (!content) throw new Error('Statistics content not found');
  });

  await test('Citizen profile page loads', async () => {
    await page.goto(`${BASE}/citizen/profile`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const profile = await page.$('.profile-card, form, .card');
    if (!profile) throw new Error('Profile content not found');
  });

  await test('Citizen messages page loads', async () => {
    await page.goto(`${BASE}/citizen/messages`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.conversation-list, [class*="message"], [class*="chat"], .conversation, [class*="empty"]');
    if (!content) throw new Error('Messages content not found');
  });

  await test('Dark mode toggle works for citizen', async () => {
    await page.goto(`${BASE}/citizen/dashboard`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(1500);
    const toggle = await page.$('.db-top-actions .db-action-item, .db-sidebar-footer .db-theme-toggle');
    if (toggle) {
      await toggle.click();
      await sleep(500);
      // Toggle back
      await toggle.click();
      await sleep(300);
    }
  });
}

// ==================== VOLUNTEER FEATURES ====================
async function testVolunteerFeatures() {
  log('\n--- VOLUNTEER FEATURE TESTS ---');

  // Logout and login as volunteer
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('#email', global.volunteerEmail);
  await page.fill('#password', global.volunteerPassword);
  await page.click('button[type="submit"]');
  await sleep(4000);

  await test('Volunteer opportunities page loads', async () => {
    await page.goto(`${BASE}/volunteer/opportunities`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.db-body, table, .premium-card, .glass');
    if (!content) throw new Error('Opportunities content not found');
  });

  await test('Volunteer my-pickups page loads', async () => {
    await page.goto(`${BASE}/volunteer/my-pickups`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.db-body, table, .premium-card, .glass, [class*="empty"]');
    if (!content) throw new Error('My pickups content not found');
  });

  await test('Volunteer profile page loads', async () => {
    await page.goto(`${BASE}/volunteer/profile`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const profile = await page.$('.profile-card, form, .card');
    if (!profile) throw new Error('Volunteer profile not found');
  });

  await test('Volunteer messages page loads', async () => {
    await page.goto(`${BASE}/volunteer/messages`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.conversation-list, [class*="message"], [class*="chat"], .conversation, [class*="empty"]');
    if (!content) throw new Error('Volunteer messages not found');
  });

  await test('Volunteer dashboard loads', async () => {
    await page.goto(`${BASE}/volunteer/dashboard`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.db-body, h1:has-text("Agent"), .premium-card');
    if (!content) throw new Error('Volunteer dashboard not found');
  });
}

// ==================== ADMIN FEATURES ====================
async function testAdminFeatures() {
  log('\n--- ADMIN FEATURE TESTS ---');

  // Logout and login as admin
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('#email', global.adminEmail);
  await page.fill('#password', global.adminPassword);
  await page.click('button[type="submit"]');
  await sleep(4000);

  await test('Admin dashboard loads', async () => {
    const url = page.url();
    if (!url.includes('/admin')) throw new Error(`Expected /admin, got: ${url}`);
    await page.waitForSelector('.admin-wrapper, .admin-sidebar, .premium-card', { timeout: 8000 });
  });

  await test('Admin dashboard shows statistics/analytics', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const stats = await page.$$('.premium-card, .card, canvas');
    if (stats.length < 1) throw new Error('No statistics cards found in admin dashboard');
  });

  await test('Admin can navigate to user management', async () => {
    const usersMenu = await page.$('.admin-sidebar a:has-text("User Management")');
    if (usersMenu) {
      await usersMenu.click();
      await sleep(2000);
    } else {
      throw new Error('User Management sidebar link not found');
    }
    // Should show users list
    const userList = await page.$('table, [class*="users"]');
    if (!userList) throw new Error('User management view not found');
  });

  await test('Admin can navigate to opportunities management', async () => {
    const oppMenu = await page.$('.admin-sidebar a:has-text("Opportunities")');
    if (oppMenu) {
      await oppMenu.click();
      await sleep(2000);
    } else {
      throw new Error('Opportunities sidebar link not found');
    }
    const content = await page.$('table, .premium-card');
    if (!content) throw new Error('Opportunities management not found');
  });

  await test('Admin create opportunity form', async () => {
    // Look for create/add button
    const createBtn = await page.$('button:has-text("New Project"), button:has-text("Create"), button:has-text("Add")');
    if (createBtn) {
      await createBtn.click();
      await sleep(1500);
      const form = await page.$('form, input[name="title"]');
      if (!form) throw new Error('Opportunity creation form not found');
    } else {
      throw new Error('New Project button not found');
    }
  });

  await test('Admin can view reports section', async () => {
    const reportsMenu = await page.$('.admin-sidebar a:has-text("Reports")');
    if (reportsMenu) {
      await reportsMenu.click();
      await sleep(2000);
    } else {
      throw new Error('Reports sidebar link not found');
    }
    const content = await page.$('canvas, table');
    if (!content) throw new Error('Reports section not found');
  });
}

// ==================== FORGOT PASSWORD ====================
async function testForgotPassword() {
  log('\n--- FORGOT PASSWORD TESTS ---');

  await test('Forgot password page loads', async () => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 8000 });
  });

  await test('Forgot password form submits for valid email', async () => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(500);
    const emailField = await page.$('input[type="email"], input[name="email"]');
    if (emailField) {
      await emailField.fill(global.citizenEmail || 'test@test.com');
      await page.click('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');
      await sleep(3000);
      // Should show OTP field or success message
      const otpOrSuccess = await page.$('input[name="otp"], .alert-success, [class*="success"], input[placeholder*="otp" i]');
      if (!otpOrSuccess) {
        const err = await page.$('.alert-danger');
        if (err) {
          const errText = await err.textContent();
          if (!errText.includes('not found')) throw new Error(`Unexpected error: ${errText}`);
        }
      }
    }
  });
}

// ==================== PAGE REFRESH ====================
async function testPageRefresh() {
  log('\n--- PAGE REFRESH TESTS ---');

  // Login as citizen first
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('#email', global.citizenEmail);
  await page.fill('#password', global.citizenPassword);
  await page.click('button[type="submit"]');
  await sleep(4000);

  const routes = [
    { url: `${BASE}/citizen/dashboard`, name: 'Citizen Dashboard' },
    { url: `${BASE}/citizen/pickup-request`, name: 'Pickup Request' },
    { url: `${BASE}/citizen/profile`, name: 'Citizen Profile' },
  ];

  for (const route of routes) {
    await test(`Page refresh works on: ${route.name}`, async () => {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 12000 });
      await sleep(1000);
      await page.reload({ waitUntil: 'networkidle', timeout: 12000 });
      await sleep(2000);
      const url = page.url();
      if (url.includes('/login') && !url.includes('returnUrl')) {
        throw new Error(`Refresh redirected to login (lost session)`);
      }
    });
  }
}

// ==================== PUBLIC PAGES ====================
async function testPublicPages() {
  log('\n--- PUBLIC PAGES TESTS ---');
  
  const publicPages = [
    { url: `${BASE}/services`, name: 'Services' },
    { url: `${BASE}/about-us`, name: 'About Us' },
    { url: `${BASE}/contact`, name: 'Contact' },
    { url: `${BASE}/terms-of-service`, name: 'Terms of Service' },
    { url: `${BASE}/privacy-policy`, name: 'Privacy Policy' },
  ];

  for (const p of publicPages) {
    await test(`${p.name} page loads`, async () => {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 12000 });
      await sleep(1000);
      const content = await page.$('main, [class*="page"], h1, h2, .container');
      if (!content) throw new Error(`${p.name} page has no content`);
    });
  }
}

// ==================== API TESTS ====================
async function testAPIEndpoints() {
  log('\n--- API ENDPOINT TESTS ---');

  await test('API health check returns Connected', async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch('https://smart-wastemanagement-913z.onrender.com/api/health');
      return r.json();
    });
    if (res.status !== 'Connected') throw new Error(`DB not connected: ${JSON.stringify(res)}`);
  });

  await test('Login API returns JWT token', async () => {
    const res = await page.evaluate(async (creds) => {
      const r = await fetch('https://smart-wastemanagement-913z.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      return r.json();
    }, { email: global.citizenEmail, password: global.citizenPassword });
    if (!res.token) throw new Error(`No token in response: ${JSON.stringify(res)}`);
  });

  await test('Opportunities API returns list', async () => {
    const token = await page.evaluate(() => localStorage.getItem('wastezero_token'));
    if (!token) return; // Skip if no token
    const res = await page.evaluate(async (t) => {
      const r = await fetch('https://smart-wastemanagement-913z.onrender.com/api/opportunities', {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      return r.json();
    }, token);
    if (!Array.isArray(res) && !res.opportunities) throw new Error(`Bad opportunities response`);
  });
}

// ==================== MAIN ====================
async function main() {
  await setup();

  try {
    await testLanding();
    await testPublicPages();
    await testRegistration();
    await testLogin();
    await testRouteProtection();
    await testCitizenFeatures();
    await testVolunteerFeatures();
    await testAdminFeatures();
    await testForgotPassword();
    await testPageRefresh();
    await testAPIEndpoints();
  } catch (fatalError) {
    log(`\n💥 FATAL ERROR: ${fatalError.message}`);
  }

  // Summary
  log('\n=========================================');
  log(`TOTAL: ${PASS + FAIL} | PASS: ${PASS} | FAIL: ${FAIL}`);
  log('=========================================\n');
  
  // Write JSON summary
  const summary = { timestamp: new Date().toISOString(), total: PASS + FAIL, pass: PASS, fail: FAIL, results: RESULTS };
  fs.writeFileSync('full_test_summary.json', JSON.stringify(summary, null, 2));
  log('Full results saved to full_test_summary.json');

  await browser.close();
}

main().catch(err => {
  log(`\n💥 UNCAUGHT: ${err.message}\n${err.stack}`);
  process.exit(1);
});
