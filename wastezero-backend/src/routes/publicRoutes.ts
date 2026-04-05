import express from 'express';
import { getPublicAnalytics } from '../controllers/pipelineController';

const router = express.Router();

// @route   GET api/public/analytics
// @desc    Public analytics stream for internal state/government pipelines
// @access  Public
router.get('/analytics', getPublicAnalytics);

export default router;
