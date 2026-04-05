const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Define minimal schemas for verification
const OpportunitySchema = new mongoose.Schema({
    title: String,
    status: String,
    isDeleted: { type: Boolean, default: false },
    ngo_id: mongoose.Schema.Types.ObjectId
});

const ApplicationSchema = new mongoose.Schema({
    opportunity_id: mongoose.Schema.Types.ObjectId,
    volunteer_id: mongoose.Schema.Types.ObjectId,
    status: String
});

const Opportunity = mongoose.model('Opportunity_Verify', OpportunitySchema, 'opportunities');
const Application = mongoose.model('Application_Verify', ApplicationSchema, 'applications');

async function verify() {
    try {
        await mongoose.connect(process.env['MONGODB_URI'] || '');
        console.log('Connected to DB');

        const volunteerId = new mongoose.Types.ObjectId();
        const ngoId = new mongoose.Types.ObjectId();

        // 1. Create a closed opportunity
        const opp = new Opportunity({
            title: 'Test Fix Project JS',
            status: 'closed',
            isDeleted: false,
            ngo_id: ngoId
        });
        await opp.save();
        console.log('Created closed opportunity:', opp._id);

        // 2. Create an accepted application
        const app = new Application({
            opportunity_id: opp._id,
            volunteer_id: volunteerId,
            status: 'accepted'
        });
        await app.save();
        console.log('Created accepted application');

        // 3. Simulate backend query
        const acceptedApps = await Application.find({ volunteer_id: volunteerId, status: 'accepted' }).select('opportunity_id').lean();
        const acceptedOppIds = acceptedApps.map(a => a.opportunity_id);

        const query = { 
            status: { $ne: 'closed' },
            isDeleted: false,
            $or: [
                { status: 'open' },
                { _id: { $in: acceptedOppIds } }
            ]
        };

        const results = await Opportunity.find(query);
        console.log('Query results count (should be 0):', results.length);

        if (results.length === 0) {
            console.log('SUCCESS: Closed project was correctly excluded.');
        } else {
            console.log('FAILURE: Closed project was included in results.');
            console.log('Match record:', results[0]);
        }

        // Cleanup
        await Opportunity.findByIdAndDelete(opp._id);
        await Application.findByIdAndDelete(app._id);
        console.log('Cleanup done');

    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
