import http from 'http';

const makeRequest = (options: any, data: any) => {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: body ? JSON.parse(body) : {} });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(postData));
      req.write(postData);
    }
    req.end();
  });
};

async function runTest() {
  const timestamp = Date.now();
  const testUser = {
    name: 'Test Notifier',
    username: 'test_notifier_' + timestamp,
    email: 'test_notifier_' + timestamp + '@example.com',
    password: 'password123',
    role: 'citizen',
    location: 'Test City'
  };

  console.log('--- Phase 1: Register User ---');
  let res: any = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/register',
    method: 'POST'
  }, testUser);
  console.log('Register status:', res.statusCode);
  console.log('Register response:', res.body);

  if (res.statusCode !== 201) {
    console.error('Registration failed!');
    return;
  }

  console.log('\n--- Phase 2: Login to Get Token ---');
  res = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/login',
    method: 'POST'
  }, { email: testUser.email, password: testUser.password });
  console.log('Login status:', res.statusCode);
  const token = res.body.token;

  if (!token) {
    console.error('Login failed!');
    return;
  }

  console.log('\n--- Phase 3: Update Profile Email ---');
  const newEmail = 'updated_' + timestamp + '@example.com';
  res = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/profile',
    method: 'PUT',
    headers: { 
        'x-auth-token': token
    }
  }, { email: newEmail });
  console.log('Update status:', res.statusCode);
  console.log('Update response:', res.body);
  
  console.log('\n✅ Verification requests sent. Check backend console logs for "Email sent" messages.');
}

runTest().catch(console.error);
