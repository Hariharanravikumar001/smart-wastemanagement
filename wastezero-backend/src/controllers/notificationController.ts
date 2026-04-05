import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Notification from '../models/Notification';

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const notifications = await Notification.find({ recipient_id: userId }).sort({ timestamp: -1 }).lean();
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const notificationId = req.params['id'];

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient_id: userId },
            { is_read: true },
            { new: true }
        );

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.status(200).json(notification);
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
