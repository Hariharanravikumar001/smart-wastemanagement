
const axios = require('axios');

async function testDelete() {
    const baseUrl = 'http://localhost:5000/api';
    const token = 'YOUR_TOKEN_HERE'; // I need a token

    try {
        // First, get an opportunity ID
        const listRes = await axios.get(`${baseUrl}/opportunities`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const opp = listRes.data.opportunities[0];
        if (!opp) {
            console.log('No opportunities found');
            return;
        }

        console.log(`Attempting to delete opportunity: ${opp.id}`);
        const delRes = await axios.delete(`${baseUrl}/opportunities/${opp.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Delete Response:', delRes.data);
    } catch (error) {
        console.error('Delete Failed:', error.response?.data || error.message);
    }
}
