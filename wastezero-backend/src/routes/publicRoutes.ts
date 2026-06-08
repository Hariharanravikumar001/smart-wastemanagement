import express from 'express';
import { getPublicAnalytics, getPublicStats } from '../controllers/pipelineController';

const router = express.Router();

// @route   GET api/public/analytics
// @desc    Public analytics stream for internal state/government pipelines
// @access  Public
router.get('/analytics', getPublicAnalytics);

// @route   GET api/public/stats
// @desc    Live platform stats for landing page
// @access  Public
router.get('/stats', getPublicStats);

export default router;
