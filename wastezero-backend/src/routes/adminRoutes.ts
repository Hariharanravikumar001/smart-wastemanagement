import express from 'express';
import { getAnalytics, getUsers, updateUserStatus, getAdminLogs } from '../controllers/adminController';
import { getUserStats } from '../controllers/authController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();

// @route   GET /api/admin/analytics
// @access  Private (Admin/NGO)
router.get('/analytics', authProtect, requireRole(['admin', 'ngo']), getAnalytics);

// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', authProtect, requireRole(['admin']), getUsers);

// @route   POST /api/admin/user-status
// @access  Private (Admin)
router.post('/user-status', authProtect, requireRole(['admin']), updateUserStatus);

// @route   GET /api/admin/logs
// @access  Private (Admin)
router.get('/logs', authProtect, requireRole(['admin']), getAdminLogs);

// @route   GET /api/admin/user-stats
// @access  Private (Admin)
router.get('/user-stats', authProtect, requireRole(['admin']), getUserStats);

export default router;
