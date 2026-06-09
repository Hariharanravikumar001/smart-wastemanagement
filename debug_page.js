const { chromium } = require('playwright');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Log page errors (uncaught exceptions)
  page.on('pageerror', err => {
    console.error(`[BROWSER PAGE ERROR] ${err.stack}`);
  });

  // Log network requests and responses
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.js') || url.includes('/api') || url.includes('socket.io')) {
      console.log(`>> Request: ${request.method()} ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('.js') || url.includes('/api') || url.includes('socket.io')) {
      console.log(`<< Response: ${response.status()} ${url}`);
    }
  });

  console.log('Navigating to https://smart-wastemanagement-ten.vercel.app/ ...');
  try {
    await page.goto('https://smart-wastemanagement-ten.vercel.app/', { waitUntil: 'load', timeout: 30000 });
    console.log('Page loaded successfully. Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  await browser.close();
  console.log('Browser closed.');
}

main().catch(console.error);
