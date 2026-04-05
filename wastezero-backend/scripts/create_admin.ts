import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from './src/models/User';
import bcrypt from 'bcryptjs';

dotenv.config();

async function createAdmin() {
  const uri = process.env['MONGODB_URI'];
  await mongoose.connect(uri!);
  console.log('Connected to MongoDB');

  const email = 'admin_test@wastezero.com';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin user already exists');
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const admin = new User({
    name: 'Test Admin',
    username: 'admin_test',
    email,
    password: hashedPassword,
    role: 'admin',
    location: 'Namakkal'
  });

  await admin.save();
  console.log('Admin user created successfully: admin_test@wastezero.com / admin123');

  await mongoose.disconnect();
}

createAdmin().catch(err => console.error(err));
