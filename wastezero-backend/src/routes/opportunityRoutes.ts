import express from 'express';
import {
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    getOpportunities,
    getOpportunityById
} from '../controllers/opportunityController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { verifyOwnership } from '../middleware/ownershipMiddleware';

const router = express.Router();

// Publicly readable? Usually yes, but spec says "listing API must... All opportunity and application APIs must require JWT"
router.use(authProtect);

// @route   GET /api/opportunities
router.get('/', requireRole(['admin', 'volunteer', 'ngo']), getOpportunities);

// @route   GET /api/opportunities/:id
router.get('/:id', requireRole(['admin', 'volunteer', 'ngo']), getOpportunityById);

// @route   POST /api/opportunities
router.post('/', requireRole(['admin', 'ngo']), createOpportunity);

// @route   PUT /api/opportunities/:id
router.put('/:id', requireRole(['admin', 'ngo']), verifyOwnership, updateOpportunity);

// @route   DELETE /api/opportunities/:id
router.delete('/:id', requireRole(['admin', 'ngo']), verifyOwnership, deleteOpportunity);

export default router;
