import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import Opportunity from '../models/Opportunity';

export const verifyOwnership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const opportunityId = req.params.id || req.body.opportunity_id;

        if (!opportunityId) {
            res.status(400).json({ message: 'Opportunity ID is required' });
            return;
        }

        const opportunity = await Opportunity.findById(opportunityId);

        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        if (opportunity.ngo_id.toString() !== req.user.id) {
            res.status(403).json({ message: 'Access denied: You are not the creator of this opportunity' });
            return;
        }

        // Attach opportunity to request to avoid fetching it again in the controller
        (req as any).opportunity = opportunity;
        next();
    } catch (error) {
        console.error('Ownership validation error:', error);
        res.status(500).json({ message: 'Server error during ownership validation' });
    }
};
