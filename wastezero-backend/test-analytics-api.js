const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function testAnalytics() {
    try {
        console.log('Testing login...');
        const loginRes = await post('http://localhost:4000/api/login', {
            email: 'admin@example.com',
            password: 'password123'
        });
        
        if (loginRes.status !== 200) {
            console.error('❌ Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.token;
        console.log('Login successful, fetching analytics...');
        
        const analyticsRes = await get('http://localhost:4000/api/admin/analytics', token);
        
        console.log('Analytics Response:', JSON.stringify(analyticsRes.data, null, 2));
        
        if (analyticsRes.status === 200 && 'totalImpact' in analyticsRes.data) {
            console.log('✅ Analytics API verification successful!');
        } else {
            console.error('❌ Analytics API verification failed:', analyticsRes.data);
        }
    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    }
}

testAnalytics();
