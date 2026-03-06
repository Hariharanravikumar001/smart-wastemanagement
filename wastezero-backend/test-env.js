const dotenv = require('dotenv');
dotenv.config();
console.log('JWT_SECRET:[' + process.env.JWT_SECRET + ']');
console.log('MONGODB_URI:[' + (process.env.MONGODB_URI ? 'LOADED' : 'MISSING') + ']');
