const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            raw: data // Keep raw string in case JSON parsing fails but we still want to log it
          });
        } catch (e) {
          console.error(`\nFailed to parse JSON from ${options.method} ${options.path}. Status: ${res.statusCode}\nContent: ${data.substring(0, 200)}...\n`);
          resolve({ status: res.statusCode, data: data, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message, data: null });
    });
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${err.message}`);
      failed++;
    }
  };

  let token = '';

  // 1. Health Check
  await test('Health Check Endpoint', async () => {
    const res = await makeRequest('/health');
    if (res.status !== 200 || res.data.status !== 'Connected') {
      throw new Error(`Expected status 200 and Connected, got ${res.status} ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Authenticate (Login as Admin)
  await test('Authenticate Admin User', async () => {
    // Assuming an admin user exists or we can login with arbitrary credentials for testing if backend allows
    // We will register a test user first to ensure we have credentials
    const testUserEmail = `testadmin_${Date.now()}@example.com`;
    const testUserName = `testadmin_${Date.now()}`;
    const testUser = {
      name: 'Test Admin',
      username: testUserName,
      email: testUserEmail,
      password: 'password123',
      role: 'admin',
      location: 'Test City'
    };

    // Try to register (might fail if already exists, which is fine)
    const regRes = await makeRequest('/register', 'POST', testUser);
    console.log(`Registration result: ${regRes.status} - ${regRes.raw}`);

    // Login
    const loginRes = await makeRequest('/login', 'POST', {
      email: testUserEmail,
      password: 'password123'
    });

    console.log(`Login Status: ${loginRes.status}`);
    console.log('Login Response Data:', loginRes.raw);

    if (loginRes.status !== 200 || !loginRes.data || !loginRes.data.token) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.raw}`);
    }
    
    token = loginRes.data.token;
  });

  // Helper with Auth
  const makeAuthRequest = (endpoint, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(API_BASE + endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: data ? JSON.parse(data) : null,
              raw: data
            });
          } catch (e) {
            console.error(`\nFailed to parse JSON from ${options.method} ${options.path}. Status: ${res.statusCode}\nContent: ${data.substring(0, 200)}...\n`);
            resolve({ status: res.statusCode, data: data, raw: data });
          }
        });
      });

      req.on('error', (err) => {
         resolve({ status: 500, error: err.message, data: null });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  // 3. Fetch Waste Requests
  await test('Fetch Available Waste Requests', async () => {
    const res = await makeAuthRequest('/waste-requests/available');
    if (res.status !== 200 || !Array.isArray(res.data)) {
      throw new Error(`Expected status 200 and array, got ${res.status}`);
    }
  });

  // 4. Fetch Opportunities
  await test('Fetch Open Opportunities', async () => {
    const res = await makeAuthRequest('/opportunities');
    if (res.status !== 200 || !res.data || !Array.isArray(res.data.opportunities)) {
      throw new Error(`Expected status 200 and opportunities array, got ${res.status} ${JSON.stringify(res.data)}`);
    }
  });

  console.log(`\n📊 Results: ${passed} Passed, ${failed} Failed`);
}

runTests();
