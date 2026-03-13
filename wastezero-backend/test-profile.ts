import http from 'http';

const testUser = {
  email: 'testcitizen@example.com',
  password: 'password123',
  name: 'Test Citizen',
  username: 'testcitizen',
  role: 'citizen'
};

const data = JSON.stringify(testUser);

console.log('⏳ Registering test citizen...');

const reqRegister = http.request({
  hostname: 'localhost',
  port: 4001,
  path: '/api/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  console.log(`📋 Register status: ${res.statusCode}`);
  
  const loginData = JSON.stringify({ email: testUser.email, password: testUser.password });
  
  const reqLogin = http.request({
    hostname: 'localhost',
    port: 4001,
    path: '/api/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, resLogin => {
    let body = '';
    resLogin.on('data', d => body += d);
    resLogin.on('end', () => {
      let token = '';
      try {
          token = JSON.parse(body).token;
      } catch (e) {
          console.error('❌ Failed to parse login body:', body);
          return;
      }
      
      console.log('🔑 Got token:', token ? 'YES' : 'NO');
      
      const updateData = JSON.stringify({
        name: 'Updated Citizen',
        location: 'New York'
      });
      
      console.log('⏳ Updating profile...');
      const reqUpdate = http.request({
        hostname: 'localhost',
        port: 4001,
        path: '/api/profile',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': updateData.length,
          'Authorization': `Bearer ${token}`
        }
      }, resUpdate => {
        let updateBody = '';
        resUpdate.on('data', d => updateBody += d);
        resUpdate.on('end', () => {
          console.log(`📋 Update status: ${resUpdate.statusCode}`);
          console.log('📄 Update body:', updateBody);
        });
      });
      reqUpdate.write(updateData);
      reqUpdate.end();
    });
  });
  reqLogin.write(loginData);
  reqLogin.end();
});

reqRegister.write(data);
reqRegister.end();
