import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUsers() {
  try {
    await mongoose.connect(process.env['MONGODB_URI'] || '');
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Failed to get database instance');
      return;
    }
    
    console.log('--- CHECKING USERS ---');
    const users = await db.collection('users').find({}).toArray();
    
    users.forEach(u => {
      const name = u['name'];
      const email = u['email'];
      const skills = u['skills'];
      const id = u['_id'];

      if (!name) console.log(`User ${id} (${email}) is missing NAME`);
      if (!skills) console.log(`User ${id} (${email}) is missing SKILLS`);
      if (skills && !Array.isArray(skills)) console.log(`User ${id} (${email}) skills is NOT an array: ${typeof skills}`);
    });

    console.log('\n--- CHECKING OPPORTUNITIES ---');
    const opps = await db.collection('opportunities').find({}).toArray();
    opps.forEach(o => {
      const skills = o['skills'];
      const id = o['_id'];
      if (!skills) console.log(`Opportunity ${id} is missing SKILLS`);
      if (skills && !Array.isArray(skills)) console.log(`Opportunity ${id} skills is NOT an array: ${typeof skills}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
