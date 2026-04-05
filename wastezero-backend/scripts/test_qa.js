const http = require('http');

async function testBackend() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/opportunities', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => reject(err));
  });
}

testBackend()
  .then(console.log)
  .catch(console.error);
