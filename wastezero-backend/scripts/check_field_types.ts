import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected');
  
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database connection not established');
    await mongoose.disconnect();
    return;
  }
  
  const rawOpp = await db.collection('opportunities').findOne({ title: /salem/i });
  if (rawOpp) {
    console.log('Raw Opportunity ngo_id type:', typeof rawOpp.ngo_id, rawOpp.ngo_id?.constructor?.name);
    console.log('Raw Opportunity ngo_id value:', rawOpp.ngo_id);
  } else {
    console.log('Salem opportunity not found in raw check');
  }

  const rawUser = await db.collection('users').findOne({ name: 'sathish' });
  if (rawUser) {
    console.log('Raw User _id type:', typeof rawUser._id, rawUser._id?.constructor?.name);
  }
  
  await mongoose.disconnect();
}

run().catch(err => console.error(err));
