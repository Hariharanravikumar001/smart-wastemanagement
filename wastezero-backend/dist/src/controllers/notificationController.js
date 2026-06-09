"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification_1.default.find({ recipient_id: userId }).sort({ timestamp: -1 }).lean();
        res.status(200).json(notifications);
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getNotifications = getNotifications;
// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params['id'];
        const notification = await Notification_1.default.findOneAndUpdate({ _id: notificationId, recipient_id: userId }, { is_read: true }, { new: true });
        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        res.status(200).json(notification);
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
