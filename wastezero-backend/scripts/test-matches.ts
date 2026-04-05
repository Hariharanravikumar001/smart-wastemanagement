import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Opportunity from './src/models/Opportunity';
import Application from './src/models/Application';
import User from './src/models/User';

dotenv.config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env['MONGODB_URI'] || 'mongodb://127.0.0.1:27017/wastezero');
        console.log('Connected to MongoDB');

        // Check if there are any opportunities
        const total = await Opportunity.countDocuments();
        console.log(`Total Opportunities in DB: ${total}`);

        if (total === 0) {
            console.log('No opportunities found. Cannot test match pipeline.');
            process.exit(0);
        }

        const sampleOpp = await Opportunity.findOne();
        console.log('Sample Opportunity:', JSON.stringify(sampleOpp, null, 2));

        // Test the matching pipeline
        let query: any = { 
            $or: [
                { status: 'open', isDeleted: false }
            ]
        };

        const opportunities = await Opportunity.aggregate([
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
                    totalScore: { $add: [{ $ifNull: ["$locationScore", 0] }, { $ifNull: ["$skillScore", 0] }] },
                    organizationName: "$ngo_data.name"
                }
            },
            { $sort: { totalScore: -1, createdAt: -1 } },
            { $limit: 10 }
        ]);

        console.log(`Pipeline Returned ${opportunities.length} matched opportunities.`);
        if(opportunities.length > 0) {
            console.log('First matched Opp:', JSON.stringify(opportunities[0], null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runTest();
