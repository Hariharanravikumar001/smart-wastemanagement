import * as dotenv from 'dotenv';

dotenv.config();

console.log('🔑 JWT_SECRET: [' + (process.env['JWT_SECRET'] ? 'LOADED' : 'MISSING') + ']');
console.log('🌐 MONGODB_URI: [' + (process.env['MONGODB_URI'] ? 'LOADED' : 'MISSING') + ']');
