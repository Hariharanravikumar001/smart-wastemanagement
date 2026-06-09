import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import Opportunity from '../src/models/Opportunity';
import Application from '../src/models/Application';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debug() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const sathish = await User.findOne({ name: /sathish/i });
  console.log('Sathish:', sathish ? { id: sathish._id, name: sathish.name, role: sathish.role, email: sathish.email } : 'Not found');

  const apps = await Application.find({});
  console.log('Total applications in DB:', apps.length);
  for (const app of apps) {
    const vol = await User.findById(app.volunteer_id);
    const opp = await Opportunity.findById(app.opportunity_id);
    console.log({
      app_id: app._id,
      status: app.status,
      volunteer: vol ? { id: vol._id, name: vol.name, role: vol.role } : `Vol ID ${app.volunteer_id} not found`,
      opportunity: opp ? { id: opp._id, title: opp.title } : `Opp ID ${app.opportunity_id} not found`
    });
  }

  await mongoose.disconnect();
}

debug().catch(err => console.error(err));
