
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGODB_URI;
console.log('Testing connection to:', mongoUri.replace(/\/\/.*@/, '//****:****@'));

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Success! Connected to MongoDB.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed! Error:', err.message);
    process.exit(1);
  });
