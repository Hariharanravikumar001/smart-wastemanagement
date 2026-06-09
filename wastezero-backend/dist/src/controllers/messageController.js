"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.getConversationsList = exports.getConversation = exports.sendMessage = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const socketService_1 = require("../services/socketService");
const notificationService_1 = require("../services/notificationService");
// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
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
        const newMessage = new Message_1.default({
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
        (0, socketService_1.emitToUser)(receiver_id, 'new_message', newMessage);
        let senderName = 'User';
        try {
            const sender = await User_1.default.findById(sender_id);
            if (sender)
                senderName = sender.name;
        }
        catch (err) {
            console.error('Error fetching sender name:', err);
        }
        const messageObj = newMessage.toObject();
        messageObj.id = newMessage._id.toString();
        messageObj.senderId = sender_id.toString();
        messageObj.receiverId = receiver_id.toString();
        messageObj.senderName = senderName;
        console.log(`📡 Emitting message from ${senderName} (${sender_id}) to ${receiver_id}`);
        // Emit real-time message to receiver (with senderName)
        (0, socketService_1.emitToUser)(receiver_id.toString(), 'new_message', messageObj);
        // Also create a real-time notification
        try {
            await (0, notificationService_1.createNotification)(receiver_id, 'New Message', `You have a new message from ${senderName}`, 'info');
        }
        catch (notifErr) {
            console.error('Error creating message notification:', notifErr);
        }
        res.status(201).json(messageObj);
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
// @desc    Get conversation history between two users
// @route   GET /api/messages/:partnerId
// @access  Private
const getConversation = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { opportunityId } = req.query;
        const userIdStr = req.user?.id;
        if (!userIdStr || !partnerId) {
            res.status(400).json({ message: 'Invalid request parameters' });
            return;
        }
        const userId = new mongoose_1.default.Types.ObjectId(userIdStr);
        const pId = new mongoose_1.default.Types.ObjectId(partnerId);
        let matchQuery = {
            $or: [
                { sender_id: userId, receiver_id: pId },
                { sender_id: pId, receiver_id: userId }
            ],
            deletedFor: { $ne: userId }
        };
        if (opportunityId) {
            matchQuery.opportunity_id = new mongoose_1.default.Types.ObjectId(opportunityId);
        }
        else {
            // Include both generic messages and those with opportunity IDs if not specified
            // This ensures messages are visible regardless of context
        }
        const messages = await Message_1.default.aggregate([
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
    }
    catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getConversation = getConversation;
// @desc    Get list of active conversations
// @route   GET /api/messages/conversations
// @access  Private
const getConversationsList = async (req, res) => {
    try {
        const userIdStr = req.user?.id;
        if (!userIdStr) {
            res.status(401).json({ message: 'User not authorized' });
            return;
        }
        const userId = new mongoose_1.default.Types.ObjectId(userIdStr);
        console.log(`🔍 Fetching conversations for user: ${userId}`);
        // Aggregate to find unique conversation partners and their last message
        const conversations = await Message_1.default.aggregate([
            {
                $match: {
                    $or: [
                        { sender_id: userId },
                        { receiver_id: userId }
                    ],
                    deletedFor: { $ne: userId }
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
    }
    catch (error) {
        console.error('Get conversations list error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getConversationsList = getConversationsList;
// @desc    Mark messages from a partner as read
// @route   PUT /api/messages/read/:partnerId
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { opportunityId } = req.query;
        const userId = req.user.id;
        const filter = {
            sender_id: partnerId,
            receiver_id: userId,
            isRead: false
        };
        if (opportunityId) {
            filter.opportunity_id = new mongoose_1.default.Types.ObjectId(opportunityId);
        }
        // Update all messages where I am the receiver and partner is the sender
        await Message_1.default.updateMany(filter, { $set: { isRead: true } });
        // Notify the partner (the sender) via socket that their messages were read
        (0, socketService_1.emitToUser)(partnerId, 'messages_read', { readerId: userId });
        res.status(200).json({ message: 'Messages marked as read' });
    }
    catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
