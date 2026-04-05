import { Request, Response } from 'express';
import User from '../models/User';
import Opportunity from '../models/Opportunity';
import WasteRequest from '../models/WasteRequest';

export const getPublicAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const totalUsers = await User.countDocuments();
        const activeVolunteers = await User.countDocuments({ role: 'volunteer' });
        
        const rawWastes = await WasteRequest.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, totalWeight: { $sum: "$weight" } } }
        ]);
        const grossTonnage = rawWastes.length > 0 ? (rawWastes[0].totalWeight / 1000).toFixed(2) : 0; // In metric tons

        const opportunityStats = await Opportunity.aggregate([
            { $group: { _id: "$wasteType", count: { $sum: 1 } } }
        ]);

        const locationDensity = await WasteRequest.aggregate([
            { $group: { _id: "$location", pickups: { $sum: 1 } } },
            { $sort: { pickups: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            platformHealth: {
                status: 'operational',
                timestamp: new Date().toISOString()
            },
            demographics: {
                totalRegisteredCitizens: totalUsers,
                activeFieldVolunteers: activeVolunteers
            },
            environmentalImpact: {
                grossMetricTonsDiverted: Number(grossTonnage),
                topWasteCategories: opportunityStats.map(s => ({ category: s._id || 'Mixed', supplyCount: s.count }))
            },
            hotspots: locationDensity.map(l => ({ zipOrRegion: l._id, concentration: l.pickups }))
        });
    } catch (error: any) {
        console.error('Public Data Pipeline Error:', error);
        res.status(500).json({ error: 'Internal pipeline error', message: error.message });
    }
};
