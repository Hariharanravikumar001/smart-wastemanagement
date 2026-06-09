"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const socketService_1 = require("./socketService");
const createNotification = async (recipientId, title, message, type = 'info') => {
    try {
        const notification = new Notification_1.default({
            recipient_id: recipientId,
            title,
            message,
            type
        });
        const savedNotification = await notification.save();
        // Emit real-time notification to the user
        (0, socketService_1.emitToUser)(recipientId, 'new_notification', savedNotification);
        return savedNotification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
exports.createNotification = createNotification;
