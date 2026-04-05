import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from './src/models/User';
import Opportunity from './src/models/Opportunity';

dotenv.config();

async function test() {
  const uri = process.env['MONGODB_URI'];
  await mongoose.connect(uri!);
  console.log('Connected to MongoDB');

  // Find an admin and a volunteer
  const admin = await User.findOne({ role: 'admin' });
  const volunteer = await User.findOne({ role: 'volunteer' });

  if (!admin || !volunteer) {
    console.error('Admin or Volunteer not found');
    return;
  }

  console.log(`Testing with Admin: ${admin.email}, Volunteer: ${volunteer.email}`);

  // Create a new opportunity
  const newOpp = new Opportunity({
    title: 'Test Visibility Project ' + Date.now(),
    description: 'A test project to verify visibility in volunteer dashboard',
    skills: ['test'],
    duration: '1 day',
    location: volunteer.location || 'Test Location',
    status: 'open',
    ngo_id: admin._id
  });

  const savedOpp = await newOpp.save();
  console.log('Created Opportunity:', savedOpp._id);

  // Now simulate getMatchedOpportunities for this volunteer
  const acceptedApps = []; // Assuming no applications yet
  let query: any = { 
    $or: [
        { status: 'open', isDeleted: false },
        { _id: { $in: acceptedApps }, isDeleted: false }
    ]
  };

  const opps = await Opportunity.aggregate([
    { $match: query },
    {
        $lookup: {
            from: 'users',
            localField: 'ngo_id',
            foreignField: '_id',
            as: 'ngo_data'
        }
    },
    { $unwind: { path: '$ngo_data', preserveNullAndEmptyArrays: true } },
    {
        $addFields: {
            id: "$_id",
            organizationName: "$ngo_data.name"
        }
    }
  ]);

  console.log('Total matches found:', opps.length);
  const found = opps.find(o => o._id.toString() === savedOpp._id.toString());
  if (found) {
    console.log('SUCCESS: New opportunity found in matches!');
    console.log('Organization Name:', found.organizationName);
  } else {
    console.log('FAILURE: New opportunity NOT found in matches!');
  }

  // Cleanup
  await Opportunity.findByIdAndDelete(savedOpp._id);
  console.log('Cleaned up test opportunity');

  await mongoose.disconnect();
}

test().catch(err => console.error(err));
