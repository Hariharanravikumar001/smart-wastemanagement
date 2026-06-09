"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoUri = process.env['MONGODB_URI'];
async function check() {
    if (!mongoUri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }
    console.log('⏳ Connecting to MongoDB...');
    try {
        await mongoose_1.default.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected.');
        const db = mongoose_1.default.connection.db;
        if (!db) {
            console.error('❌ Connection FAILED: Database object is undefined.');
            process.exit(1);
        }
        const collections = await db.listCollections().toArray();
        console.log('\n📊 Collection Statistics:');
        for (const c of collections) {
            try {
                const count = await db.collection(c.name).countDocuments();
                console.log(`- ${c.name}: ${count}`);
            }
            catch (err) {
                console.error(`- ${c.name}: ERROR (${err.message})`);
            }
        }
        console.log('\n🔍 Testing Opportunity collection specifically...');
        const startTime = Date.now();
        try {
            const opps = await db.collection('opportunities').find({}).limit(5).toArray();
            console.log(`✅ Opportunity sample fetched in ${Date.now() - startTime}ms. Count: ${opps.length}`);
        }
        catch (err) {
            console.error(`❌ Opportunity fetch FAILED after ${Date.now() - startTime}ms: ${err.message}`);
        }
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Connection FAILED:', err.message);
        process.exit(1);
    }
}
check();
