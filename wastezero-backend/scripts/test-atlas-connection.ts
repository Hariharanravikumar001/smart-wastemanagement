const { MongoClient, ServerApiVersion } = require('mongodb');
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env['MONGODB_URI'];

if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
}

// Bypass SRV lookup entirely as it's failing with ECONNREFUSED in this environment
const finalUri = process.env['MONGODB_URI'];
if (!finalUri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
}

console.log('Attempting Direct Connect to Shard 00-00...');

const client = new MongoClient(finalUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 10000
});

async function run() {
  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ SUCCESS: Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err: any) {
    console.error("❌ FAILURE:", err.message);
    if (err.name) console.error("   Error Name:", err.name);
    if (err.code) console.error("   Error Code:", err.code);
    if (err.stack) console.error("   Stack Trace:", err.stack.split('\n').filter((l: string) => !l.includes('node_modules')).join('\n'));
  } finally {
    await client.close();
  }
}

run();
