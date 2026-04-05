import mongoose from 'mongoose';
import Message from './src/models/Message';
import User from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/wastezero';

async function testAggregation() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Find an admin
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found, skipping test');
            return;
        }

        const userId = admin._id;
        console.log(`Testing conversations for admin: ${admin.name} (${userId})`);

        // Run the aggregation logic
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender_id: userId },
                        { receiver_id: userId }
                    ]
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: {
                        partnerId: {
                            $cond: {
                                if: { $eq: ["$sender_id", userId] },
                                then: "$receiver_id",
                                else: "$sender_id"
                            }
                        },
                        opportunityId: "$opportunity_id"
                    },
                    lastMessage: { $first: "$content" },
                    lastMessageTime: { $first: "$timestamp" },
                    unreadCount: {
                        $sum: {
                            $cond: {
                                if: { $and: [{ $eq: ["$receiver_id", userId] }, { $eq: ["$isRead", false] }] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.partnerId',
                    foreignField: '_id',
                    as: 'partner'
                }
            },
            {
                $unwind: { path: '$partner', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    partnerId: '$_id.partnerId',
                    partnerName: '$partner.name',
                    lastMessage: 1,
                    lastMessageTime: 1,
                    unreadCount: 1,
                    _id: 0
                }
            }
        ]);

        console.log('Aggregation result:', JSON.stringify(conversations, null, 2));

        if (conversations.length > 0) {
            console.log('✅ SUCCESS: Aggregation returned conversations');
        } else {
            console.log('ℹ️ No conversations found for this user (this is fine if no messages exist, but previously it would fail if they DID exist)');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

testAggregation();
