import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        // 1. Total Impact (Sum of weight of Completed requests)
        const completedRequests = await WasteRequest.find({ status: 'Completed' });
        const totalImpact = completedRequests.reduce((sum, req) => sum + (req.weight || 0), 0);

        // Calculate impact change
        const recentImpact = completedRequests
            .filter(r => r.createdAt >= thirtyDaysAgo)
            .reduce((sum, r) => sum + (r.weight || 0), 0);
        
        const previousImpact = completedRequests
            .filter(r => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo)
            .reduce((sum, r) => sum + (r.weight || 0), 0);

        let totalImpactChange = 0;
        if (previousImpact > 0) {
            totalImpactChange = Math.round(((recentImpact - previousImpact) / previousImpact) * 100);
        } else if (recentImpact > 0) {
            totalImpactChange = 100;
        }

        // 2. Volunteer Response Rate (Accepted / Total Applications)
        const allApplications = await Application.find();
        const totalApps = allApplications.length;
        const acceptedApps = allApplications.filter(a => a.status === 'accepted').length;
        
        const responseRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 0;

        // Calculate response rate change
        const recentApps = allApplications.filter(a => a.createdAt >= thirtyDaysAgo);
        const recentAccepted = recentApps.filter(a => a.status === 'accepted').length;
        const recentRate = recentApps.length > 0 ? (recentAccepted / recentApps.length) * 100 : 0;

        const previousApps = allApplications.filter(a => a.createdAt >= sixtyDaysAgo && a.createdAt < thirtyDaysAgo);
        const previousAccepted = previousApps.filter(a => a.status === 'accepted').length;
        const previousRate = previousApps.length > 0 ? (previousAccepted / previousApps.length) * 100 : 0;

        let responseRateChange = 0;
        if (previousRate > 0) {
            responseRateChange = Math.round(recentRate - previousRate);
        } else if (recentRate > 0) {
            responseRateChange = Math.round(recentRate);
        }

        res.status(200).json({
            totalImpact,
            totalImpactChange,
            responseRate,
            responseRateChange
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
