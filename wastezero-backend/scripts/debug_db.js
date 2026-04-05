const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User').default;
const Opportunity = require('./src/models/Opportunity').default;

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const volunteers = await User.find({ role: 'volunteer' }).limit(5);
  console.log('Volunteers:', volunteers.map(v => ({ id: v._id, name: v.name, email: v.email, location: v.location, skills: v.skills })));

  const opportunities = await Opportunity.find({ status: 'open', isDeleted: false }).limit(5);
  console.log('Open Opportunities:', opportunities.map(o => ({ id: o._id, title: o.title, location: o.location, skills: o.skills })));

  await mongoose.disconnect();
}

debug();
