const { MongoClient } = require('mongodb');

// Using direct shard addresses to bypass querySrv ECONNREFUSED 
const uri = "mongodb://admin123:admin123@ac-qdx8zdk-shard-00-00.0hwwy5p.mongodb.net:27017,ac-qdx8zdk-shard-00-01.0hwwy5p.mongodb.net:27017,ac-qdx8zdk-shard-00-02.0hwwy5p.mongodb.net:27017/wastezero?ssl=true&replicaSet=atlas-qdx8zdk-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log('--- DIRECT SHARD CONNECTION TEST (waste.0hwwy5p) ---');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

async function test() {
  try {
    console.log('⏳ Connecting directly to shards (bypassing SRV DNS)...');
    await client.connect();
    console.log('✅ Connected! Sending ping...');
    const ping = await client.db("admin").command({ ping: 1 });
    console.log('✅ SUCCESS! Connected to MongoDB!', ping);
  } catch (err) {
    console.error('❌ FAILED!');
    console.error('   Error Name:', err.name);
    console.error('   Error Message:', err.message);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

test();
