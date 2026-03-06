import express from 'express';
import {
    applyForOpportunity,
    getAdminApplications,
    getVolunteerApplications,
    updateApplicationStatus
} from '../controllers/applicationController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(authProtect);

// @route   POST /api/applications
router.post('/', requireRole(['volunteer']), applyForOpportunity);

// @route   GET /api/applications/admin
router.get('/admin', requireRole(['admin']), getAdminApplications);

// @route   GET /api/applications/volunteer
router.get('/volunteer', requireRole(['volunteer']), getVolunteerApplications);

// @route   PUT /api/applications/:id/status
router.put('/:id/status', requireRole(['admin']), updateApplicationStatus);

export default router;
