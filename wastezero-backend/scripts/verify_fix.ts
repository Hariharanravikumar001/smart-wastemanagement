import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Opportunity from './src/models/Opportunity';
import User from './src/models/User';

dotenv.config();

async function verify() {
  const uri = process.env['MONGODB_URI'];
  await mongoose.connect(uri!);
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('Admin not found');
    return;
  }

  // Create an opportunity with wasteType
  const newOpp = new Opportunity({
    title: 'Verification Project ' + Date.now(),
    description: 'Verifying wasteType and visibility',
    skills: ['verify'],
    duration: '1 day',
    location: 'Verification City',
    wasteType: 'Plastic',
    status: 'open',
    ngo_id: admin._id
  });

  const savedOpp = await newOpp.save();
  console.log('Created Opportunity with ID:', savedOpp._id);
  console.log('Saved wasteType:', (savedOpp as any).wasteType);

  // Check if it's returned by a simple find (simulating matching query)
  const found = await Opportunity.findById(savedOpp._id);
  if (found && (found as any).wasteType === 'Plastic') {
    console.log('SUCCESS: wasteType correctly saved and retrieved!');
  } else {
    console.log('FAILURE: wasteType not saved correctly!');
  }

  // Cleanup
  await Opportunity.findByIdAndDelete(savedOpp._id);
  console.log('Cleaned up verification opportunity');

  await mongoose.disconnect();
}

verify().catch(err => console.error(err));
