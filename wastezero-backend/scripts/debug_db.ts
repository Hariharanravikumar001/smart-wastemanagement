import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import User from './src/models/User';
import Opportunity from './src/models/Opportunity';

dotenv.config();

async function debug() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const volunteers = await User.find({ role: 'volunteer' }).limit(5);
  console.log('Volunteers:', volunteers.map(v => ({ id: v._id, name: v.name, email: v.email, location: v.location, skills: v.skills })));

  const opportunities = await Opportunity.find({ status: 'open', isDeleted: false }).limit(5);
  console.log('Open Opportunities:', opportunities.map(o => ({ id: o._id, title: o.title, location: o.location, skills: o.skills })));

  await mongoose.disconnect();
}

debug().catch(err => console.error(err));
