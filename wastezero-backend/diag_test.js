async function test() {
  try {
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'password123';

    console.log(`Testing Registration for ${email}...`);
    const regRes = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        username: 'testuser' + timestamp,
        email: email,
        password: password,
        role: 'citizen',
        location: 'Test City',
        contactNumber: '1234567890'
      })
    });
    const regData = await regRes.json();
    console.log('Registration Status:', regRes.status);
    console.log('Registration Data:', regData);

    if (regRes.status === 201) {
        console.log(`\nTesting Login for ${email}...`);
        const loginRes = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        if (loginRes.status === 200) {
            console.log('Login Success! Token received.');
        } else {
            console.log('Login Failed:', loginData);
        }
    }
  } catch (err) {
    console.error('Test Failed!');
    console.error('Error:', err.message);
  }
}

test();
