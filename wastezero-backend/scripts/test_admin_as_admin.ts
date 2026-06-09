import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

async function run() {
  const token = jwt.sign(
    { user: { id: '69d88bc1b3060c2bfa29e3c5', role: 'admin' } },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const headers = { Authorization: `Bearer ${token}` };
  
  try {
    console.log('Calling GET /api/applications/admin as ADMIN...');
    const res = await fetch(`${API_URL}/applications/admin`, { headers });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data count:', Array.isArray(data) ? data.length : 'not an array');
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('API call failed:', err.message);
  }
}

run().catch(err => console.error(err));
