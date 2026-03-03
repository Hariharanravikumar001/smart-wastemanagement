const http = require('http');

const data = JSON.stringify({
  email: 'auth2@test.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
