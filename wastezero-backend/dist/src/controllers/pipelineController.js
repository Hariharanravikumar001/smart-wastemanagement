"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStats = exports.getPublicAnalytics = void 0;
const User_1 = __importDefault(require("../models/User"));
const Opportunity_1 = __importDefault(require("../models/Opportunity"));
const WasteRequest_1 = __importDefault(require("../models/WasteRequest"));
const getPublicAnalytics = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const activeVolunteers = await User_1.default.countDocuments({ role: 'volunteer' });
        const rawWastes = await WasteRequest_1.default.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, totalWeight: { $sum: "$weight" } } }
        ]);
        const grossTonnage = rawWastes.length > 0 ? (rawWastes[0].totalWeight / 1000).toFixed(2) : 0; // In metric tons
        const opportunityStats = await Opportunity_1.default.aggregate([
            { $group: { _id: "$wasteType", count: { $sum: 1 } } }
        ]);
        const locationDensity = await WasteRequest_1.default.aggregate([
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
    }
    catch (error) {
        console.error('Public Data Pipeline Error:', error);
        res.status(500).json({ error: 'Internal pipeline error', message: error.message });
    }
};
exports.getPublicAnalytics = getPublicAnalytics;
// @desc    Get live public stats for landing page (users, pickups, NGO count)
// @route   GET /api/public/stats
// @access  Public
const getPublicStats = async (req, res) => {
    try {
        const [totalUsers, completedPickups, ngoCount] = await Promise.all([
            User_1.default.countDocuments(),
            WasteRequest_1.default.countDocuments({ status: 'Completed' }),
            User_1.default.countDocuments({ role: { $in: ['Admin', 'admin', 'NGO', 'ngo'] } })
        ]);
        res.json({
            totalUsers,
            completedPickups,
            ngoPartners: ngoCount
        });
    }
    catch (error) {
        console.error('Public Stats Error:', error);
        res.status(500).json({ error: 'Stats error', message: error.message });
    }
};
exports.getPublicStats = getPublicStats;
