
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoUri = process.env['MONGODB_URI'];

if (!mongoUri) {
    console.error('MONGODB_URI not found');
    process.exit(1);
}

mongoose.connect(mongoUri).then(async () => {
    console.log('Connected to DB');
    const opps = await mongoose.connection.db!.collection('opportunities').find({}).toArray();
    console.log('RAW OPPORTUNITIES DATA:');
    console.log(JSON.stringify(opps, null, 2));
    process.exit(0);
}).catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
});
