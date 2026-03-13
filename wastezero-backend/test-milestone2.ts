import http from 'http';

const adminCredentials = { email: 'admin@example.com', password: 'password123' };
const volunteerCredentials = { email: 'volunteer@example.com', password: 'password123' };

const request = (method: string, path: string, data: any = null, token: string | null = null): Promise<any> => {
    return new Promise((resolve, reject) => {
        const options: http.RequestOptions = {
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token && options.headers) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Status ${res.statusCode}: ${body}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

async function testE2E() {
    try {
        console.log('⏳ Login Admin...');
        const adminLogin = await request('POST', '/login', adminCredentials);
        const adminToken = adminLogin.token;

        console.log('⏳ Login Volunteer...');
        const volunteerLogin = await request('POST', '/login', volunteerCredentials);
        const volunteerToken = volunteerLogin.token;

        console.log('⏳ Admin creating opportunity...');
        const oppData = {
            title: 'Node Integration Test Cleanup',
            description: 'Testing the backend APIs via node script.',
            skills: ['Coding', 'Testing'],
            duration: '2 hours',
            location: 'New York',
            status: 'open'
        };
        const opp = await request('POST', '/opportunities', oppData, adminToken);
        console.log(`✅ Opportunity Created: ${opp.title} (${opp._id})`);

        console.log('⏳ Volunteer listing opportunities...');
        const oppsList = await request('GET', '/opportunities', null, volunteerToken);
        console.log(`🔍 Volunteer sees ${oppsList.opportunities.length} opportunities.`);

        console.log('⏳ Volunteer applying...');
        const app = await request('POST', '/applications', { opportunity_id: opp._id }, volunteerToken);
        console.log(`✅ Application Created: Status ${app.status}`);

        console.log('⏳ Admin listing applications...');
        const apps = await request('GET', '/applications/admin', null, adminToken);
        console.log(`🔍 Admin sees ${apps.length} applications.`);
        
        const testApp = apps.find((a: any) => a._id === app._id);
        if (testApp) {
            console.log('⏳ Admin accepting application...');
            const acceptedApp = await request('PUT', `/applications/${testApp._id}/status`, { status: 'accepted' }, adminToken);
            console.log(`✅ Application updated to: ${acceptedApp.status}`);
            console.log('🎉 ALL E2E API TESTS PASSED!');
        } else {
            console.error('❌ Failed to find application in admin list.');
        }

    } catch (e: any) {
        console.error('❌ Test Failed:', e.message);
    }
}

testE2E();
