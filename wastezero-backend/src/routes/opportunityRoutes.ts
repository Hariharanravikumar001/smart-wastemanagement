import express from 'express';
import {
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    getOpportunities,
    getOpportunityById,
    getMatchedOpportunities,
    completeOpportunity
} from '../controllers/opportunityController';
import { authProtect } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { verifyOwnership } from '../middleware/ownershipMiddleware';

const router = express.Router();

// Publicly readable routes
// @route   GET /api/opportunities
router.get('/', getOpportunities);

// @route   GET /api/opportunities/:id
router.get('/:id', getOpportunityById);

// Protected routes below
router.use(authProtect);

// @route   GET /api/opportunities/matches
router.get('/matches', requireRole(['volunteer']), getMatchedOpportunities);

// @route   POST /api/opportunities
router.post('/', requireRole(['admin', 'ngo']), createOpportunity);

// @route   PUT /api/opportunities/:id
router.put('/:id', requireRole(['admin', 'ngo']), verifyOwnership, updateOpportunity);

// @route   DELETE /api/opportunities/:id
router.delete('/:id', requireRole(['admin', 'ngo']), verifyOwnership, deleteOpportunity);

// @route   PATCH /api/opportunities/:id/complete
router.patch('/:id/complete', requireRole(['admin', 'volunteer']), completeOpportunity);

export default router;
