const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugIndices() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found');
    return;
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const collection = mongoose.connection.collection('users');
    const indexes = await collection.indexes();
    console.log('Current Indexes:', JSON.stringify(indexes, null, 2));

    // List of problematic indices we've encountered or suspect
    const problematicIndices = ['id_1', 'username_1', 'id'];
    
    for (const idx of indexes) {
      if (problematicIndices.includes(idx.name) || (idx.key && (idx.key.id || idx.key.username))) {
        // We want to keep email_1 if it's there, but id and username are suspect if not in schema
        if (idx.name !== 'email_1' && idx.name !== '_id_') {
           console.log(`Found suspect index: ${idx.name}. Dropping it...`);
           await collection.dropIndex(idx.name);
           console.log(`✅ Index ${idx.name} dropped successfully.`);
        }
      }
    }

  } catch (err) {
    console.error('❌ Error in debugIndices:', err);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.connection.close();
    console.log('Disconnected.');
  }
}

debugIndices().catch(err => console.error('Unhandled Rejection:', err));
