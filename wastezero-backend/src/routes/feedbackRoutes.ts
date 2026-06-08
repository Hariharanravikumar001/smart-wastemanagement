import express from 'express';
import { submitFeedback, getFeedback } from '../controllers/feedbackController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();

// @route   POST /api/feedback
// @desc    Submit feedback/review
// @access  Private (Any authenticated user)
router.post('/', authProtect, submitFeedback);

// @route   GET /api/feedback
// @desc    Get all feedback for admin sentiment analysis
// @access  Private (Admin only)
router.get('/', authProtect, requireRole(['admin']), getFeedback);

export default router;
