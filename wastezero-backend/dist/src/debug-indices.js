"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
async function debugIndices() {
    const mongoUri = process.env['MONGODB_URI'];
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in .env');
        return;
    }
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        const collection = mongoose_1.default.connection.collection('users');
        const indexes = await collection.indexes();
        console.log('📊 Current Indexes:', JSON.stringify(indexes, null, 2));
        // List of problematic indices we've encountered or suspect
        const problematicIndices = ['id_1', 'username_1', 'id'];
        for (const idx of indexes) {
            if (problematicIndices.includes(idx.name) || (idx.key && (idx.key['id'] || idx.key['username']))) {
                // We want to keep email_1 if it's there, but id and username are suspect if not in schema
                if (idx.name !== 'email_1' && idx.name !== '_id_') {
                    console.log(`⚠️ Found suspect index: ${idx.name}. Dropping it...`);
                    await collection.dropIndex(idx.name);
                    console.log(`✅ Index ${idx.name} dropped successfully.`);
                }
            }
        }
    }
    catch (err) {
        console.error('❌ Error in debugIndices:', err.message);
    }
    finally {
        console.log('⏳ Disconnecting from MongoDB...');
        await mongoose_1.default.connection.close();
        console.log('✅ Disconnected.');
    }
}
debugIndices().catch(err => console.error('Unhandled Rejection:', err));
