import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from './src/models/User';

dotenv.config();

async function findUsers() {
  const uri = process.env['MONGODB_URI'];
  await mongoose.connect(uri!);
  console.log('Connected to MongoDB');

  const users = await User.find({}).limit(10).lean();
  console.log('--- Sample Users ---');
  users.forEach((u: any) => {
    console.log(`Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  });

  await mongoose.disconnect();
}

findUsers().catch(err => console.error(err));
