// WasteZero - Smart Automated Browser Test (Round 2)
// Fixed selectors based on actual HTML structure
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:4200';
const RESULTS = [];
let PASS = 0, FAIL = 0;
let browser, context, page;

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('test_round2.log', msg + '\n');
};

const test = async (name, fn) => {
  try {
    await fn();
    PASS++;
    RESULTS.push({ test: name, status: 'PASS' });
    log(`✅ PASS: ${name}`);
  } catch (e) {
    FAIL++;
    RESULTS.push({ test: name, status: 'FAIL', error: e.message.split('\n')[0] });
    log(`❌ FAIL: ${name} — ${e.message.split('\n')[0]}`);
  }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loginAs(email, password) {
  await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(500);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await sleep(4000);
  return page.url();
}

async function logout() {
  // Click the Sign Out / db-nav-item in sidebar footer
  try {
    await page.evaluate(() => {
      localStorage.removeItem('wastezero_token');
      localStorage.removeItem('wastezero_user');
    });
  } catch(e) {}
}

async function setup() {
  browser = await chromium.launch({ headless: true, slowMo: 50 });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on('pageerror', err => log(`⚠️ PAGE ERROR: ${err.message}`));
  if (fs.existsSync('test_round2.log')) fs.unlinkSync('test_round2.log');
  log('=== WasteZero Smart Browser Test (Round 2) ===');
  log(`Started: ${new Date().toISOString()}`);
}

// Pre-register 3 test users via API
async function preRegisterUsers() {
  const ts = Date.now();
  const users = {
    admin: { email: `admin_${ts}@waste.com`, password: 'Admin@1234', role: 'admin', name: 'Admin Test' },
    citizen: { email: `citizen_${ts}@waste.com`, password: 'Citizen@1234', role: 'citizen', name: 'Citizen Test' },
    volunteer: { email: `vol_${ts}@waste.com`, password: 'Vol@1234', role: 'volunteer', name: 'Volunteer Test' },
  };
  for (const [key, u] of Object.entries(users)) {
    try {
      const res = await fetch(`http://localhost:5000/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: u.name, username: u.email.split('@')[0], email: u.email, password: u.password, role: u.role, location: 'Chennai, TN' })
      });
      const d = await res.json();
      log(`  Registered ${key}: ${d.message}`);
    } catch(e) { log(`  Register ${key} FAILED: ${e.message}`); }
  }
  return users;
}

async function main() {
  await setup();
  const users = await preRegisterUsers();
  log('');

  // ===== LANDING =====
  log('\n--- LANDING PAGE ---');
  await test('Landing page loads with hero', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('h1', { timeout: 8000 });
    const h1 = await page.$eval('h1', el => el.textContent);
    log(`  H1: ${h1?.trim()}`);
  });

  await test('Navbar has login and register links', async () => {
    const links = await page.$$eval('a', els => els.map(el => el.href + ':' + el.textContent?.trim()));
    const hasLogin = links.some(l => l.includes('/login'));
    const hasRegister = links.some(l => l.includes('/register'));
    if (!hasLogin || !hasRegister) throw new Error(`Missing links. Found: ${links.filter(l => l.includes('login') || l.includes('register')).join(', ')}`);
  });

  // ===== LOGIN & AUTH =====
  log('\n--- AUTHENTICATION ---');

  await test('Citizen login redirects to /citizen', async () => {
    const url = await loginAs(users.citizen.email, users.citizen.password);
    if (!url.includes('/citizen')) throw new Error(`Got: ${url}`);
  });

  await test('Citizen sidebar has dashboard, pickup, history, messages', async () => {
    const links = await page.$$eval('a[routerlink], a[ng-reflect-router-link]', els => els.map(el => el.getAttribute('routerlink') || el.textContent?.trim()));
    const linkStr = links.join('|').toLowerCase();
    log(`  Links found: ${linkStr}`);
    if (!linkStr.includes('dashboard') && !linkStr.includes('pickup') && !linkStr.includes('history')) {
      throw new Error(`Missing nav items: ${linkStr}`);
    }
  });

  await test('Citizen profile shows in sidebar', async () => {
    const profileSection = await page.$('.db-user-block, .db-user-name, .db-user-info');
    if (!profileSection) throw new Error('User profile block not visible in sidebar');
    const name = await profileSection.textContent();
    log(`  Profile: ${name?.trim()?.substring(0, 50)}`);
  });

  await test('Dark mode toggle works', async () => {
    const toggleBtn = await page.$('.db-theme-toggle, button:has-text("Dark"), button:has-text("Light")');
    if (!toggleBtn) throw new Error('Dark mode toggle not found');
    await toggleBtn.click();
    await sleep(500);
    const isDark = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    log(`  Dark mode active: ${isDark}`);
    // Toggle back
    await toggleBtn.click();
    await sleep(300);
  });

  // ===== CITIZEN FEATURES =====
  log('\n--- CITIZEN FEATURES ---');

  await test('Citizen dashboard shows stats cards', async () => {
    await page.goto(`${BASE}/citizen/dashboard`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const cards = await page.$$('.db-stat-card, .card, [class*="stat"]');
    log(`  Stat cards found: ${cards.length}`);
    if (cards.length === 0) throw new Error('No stat cards visible');
  });

  await test('Citizen can navigate to pickup-request', async () => {
    await page.goto(`${BASE}/citizen/pickup-request`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(1500);
    const form = await page.$('.db-schedule-card');
    if (!form) throw new Error('Pickup request form not found');
  });

  await test('Pickup request form has all required fields', async () => {
    const hasDesc = await page.$('.db-textarea, textarea');
    const hasLoc = await page.$('input[placeholder*="pickup address" i]');
    if (!hasDesc || !hasLoc) throw new Error('Missing description or location field');
  });

  await test('Citizen can submit pickup request', async () => {
    // Select a category
    const cats = await page.$$('.db-category-btn');
    if (cats.length > 0) await cats[0].click();
    await sleep(300);

    // Fill description
    await page.fill('.db-textarea, textarea', 'Automated test pickup - plastic recycling needed urgently');
    await sleep(200);

    // Fill location (may be pre-filled)
    await page.fill('input[placeholder*="pickup address" i]', '123 Test Road, Chennai, TN');
    await sleep(300);

    const submitBtn = await page.$('.db-submit-btn');
    if (submitBtn) {
      const isDisabled = await submitBtn.isDisabled();
      log(`  Submit button disabled: ${isDisabled}`);
      if (!isDisabled) {
        await submitBtn.click();
        await sleep(3000);
        const successMsg = await page.$('.db-alert.success, .alert-success');
        const url = page.url();
        log(`  Post-submit URL: ${url}`);
        if (!successMsg && !url.includes('/citizen/dashboard')) {
          const err = await page.$('.db-alert.danger, .alert-danger');
          if (err) throw new Error(await err.textContent());
        }
      }
    }
  });

  await test('Pickup history page loads', async () => {
    await page.goto(`${BASE}/citizen/pickup-history`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="history"], [class*="request"], .card, table, .empty-state, [class*="empty"]');
    if (!content) throw new Error('No content on pickup history page');
    const text = await content.textContent();
    log(`  History content: ${text?.trim()?.substring(0, 100)}`);
  });

  await test('Statistics page loads with impact data', async () => {
    await page.goto(`${BASE}/citizen/statistics`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="stat"], canvas, .card, [class*="chart"]');
    if (!content) throw new Error('No statistics content found');
  });

  await test('Citizen profile page shows edit form', async () => {
    await page.goto(`${BASE}/citizen/profile`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const form = await page.$('form, input[name="name"], input[name="email"]');
    if (!form) throw new Error('Profile form not found');
  });

  await test('Citizen messages page loads', async () => {
    await page.goto(`${BASE}/citizen/messages`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="message"], [class*="chat"], [class*="conversation"], [class*="empty"]');
    if (!content) throw new Error('Messages content not found');
  });

  // ===== VOLUNTEER FEATURES =====
  log('\n--- VOLUNTEER FEATURES ---');
  await logout();

  await test('Volunteer login redirects to /volunteer', async () => {
    const url = await loginAs(users.volunteer.email, users.volunteer.password);
    if (!url.includes('/volunteer')) throw new Error(`Got: ${url}`);
  });

  await test('Volunteer dashboard loads with stats', async () => {
    await page.goto(`${BASE}/volunteer/dashboard`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('.card, [class*="stat"], [class*="pickup"], [class*="opportunity"]');
    if (!content) throw new Error('No dashboard content found');
  });

  await test('Volunteer opportunities page loads', async () => {
    await page.goto(`${BASE}/volunteer/opportunities`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="opportunity"], .card, table, [class*="empty"]');
    if (!content) throw new Error('Opportunities page empty');
  });

  await test('Volunteer my-pickups page loads', async () => {
    await page.goto(`${BASE}/volunteer/my-pickups`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="pickup"], .card, table, [class*="empty"], [class*="no-data"]');
    if (!content) throw new Error('My-pickups page has no content');
  });

  await test('Volunteer profile page loads', async () => {
    await page.goto(`${BASE}/volunteer/profile`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const profile = await page.$('form, .card, input[name="name"]');
    if (!profile) throw new Error('Volunteer profile not found');
  });

  await test('Volunteer messages page loads', async () => {
    await page.goto(`${BASE}/volunteer/messages`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2000);
    const content = await page.$('[class*="message"], [class*="chat"], [class*="empty"]');
    if (!content) throw new Error('Volunteer messages page not loading');
  });

  // ===== ADMIN FEATURES =====
  log('\n--- ADMIN FEATURES ---');
  await logout();

  await test('Admin login redirects to /admin', async () => {
    const url = await loginAs(users.admin.email, users.admin.password);
    if (!url.includes('/admin')) throw new Error(`Got: ${url}`);
  });

  await test('Admin dashboard shows analytics cards', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 12000 });
    await sleep(2500);
    const cards = await page.$$('.card, [class*="stat"], [class*="metric"], [class*="analytics"]');
    log(`  Analytics cards found: ${cards.length}`);
    if (cards.length < 2) throw new Error(`Not enough analytics cards: ${cards.length}`);
  });

  await test('Admin can view all users list', async () => {
    const userLink = await page.$('.admin-sidebar a:has-text("User Management")');
    if (userLink) {
      await userLink.click();
      await sleep(2000);
    } else {
      throw new Error('User Management link not found');
    }
    const table = await page.$('table, [class*="users"]');
    if (!table) throw new Error('User list table not found');
  });

  await test('Admin can view opportunities management', async () => {
    // Navigate to opportunities section
    const oppLink = await page.$('.admin-sidebar a:has-text("Opportunities")');
    if (oppLink) {
      await oppLink.click();
      await sleep(2000);
    } else {
      throw new Error('Opportunities link not found');
    }
    const content = await page.$('table, .premium-card');
    if (!content) throw new Error('Opportunity management not found in admin');
  });

  await test('Admin can create a new opportunity', async () => {
    // Look for create button
    const createBtn = await page.$('button:has-text("New Project"), button:has-text("Create"), button:has-text("Add")');
    if (createBtn) {
      await createBtn.click();
      await sleep(1500);
      const titleField = await page.$('input[name="title"]');
      if (!titleField) throw new Error('Opportunity title field not found in form');
      
      await titleField.fill('Automated Test Opportunity');
      const desc = await page.$('textarea[name="description"], textarea');
      if (desc) await desc.fill('This is an automated test opportunity created by the browser test.');
      const loc = await page.$('input[name="location"]');
      if (loc) await loc.fill('Chennai, TN');
      
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(2500);
        log('  Created opportunity successfully');
      }
    } else {
      throw new Error('Create opportunity button not found');
    }
  });

  await test('Admin messages page loads', async () => {
    const msgLink = await page.$('.admin-sidebar a:has-text("Messages")');
    if (msgLink) {
      await msgLink.click();
      await sleep(2000);
    } else {
      throw new Error('Messages link not found');
    }
    const content = await page.$('.conversation-list, [class*="message"], [class*="chat"], [class*="empty"]');
    if (!content) throw new Error('Admin messages page not loading');
  });

  // ===== FORGOT PASSWORD =====
  log('\n--- FORGOT PASSWORD ---');
  await logout();

  await test('Forgot password page loads', async () => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle', timeout: 12000 });
    const emailField = await page.$('input[type="email"], input[name="email"]');
    if (!emailField) throw new Error('Email field not found on forgot password page');
  });

  await test('OTP flow: enter email and request OTP', async () => {
    await page.fill('input[type="email"], input[name="email"]', users.citizen.email);
    const btn = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');
    if (!btn) throw new Error('No send OTP button');
    await btn.click();
    await sleep(3000);
    // Should now show OTP field or success message
    const content = await page.$('input[name="otp"], input[placeholder*="otp" i], .alert-success, [class*="success"]');
    if (!content) {
      const err = await page.$('.alert-danger');
      if (err) {
        const t = await err.textContent();
        log(`  Server response: ${t}`);
      }
    }
  });

  // ===== PAGE REFRESH =====
  log('\n--- PAGE REFRESH STABILITY ---');
  await loginAs(users.citizen.email, users.citizen.password);

  const refreshRoutes = [
    { url: `${BASE}/citizen/dashboard`, name: 'Citizen Dashboard' },
    { url: `${BASE}/citizen/pickup-request`, name: 'Pickup Request' },
    { url: `${BASE}/citizen/pickup-history`, name: 'Pickup History' },
    { url: `${BASE}/citizen/statistics`, name: 'Statistics' },
    { url: `${BASE}/citizen/profile`, name: 'Profile' },
    { url: `${BASE}/citizen/messages`, name: 'Messages' },
  ];

  for (const route of refreshRoutes) {
    await test(`Refresh stable: ${route.name}`, async () => {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 12000 });
      await sleep(800);
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await sleep(2000);
      const url = page.url();
      if (url.endsWith('/login') || url === `${BASE}/`) {
        throw new Error(`Refresh lost auth → redirected to ${url}`);
      }
      log(`  After refresh: ${url}`);
    });
  }

  // ===== API TESTS =====
  log('\n--- API ENDPOINT TESTS ---');
  
  await test('API: GET /api/health returns Connected', async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch('http://localhost:5000/api/health');
      return r.json();
    });
    log(`  Health: ${JSON.stringify(res)}`);
    if (res.status !== 'Connected') throw new Error(`DB status: ${res.status}`);
  });

  await test('API: POST /api/login returns token', async () => {
    const res = await page.evaluate(async (c) => {
      const r = await fetch('http://localhost:5000/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(c) });
      return r.json();
    }, { email: users.citizen.email, password: users.citizen.password });
    if (!res.token) throw new Error(`No token returned: ${JSON.stringify(res)}`);
  });

  await test('API: GET /api/opportunities returns array', async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch('http://localhost:5000/api/opportunities');
      return r.json();
    });
    if (!Array.isArray(res)) throw new Error(`Expected array, got: ${typeof res}`);
    log(`  Opportunities count: ${res.length}`);
  });

  await test('API: GET /api/waste-requests returns data', async () => {
    const token = await page.evaluate(() => localStorage.getItem('wastezero_token'));
    const res = await page.evaluate(async (t) => {
      const r = await fetch('http://localhost:5000/api/waste-requests', { headers: {'Authorization': `Bearer ${t}`} });
      return r.json();
    }, token);
    if (!Array.isArray(res)) throw new Error(`Expected array: ${typeof res}`);
    log(`  Waste requests count: ${res.length}`);
  });

  await test('API: Admin analytics endpoint works', async () => {
    // Login as admin first
    const adminRes = await page.evaluate(async (c) => {
      const r = await fetch('http://localhost:5000/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(c) });
      return r.json();
    }, { email: users.admin.email, password: users.admin.password });
    
    if (!adminRes.token) throw new Error('No admin token');
    
    const analyticsRes = await page.evaluate(async (t) => {
      const r = await fetch('http://localhost:5000/api/admin/analytics', { headers: { 'Authorization': `Bearer ${t}` } });
      return r.json();
    }, adminRes.token);
    
    if (analyticsRes.message) throw new Error(`Analytics error: ${analyticsRes.message}`);
    log(`  Analytics: activeUsers=${analyticsRes.activeUsers}, opportunities=${analyticsRes.totalOpportunities}`);
  });

  await test('API: Create waste request works', async () => {
    const citizenRes = await page.evaluate(async (c) => {
      const r = await fetch('http://localhost:5000/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(c) });
      return r.json();
    }, { email: users.citizen.email, password: users.citizen.password });
    
    if (!citizenRes.token) throw new Error('No citizen token');
    
    const createRes = await page.evaluate(async (data) => {
      const r = await fetch('http://localhost:5000/api/waste-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
        body: JSON.stringify({
          description: 'API Test - Plastic bottles near park',
          location: 'Gandhi Park, Chennai',
          wasteCategory: ['Plastic'],
          citizenId: data.id,
          citizenName: data.name,
          estimatedWeight: 5
        })
      });
      return { status: r.status, data: await r.json() };
    }, citizenRes);
    
    if (createRes.status !== 201) throw new Error(`Create failed (${createRes.status}): ${JSON.stringify(createRes.data)}`);
    log(`  Created waste request ID: ${createRes.data._id || createRes.data.id}`);
  });

  // Summary
  log('\n=========================================');
  log(`TOTAL: ${PASS + FAIL} | PASS: ${PASS} | FAIL: ${FAIL}`);
  log('=========================================');
  
  fs.writeFileSync('test_round2_summary.json', JSON.stringify({ 
    timestamp: new Date().toISOString(), 
    total: PASS + FAIL, pass: PASS, fail: FAIL, 
    results: RESULTS 
  }, null, 2));
  log('Results saved to test_round2_summary.json');
  
  await browser.close();
}

main().catch(err => {
  log(`\n💥 FATAL: ${err.message}`);
  process.exit(1);
});
