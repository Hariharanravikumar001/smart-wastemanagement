import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import Opportunity from '../src/models/Opportunity';
import Application from '../src/models/Application';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
    try {
        await mongoose.connect(process.env['MONGODB_URI'] || '');
        console.log('Connected to DB');

        // 1. Create a dummy opportunity and mark it as closed
        const opp = new Opportunity({
            title: 'Test Fix Project',
            description: 'Verify if closed projects are hidden',
            skills: ['Test'],
            duration: '1 day',
            location: 'Test City',
            status: 'closed',
            ngo_id: new mongoose.Types.ObjectId()
        });
        await opp.save();
        console.log('Created closed opportunity:', opp._id);

        // 2. Create an accepted application for this project
        const volunteerId = new mongoose.Types.ObjectId();
        const app = new Application({
            opportunity_id: opp._id,
            volunteer_id: volunteerId,
            status: 'accepted'
        });
        await app.save();
        console.log('Created accepted application for project');

        // 3. Simulate getMatchedOpportunities query
        const acceptedApps = await Application.find({ volunteer_id: volunteerId, status: 'accepted' }).select('opportunity_id').lean();
        const acceptedOppIds = acceptedApps.map(a => a.opportunity_id);

        const query: any = { 
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
        }

        // Cleanup
        await Opportunity.findByIdAndDelete(opp._id);
        await Application.findByIdAndDelete(app._id);
        console.log('Cleanup done');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
