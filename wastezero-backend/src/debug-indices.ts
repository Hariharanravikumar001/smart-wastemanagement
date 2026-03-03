import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugIndices() {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) {
    console.error('MONGODB_URI not found');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('users');
    const indexes = await collection.indexes();
    console.log('Current Indexes:', JSON.stringify(indexes, null, 2));

    const idIndex = indexes.find(idx => idx.name === 'id_1' || (idx.key && idx.key.id));
    if (idIndex) {
      console.log(`Found problematic index on "id": ${idIndex.name}. Dropping it...`);
      await collection.dropIndex(idIndex.name);
      console.log('Index dropped successfully.');
    } else {
      console.log('No index on "id" found.');
    }

  } catch (err) {
    console.error('Error in debugIndices:', err);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.connection.close();
    console.log('Disconnected.');
  }
}

debugIndices().catch(err => console.error('Unhandled Rejection:', err));
