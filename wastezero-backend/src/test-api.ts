import http from 'http';

const data = JSON.stringify({
  email: 'auth2@test.com',
  password: 'password123'
});

const options: http.RequestOptions = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('⏳ Sending login request to:', `${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, res => {
  console.log(`📋 Status Code: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
