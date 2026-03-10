import express from 'express';
import { getAnalytics } from '../controllers/adminController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();

// @route   GET /api/admin/analytics
// @access  Private (Admin)
router.get('/analytics', authProtect, requireRole(['Admin']), getAnalytics);

export default router;
