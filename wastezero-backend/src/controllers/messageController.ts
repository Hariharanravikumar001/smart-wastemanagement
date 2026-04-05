import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Message from '../models/Message';
import User from '../models/User';
import Notification from '../models/Notification';
import mongoose from 'mongoose';
import { emitToUser } from '../services/socketService';
import { createNotification } from '../services/notificationService';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { receiver_id, content, messageType, mediaUrl, opportunity_id } = req.body;
        const sender_id = req.user?.id;

        if (!sender_id) {
            res.status(401).json({ message: 'User not authorized' });
            return;
        }

        if (!receiver_id || !content) {
            res.status(400).json({ message: 'Receiver and content are required' });
            return;
        }

        const newMessage = new Message({
            sender_id,
            receiver_id,
            opportunity_id: opportunity_id || undefined,
            content,
            messageType: messageType || 'text',
            mediaUrl
        });

        await newMessage.save();
        console.log(`✅ Message saved from ${sender_id} to ${receiver_id}`);

        // Emit real-time message to receiver
        emitToUser(receiver_id, 'new_message', newMessage);

        let senderName = 'User';
        try {
            const sender = await User.findById(sender_id);
            if (sender) senderName = sender.name;
        } catch (err) {
            console.error('Error fetching sender name:', err);
        }

        const messageObj = newMessage.toObject() as any;
        messageObj.id = newMessage._id.toString();
        messageObj.senderId = sender_id.toString();
        messageObj.receiverId = receiver_id.toString();
        messageObj.senderName = senderName;

        console.log(`📡 Emitting message from ${senderName} (${sender_id}) to ${receiver_id}`);

        // Emit real-time message to receiver (with senderName)
        emitToUser(receiver_id.toString(), 'new_message', messageObj);

        // Also create a real-time notification
        try {
            await createNotification(
                receiver_id,
                'New Message',
                `You have a new message from ${senderName}`,
                'info'
            );
        } catch (notifErr) {
            console.error('Error creating message notification:', notifErr);
        }

        res.status(201).json(messageObj);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get conversation history between two users
// @route   GET /api/messages/:partnerId
// @access  Private
export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { partnerId } = req.params;
        const { opportunityId } = req.query;
        const userIdStr = req.user?.id;

        if (!userIdStr || !partnerId) {
            res.status(400).json({ message: 'Invalid request parameters' });
            return;
        }

        const userId = new mongoose.Types.ObjectId(userIdStr as string);
        const pId = new mongoose.Types.ObjectId(partnerId as string);

        let matchQuery: any = {
            $or: [
                { sender_id: userId, receiver_id: pId },
                { sender_id: pId, receiver_id: userId }
            ]
        };

        if (opportunityId) {
            matchQuery.opportunity_id = new mongoose.Types.ObjectId(opportunityId as string);
        } else {
            // Include both generic messages and those with opportunity IDs if not specified
            // This ensures messages are visible regardless of context
        }

        const messages = await Message.aggregate([
            {
                $match: matchQuery
            },
            {
                $sort: { timestamp: 1 }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender_id',
                    foreignField: '_id',
                    as: 'senderInfo'
                }
            },
            {
                $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    id: '$_id',
                    senderId: '$sender_id',
                    receiverId: '$receiver_id',
                    senderName: { $ifNull: ['$senderInfo.name', 'User'] },
                    content: 1,
                    messageType: 1,
                    mediaUrl: 1,
                    timestamp: 1,
                    isRead: 1,
                    isDelivered: 1,
                    isDeletedForEveryone: 1,
                    deletedFor: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json(messages);
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get list of active conversations
// @route   GET /api/messages/conversations
// @access  Private
export const getConversationsList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userIdStr = req.user?.id;
        if (!userIdStr) {
            res.status(401).json({ message: 'User not authorized' });
            return;
        }
        const userId = new mongoose.Types.ObjectId(userIdStr as string);

        console.log(`🔍 Fetching conversations for user: ${userId}`);
        // Aggregate to find unique conversation partners and their last message
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
                    messageId: { $first: "$_id" },
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
                $lookup: {
                    from: 'opportunities',
                    localField: '_id.opportunityId',
                    foreignField: '_id',
                    as: 'opportunity'
                }
            },
            {
                $unwind: { path: '$opportunity', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    partnerId: '$_id.partnerId',
                    opportunityId: '$_id.opportunityId',
                    partnerName: '$partner.name',
                    opportunityTitle: '$opportunity.title',
                    lastMessage: 1,
                    lastMessageTime: 1,
                    unreadCount: 1,
                    _id: 0
                }
            },
            {
                $sort: { lastMessageTime: -1 }
            }
        ]);

        console.log(`✅ Found ${conversations.length} conversations for ${userId}`);
        res.status(200).json(conversations);
    } catch (error) {
        console.error('Get conversations list error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark messages from a partner as read
// @route   PUT /api/messages/read/:partnerId
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { partnerId } = req.params;
        const { opportunityId } = req.query;
        const userId = req.user!.id;

        const filter: any = { 
            sender_id: partnerId as string, 
            receiver_id: userId as string, 
            isRead: false 
        };

        if (opportunityId) {
            filter.opportunity_id = new mongoose.Types.ObjectId(opportunityId as string);
        }

        // Update all messages where I am the receiver and partner is the sender
        await Message.updateMany(filter, { $set: { isRead: true } });

        // Notify the partner (the sender) via socket that their messages were read
        emitToUser(partnerId as string, 'messages_read', { readerId: userId });

        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
