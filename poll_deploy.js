const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function poll() {
  const url = 'https://smart-wastemanagement-ten.vercel.app/';
  console.log(`Polling ${url} to check for successful Vercel redeployment...`);
  
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      
      // Find the main JS script filename in HTML
      const match = html.match(/src="([^"]+main[^"]+\.js)"/);
      if (match) {
        const jsUrl = new URL(match[1], url).toString();
        
        // Fetch the JS file content
        const jsRes = await fetch(jsUrl);
        const jsText = await jsRes.text();
        const contentType = jsRes.headers.get('content-type');
        
        if (contentType && contentType.includes('javascript') && !jsText.trim().startsWith('<')) {
          console.log('\n🎉 SUCCESS! Vercel is now serving JavaScript files correctly.');
          console.log(`Content-Type: ${contentType}`);
          console.log(`Sample: ${jsText.substring(0, 100).trim()}...`);
          process.exit(0);
        } else {
          console.log(`[Attempt ${i+1}] Still serving HTML for JS files (Content-Type: ${contentType}). Waiting 10s...`);
        }
      } else {
        console.log(`[Attempt ${i+1}] Main script tag not found in HTML yet. Waiting 10s...`);
      }
    } catch (e) {
      console.log(`[Attempt ${i+1}] Request failed: ${e.message}. Waiting 10s...`);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  
  console.error('Timeout waiting for deployment.');
  process.exit(1);
}

poll();
