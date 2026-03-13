import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String },
});
const User = mongoose.model('User', userSchema);

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  ngo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false }
});
const Opportunity = mongoose.model('Opportunity', opportunitySchema);

const applicationSchema = new mongoose.Schema({
  opportunity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  volunteer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String }
});
const Application = mongoose.model('Application', applicationSchema);

const uri = 'mongodb://admin:admin123@ac-fft6zbl-shard-00-00.kasfsbc.mongodb.net:27017,ac-fft6zbl-shard-00-01.kasfsbc.mongodb.net:27017,ac-fft6zbl-shard-00-02.kasfsbc.mongodb.net:27017/wastezero?ssl=true&replicaSet=atlas-ggz0rh-shard-0&authSource=admin&retryWrites=true&w=majority&appName=hariharan';

mongoose.connect(uri)
  .then(async () => {
    console.log('✅ Connected to DB');
    
    const admin = await User.findOne({ role: 'Admin' });
    console.log('👤 Admin found:', admin ? admin.email : 'None');
    console.log('🆔 Admin ID:', admin ? admin._id : 'None');

    const opportunities = await Opportunity.find({ isDeleted: false });
    console.log('📊 Total Active Opportunities:', opportunities.length);
    
    for (const opp of opportunities) {
      const apps = await Application.find({ opportunity_id: opp._id });
      console.log(`📍 Opp: ${opp.title} (ID: ${opp._id}, NGO: ${opp.ngo_id}) - Apps: ${apps.length}`);
      if (apps.length > 0) {
          apps.forEach(a => console.log(`  - 📄 App ID: ${a._id}, Status: ${a.status}`));
      }
    }

    const allApps = await Application.find({});
    console.log('📈 Total Applications in DB:', allApps.length);

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
