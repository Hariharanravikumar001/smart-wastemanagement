
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoUri = process.env['MONGODB_URI'];

mongoose.connect(mongoUri!).then(async () => {
    console.log('Connected to DB');
    const Opportunity = mongoose.connection.db!.collection('opportunities');
    const ngo = await mongoose.connection.db!.collection('users').findOne({ 
        role: { $in: ['admin', 'ngo', 'organization/admin'] } 
    });
    
    if (!ngo) {
        console.error('No NGO found to associate with opportunity');
        process.exit(1);
    }

    const newOpp = {
        title: 'Diagnostic Match Project',
        description: 'Auto-generated to test volunteer matching',
        skills: [],
        duration: '2 hours',
        location: 'Test City',
        status: 'open',
        ngo_id: ngo._id,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await Opportunity.insertOne(newOpp);
    console.log('Created matching opportunity in Test City');
    process.exit(0);
});
