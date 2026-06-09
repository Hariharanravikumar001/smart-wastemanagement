import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Application from '../src/models/Application';
import Opportunity from '../src/models/Opportunity';
import User from '../src/models/User';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  // Explicitly reference the models to prevent compiler tree-shaking
  console.log('Registered models:', User.modelName, Opportunity.modelName, Application.modelName);

  const apps = await Application.find({})
      .populate('volunteer_id', 'name email username location')
      .populate('opportunity_id', 'title description location duration')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

  console.log('Populated Applications:', JSON.stringify(apps, null, 2));

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
