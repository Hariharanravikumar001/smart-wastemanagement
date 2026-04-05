
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoUri = process.env['MONGODB_URI'];

mongoose.connect(mongoUri!).then(async () => {
    console.log('Connected to DB');
    const db = mongoose.connection.db!;
    // Search in 'wastetasks' or 'waste-requests' since the model name might be different from the collection name
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const reqs = await db.collection('wastetasks').find({}).toArray();
    console.log('RAW wastetasks count:', reqs.length);
    
    const pickups = await db.collection('pickups').find({}).toArray();
    console.log('RAW pickups count:', pickups.length);
    if (pickups.length > 0) console.log('Sample pickup:', JSON.stringify(pickups[0], null, 2));

    const wastereqs = await db.collection('wasterequests').find({}).toArray();
    console.log('RAW wasterequests count:', wastereqs.length);
    if (wastereqs.length > 0) console.log('Sample wasterequest:', JSON.stringify(wastereqs[0], null, 2));

    process.exit(0);
});
