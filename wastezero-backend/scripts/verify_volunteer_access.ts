
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:5000/api';

async function testAccess() {
    try {
        console.log('--- TESTING VOLUNTEER ACCESS ---');
        
        // 1. Login as Volunteer
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: 'testvolunteerXYZ@gmail.com',
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        const role = loginRes.data.role;
        const userId = loginRes.data.id;
        
        console.log(`Logged in as: ${loginRes.data.email}`);
        console.log(`Role from login response: ${role}`);
        console.log(`User ID: ${userId}`);
        
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 2. Fetch matches
        console.log('\nFetching /api/opportunities/matches...');
        try {
            const matchesRes = await axios.get(`${API_URL}/opportunities/matches`, { headers });
            console.log(`Success! Found ${matchesRes.data.opportunities?.length || matchesRes.data.length} matches.`);
        } catch (err: any) {
            console.error(`FAILED /api/opportunities/matches: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }
        
        // 3. Fetch my applications
        console.log('\nFetching /api/applications/volunteer...');
        try {
            const appsRes = await axios.get(`${API_URL}/applications/volunteer`, { headers });
            console.log(`Success! Found ${appsRes.data.length} applications.`);
        } catch (err: any) {
            console.error(`FAILED /api/applications/volunteer: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }
        
        // 4. Fetch me
        console.log('\nFetching /api/me...');
        try {
            const meRes = await axios.get(`${API_URL}/me`, { headers });
            console.log(`Success! Me role: ${meRes.data.role}`);
        } catch (err: any) {
            console.error(`FAILED /api/me: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

testAccess();
