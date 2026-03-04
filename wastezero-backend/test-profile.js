const http = require('http');

const data = JSON.stringify({
  email: 'testcitizen@example.com',
  password: 'password123',
  name: 'Test Citizen',
  username: 'testcitizen',
  role: 'citizen'
});

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
  console.log(`Register status: ${res.statusCode}`);
  const reqLogin = http.request({
    hostname: 'localhost',
    port: 4001,
    path: '/api/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': JSON.stringify({ email: 'testcitizen@example.com', password: 'password123' }).length
    }
  }, resLogin => {
    let body = '';
    resLogin.on('data', d => body += d);
    resLogin.on('end', () => {
      const token = JSON.parse(body).token;
      console.log('Got token:', token ? 'yes' : 'no');
      
      const updateData = JSON.stringify({
        name: 'Updated Citizen',
        location: 'New York'
      });
      
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
          console.log(`Update status: ${resUpdate.statusCode}`);
          console.log('Update body:', updateBody);
        });
      });
      reqUpdate.write(updateData);
      reqUpdate.end();
    });
  });
  reqLogin.write(JSON.stringify({ email: 'testcitizen@example.com', password: 'password123' }));
  reqLogin.end();
});

reqRegister.write(data);
reqRegister.end();
