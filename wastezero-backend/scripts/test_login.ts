import axios from 'axios';

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5000/api/login', {
            email: 'admin_test@wastezero.com',
            password: 'admin123'
        });
        console.log('Login Success:', response.data);
    } catch (error: any) {
        console.error('Login Failed:', error.response?.status, error.response?.data || error.message);
    }
}

testLogin();
