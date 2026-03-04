const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    page.on('response', resp => console.log('RESPONSE:', resp.url(), resp.status(), resp.statusText()));
    
    await page.goto('http://localhost:4200/login');
    // We don't have a user account, let's create one
    await page.goto('http://localhost:4200/register');
    await page.fill('input[name="name"]', 'Cit Test');
    await page.fill('input[name="email"]', 'cittest@example.com');
    await page.fill('input[name="password"]', 'password123');
    // submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // wait for redirect
    
    await page.goto('http://localhost:4200/login');
    await page.fill('input[type="email"]', 'cittest@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Now we are in dashboard. go to profile
    await page.goto('http://localhost:4200/citizen/profile');
    await page.waitForTimeout(1000);
    
    console.log('Clicking Edit Profile...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const editBtn = btns.find(b => b.innerText.includes('Edit Profile'));
        if(editBtn) editBtn.click();
    });
    
    await page.waitForTimeout(500);
    
    console.log('Clicking Save Changes...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const saveBtn = btns.find(b => b.innerText.includes('Save Changes'));
        if(saveBtn) saveBtn.click();
    });
    
    await page.waitForTimeout(2000);
    console.log('Done');
    await browser.close();
})();
