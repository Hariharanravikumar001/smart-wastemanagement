import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
console.log('JWT_SECRET:', process.env['JWT_SECRET']);
console.log('MONGODB_URI exists:', !!process.env['MONGODB_URI']);
console.log('CWD:', process.cwd());
