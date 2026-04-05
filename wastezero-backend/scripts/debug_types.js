const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { Schema } = mongoose;
  const OpportunitySchema = new Schema({ ngo_id: Schema.Types.ObjectId }, { strict: false });
  const Opportunity = mongoose.model('Opportunity', OpportunitySchema, 'opportunities');

  const opps = await Opportunity.find({}).sort({ createdAt: -1 }).limit(5);
  for (const o of opps) {
    console.log(`Opp: ${o.title}, ID: ${o._id}, ngo_id type: ${typeof o.ngo_id}, ngo_id val: ${o.ngo_id}, status: ${o.status}`);
    if (o.ngo_id instanceof mongoose.Types.ObjectId) {
      console.log('ngo_id is an ObjectId instance');
    } else {
      console.log('ngo_id is NOT an ObjectId instance');
    }
  }

  await mongoose.disconnect();
}

debug();
