const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const OpportunitySchema = new mongoose.Schema({
    title: String,
    status: String,
    ngo_id: mongoose.Schema.Types.ObjectId
});

const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', OpportunitySchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const opps = await Opportunity.find({ title: /salem/i }).lean();
  console.log('Salem opportunities found:', JSON.stringify(opps, null, 2));

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
