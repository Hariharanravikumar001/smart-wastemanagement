import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import Opportunity from '../models/Opportunity';

export const verifyOwnership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const opportunityId = req.params['id'] || req.body.opportunity_id;

        if (!opportunityId) {
            res.status(400).json({ message: 'Opportunity ID is required' });
            return;
        }

        const opportunity = await Opportunity.findById(opportunityId);

        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        const creatorId = opportunity.ngo_id ? opportunity.ngo_id.toString() : '';

        console.log('Final Ownership Decision:', {
            oppCreator: creatorId,
            userId: req.user!.id,
            userRole: req.user!.role,
            isCreator: creatorId === req.user!.id,
            isAdmin: req.user!.role?.toLowerCase() === 'admin'
        });

        const isAdmin = req.user!.role?.toLowerCase() === 'admin';
        const isCreator = creatorId === req.user!.id;

        if (!isCreator && !isAdmin) {
            const msg = `Access denied: You are not the creator. (User ID: ${req.user!.id}, Creator ID: ${creatorId})`;
            console.log(msg);
            res.status(403).json({ message: msg });
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
