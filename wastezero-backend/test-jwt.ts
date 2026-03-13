import http from 'http';

async function test() {
    const loginData = JSON.stringify({ email: 'admin@example.com', password: 'password123' });
    
    console.log('⏳ Attempting login to get fresh token...');
    
    // 1. Login to get fresh token
    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            const data = JSON.parse(body);
            if (!data.token) {
                console.error('❌ Login failed:', data);
                return;
            }
            console.log('✅ Got fresh token:', data.token);

            // 2. Fetch opportunities with fresh token
            console.log('⏳ Fetching opportunities with new token...');
            const oppReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/opportunities',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }, oppRes => {
                let oppBody = '';
                oppRes.on('data', d => oppBody += d);
                oppRes.on('end', () => {
                    console.log('📊 Opp Status:', oppRes.statusCode);
                    console.log('📄 Opp Response:', oppBody);
                });
            });
            oppReq.end();
        });
    });
    
    req.write(loginData);
    req.end();
}

test();
