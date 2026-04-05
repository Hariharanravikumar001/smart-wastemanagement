async function testMatch() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testvolunteerXYZ@gmail.com',
                password: 'password123'
            })
        });
        
        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token acquired.');

        console.log('Fetching matches...');
        const matchRes = await fetch('http://127.0.0.1:5000/api/opportunities/matches', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const matchData = await matchRes.text();
        if (!matchRes.ok) {
            console.error(`Matches failed: ${matchRes.status} - ${matchData}`);
        } else {
            const data = JSON.parse(matchData);
            console.log(`Matches retrieved successfully: ${data.length} items`);
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.error('Test failed:', error);
    }
}

testMatch();
