import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Opportunity from './src/models/Opportunity';

dotenv.config();

async function testQuery() {
    try {
        await mongoose.connect(process.env['MONGO_URI'] || '');
        console.log('Connected to DB');

        const location = 'Test Location';
        const skills = ['React'];
        const acceptedOppIds: any[] = [];

        let matchStage: any[] = [];
        
        if (location) {
            matchStage.push({
                $addFields: {
                    locationScore: {
                        $cond: [{ $regexMatch: { input: "$location", regex: location, options: "i" } }, 10, 0]
                    }
                }
            });
        }

        if (skills && skills.length > 0) {
            matchStage.push({
                $addFields: {
                    skillScore: {
                        $ifNull: [
                            {
                                $multiply: [
                                    { $size: { $setIntersection: [{ $ifNull: ["$skills", []] }, skills] } },
                                    5
                                ]
                            },
                            0
                        ]
                    }
                }
            });
        }

        let query = { 
            $or: [
                { status: 'open', isDeleted: false },
                { _id: { $in: acceptedOppIds }, isDeleted: false }
            ]
        };

        const opportunities = await Opportunity.aggregate([
            { $match: query },
            ...matchStage,
            { $limit: 1 }
        ]);
        
        console.log('Query succeeded!', opportunities.length);
    } catch (err) {
        console.error('Query failed:', err);
    } finally {
        mongoose.disconnect();
    }
}

testQuery();
