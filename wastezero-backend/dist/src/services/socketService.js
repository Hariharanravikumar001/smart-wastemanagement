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
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // In production, replace with specific origins
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);
        // Join a room based on user ID for private messaging
        socket.on('join', async (userId) => {
            if (userId) {
                socket.join(userId);
                socket.userId = userId;
                console.log(`User ${userId} joined their private room`);
                // Update online status in DB
                try {
                    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
                    await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
                    // Broadcast status to everyone
                    io.emit('user_status', { userId, isOnline: true });
                }
                catch (err) {
                    console.error('Error updating user online status:', err);
                }
            }
        });
        // Handle delivery acknowledgment
        socket.on('delivery_ack', async (data) => {
            try {
                const Message = (await Promise.resolve().then(() => __importStar(require('../models/Message')))).default;
                await Message.findByIdAndUpdate(data.messageId, { isDelivered: true });
                // Notify the sender that the message was delivered
                io.to(data.senderId).emit('message_delivered', { messageId: data.messageId });
                console.log(`✅ Delivery acknowledged for message ${data.messageId}`);
            }
            catch (err) {
                console.error('Error handling delivery acknowledgment:', err);
            }
        });
        // Handle message deletion
        socket.on('delete_message', async (data) => {
            try {
                const Message = (await Promise.resolve().then(() => __importStar(require('../models/Message')))).default;
                const message = await Message.findById(data.messageId);
                if (!message)
                    return;
                if (data.type === 'everyone') {
                    // Deleting for everyone: mark flag and clear content for privacy
                    message.isDeletedForEveryone = true;
                    message.content = 'This message was deleted';
                    message.mediaUrl = undefined;
                    await message.save();
                    // Notify both parties (sender and receiver)
                    io.to(message.sender_id.toString()).emit('message_update', message);
                    io.to(message.receiver_id.toString()).emit('message_update', message);
                    console.log(`🗑️ Message ${data.messageId} deleted for everyone`);
                }
                else {
                    // Deleting for me: add to deletedFor array
                    if (!message.deletedFor.includes(data.userId)) {
                        message.deletedFor.push(data.userId);
                        await message.save();
                    }
                    // Notify the user who deleted it (to update their local UI if needed)
                    io.to(data.userId).emit('message_update', message);
                    console.log(`🗑️ Message ${data.messageId} deleted for user ${data.userId}`);
                }
            }
            catch (err) {
                console.error('Error handling message deletion:', err);
            }
        });
        // Handle live location updates
        socket.on('update_live_location', async (data) => {
            try {
                const Message = (await Promise.resolve().then(() => __importStar(require('../models/Message')))).default;
                const locationUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
                const message = await Message.findByIdAndUpdate(data.messageId, { mediaUrl: locationUrl }, { new: true });
                if (message) {
                    // Notify both parties of the updated message
                    io.to(message.sender_id.toString()).emit('message_update', message);
                    io.to(message.receiver_id.toString()).emit('message_update', message);
                    console.log(`📡 Live location updated for message ${data.messageId}: ${data.lat}, ${data.lng}`);
                }
            }
            catch (err) {
                console.error('Error updating live location:', err);
            }
        });
        // Handle clearing the entire conversation (soft delete)
        socket.on('clear_conversation', async (data) => {
            try {
                const Message = (await Promise.resolve().then(() => __importStar(require('../models/Message')))).default;
                const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
                const userId = new mongoose.Types.ObjectId(data.userId);
                const pId = new mongoose.Types.ObjectId(data.partnerId);
                let query = {
                    $or: [
                        { sender_id: userId, receiver_id: pId },
                        { sender_id: pId, receiver_id: userId }
                    ]
                };
                if (data.opportunityId) {
                    query.opportunity_id = new mongoose.Types.ObjectId(data.opportunityId);
                }
                const messages = await Message.find(query);
                for (const msg of messages) {
                    if (!msg.deletedFor.includes(userId)) {
                        msg.deletedFor.push(userId);
                        await msg.save();
                    }
                }
                // Notify the user who cleared the chat
                socket.emit('conversation_cleared', { partnerId: data.partnerId, opportunityId: data.opportunityId });
                console.log(`🧹 Conversation cleared (soft delete) between ${data.userId} and ${data.partnerId}`);
            }
            catch (err) {
                console.error('Error clearing conversation:', err);
            }
        });
        // Handle live volunteer location sharing
        socket.on('share_volunteer_location', (data) => {
            const senderId = socket.userId;
            if (senderId) {
                io.to(data.receiverId).emit('volunteer_location_updated', {
                    volunteerId: senderId,
                    lat: data.lat,
                    lng: data.lng
                });
            }
        });
        socket.on('disconnect', async () => {
            const userId = socket.userId;
            console.log('Client disconnected:', socket.id, userId || '');
            if (userId) {
                try {
                    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
                    await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
                    // Broadcast status to everyone
                    io.emit('user_status', { userId, isOnline: false, lastActive: new Date() });
                }
                catch (err) {
                    console.error('Error updating user offline status:', err);
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId).emit(event, data);
        console.log(`Emitted ${event} to user ${userId}`);
    }
};
exports.emitToUser = emitToUser;
