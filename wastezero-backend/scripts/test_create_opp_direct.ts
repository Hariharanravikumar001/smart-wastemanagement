import axios from 'axios';

async function testCreate() {
    const loginUrl = 'http://127.0.0.1:5000/api/login';
    const createUrl = 'http://127.0.0.1:5000/api/opportunities';

    try {
        console.log('Logging in as admin...');
        const loginRes = await axios.post(loginUrl, {
            email: 'admin_test@wastezero.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Login successful, token obtained.');

        console.log('Attempting to create opportunity...');
        const oppData = {
            title: 'Diagnostic Test Opportunity',
            description: 'This is a test opportunity created for diagnostic purposes.',
            skills: ['Testing', 'Diagnostics'],
            duration: '1 day',
            location: 'Namakkal',
            wasteType: 'General',
            status: 'open'
        };

        const createRes = await axios.post(createUrl, oppData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Opportunity created successfully!');
        console.log('Response:', JSON.stringify(createRes.data, null, 2));

    } catch (error: any) {
        console.error('Test failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

testCreate();
