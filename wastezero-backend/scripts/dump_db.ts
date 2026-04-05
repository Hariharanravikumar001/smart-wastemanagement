import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function dumpData() {
  try {
    await mongoose.connect(process.env['MONGODB_URI'] || '');
    console.log('--- DATA DUMP ---');
    
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Failed to get database instance');
      return;
    }
    
    console.log('\n--- SAMPLE OPPORTUNITIES ---');
    const opps = await db.collection('opportunities').find({}).limit(5).toArray();
    console.log(JSON.stringify(opps, null, 2));
    
    console.log('\n--- SAMPLE USERS ---');
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- SAMPLE APPLICATIONS ---');
    const apps = await db.collection('applications').find({}).limit(5).toArray();
    console.log(JSON.stringify(apps, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

dumpData();
