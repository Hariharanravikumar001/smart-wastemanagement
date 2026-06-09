"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCSVReport = exports.getAdminLogs = exports.updateUserStatus = exports.getUsers = exports.getAnalytics = void 0;
const WasteRequest_1 = __importDefault(require("../models/WasteRequest"));
const Application_1 = __importDefault(require("../models/Application"));
const User_1 = __importDefault(require("../models/User"));
const Opportunity_1 = __importDefault(require("../models/Opportunity"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const getAnalytics = async (req, res) => {
    try {
        const { range: analyticsRange = '1week' } = req.query;
        const analyticsNow = new Date();
        const analyticsThirtyDaysAgo = new Date(analyticsNow.getTime() - (30 * 24 * 60 * 60 * 1000));
        const analyticsSixtyDaysAgo = new Date(analyticsNow.getTime() - (60 * 24 * 60 * 60 * 1000));
        // Use Promise.allSettled to parallelize queries and prevent one failure from blocking others
        const results = await Promise.allSettled([
            // 0: WasteRequest Stats
            WasteRequest_1.default.aggregate([
                { $match: { status: 'Completed' } },
                { $group: {
                        _id: null,
                        totalWeight: { $sum: '$weight' },
                        count: { $sum: 1 },
                        recentWeight: { $sum: { $cond: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, '$weight', 0] } },
                        previousWeight: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }] }, '$weight', 0] } }
                    } }
            ]),
            // 1: activeUsersCount
            User_1.default.countDocuments(),
            // 2: volunteersCount
            User_1.default.countDocuments({ role: 'volunteer' }),
            // 3: totalOpportunities
            Opportunity_1.default.countDocuments({ isDeleted: false }),
            // 4: activeOpportunities
            Opportunity_1.default.countDocuments({ status: 'open', isDeleted: false }),
            // 5: completedOpportunities
            Opportunity_1.default.countDocuments({ status: 'closed', isDeleted: false }),
            // 6: totalApplications
            Application_1.default.countDocuments(),
            // 7: appStats
            Application_1.default.aggregate([
                { $group: {
                        _id: null,
                        total: { $sum: 1 },
                        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                        recentTotal: { $sum: { $cond: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, 1, 0] } },
                        recentAccepted: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, { $eq: ['$status', 'accepted'] }] }, 1, 0] } },
                        previousTotal: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }] }, 1, 0] } },
                        previousAccepted: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }, { $eq: ['$status', 'accepted'] }] }, 1, 0] } }
                    } }
            ])
        ]);
        // Process Waste Stats
        const requestStatsRaw = results[0].status === 'fulfilled' ? results[0].value[0] : null;
        const stats = requestStatsRaw || { totalWeight: 0, count: 0, recentWeight: 0, previousWeight: 0 };
        const totalImpact = stats.totalWeight || 0;
        const completedPickups = stats.count || 0;
        let totalImpactChange = 0;
        if (stats.previousWeight > 0)
            totalImpactChange = Math.round(((stats.recentWeight - stats.previousWeight) / stats.previousWeight) * 100);
        else if (stats.recentWeight > 0)
            totalImpactChange = 100;
        // Process Simple Counts
        const activeUsersCount = results[1].status === 'fulfilled' ? results[1].value : 0;
        const volunteersCount = results[2].status === 'fulfilled' ? results[2].value : 0;
        const totalOpportunities = results[3].status === 'fulfilled' ? results[3].value : 0;
        const activeOpportunities = results[4].status === 'fulfilled' ? results[4].value : 0;
        const completedOpportunities = results[5].status === 'fulfilled' ? results[5].value : 0;
        const totalApplications = results[6].status === 'fulfilled' ? results[6].value : 0;
        // Process App Stats
        const appsRaw = results[7].status === 'fulfilled' ? results[7].value[0] : null;
        const apps = appsRaw || { total: 0, accepted: 0, recentTotal: 0, recentAccepted: 0, previousTotal: 0, previousAccepted: 0 };
        const responseRate = apps.total > 0 ? Math.round((apps.accepted / apps.total) * 100) : 0;
        const recentRate = apps.recentTotal > 0 ? (apps.recentAccepted / apps.recentTotal) * 100 : 0;
        const previousRate = apps.previousTotal > 0 ? (apps.previousAccepted / apps.previousTotal) * 100 : 0;
        let responseRateChange = 0;
        if (previousRate > 0)
            responseRateChange = Math.round(recentRate - previousRate);
        else if (recentRate > 0)
            responseRateChange = Math.round(recentRate);
        // 5. Pickup Trends Data (Separate to keep main response fast if needed)
        let startDate = new Date();
        let labels = [];
        if (analyticsRange === '1day') {
            startDate.setHours(startDate.getHours() - 24);
            labels = Array.from({ length: 24 }, (_, i) => {
                const d = new Date(analyticsNow.getTime() - (23 - i) * 60 * 60 * 1000);
                return `${d.getHours()}:00`;
            });
        }
        else if (analyticsRange === '3days') {
            startDate.setDate(startDate.getDate() - 3);
            for (let i = 2; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        }
        else if (analyticsRange === '1week') {
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        }
        else if (analyticsRange === '1month') {
            startDate.setMonth(startDate.getMonth() - 1);
            for (let i = 29; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                if (i % 5 === 0)
                    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                else
                    labels.push('');
            }
        }
        const requests = await WasteRequest_1.default.find({ createdAt: { $gte: startDate } }).select('createdAt').limit(1000).lean();
        let trendData = new Array(labels.length).fill(0);
        requests.forEach(req => {
            const reqDate = new Date(req.createdAt);
            if (analyticsRange === '1day') {
                const hourDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (60 * 60 * 1000));
                if (hourDiff >= 0 && hourDiff < 24)
                    trendData[hourDiff]++;
            }
            else {
                const dayDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                if (dayDiff >= 0 && dayDiff < trendData.length)
                    trendData[dayDiff]++;
            }
        });
        res.status(200).json({
            totalImpact,
            totalImpactChange,
            responseRate,
            responseRateChange,
            activeUsers: activeUsersCount,
            totalVolunteers: volunteersCount,
            completedPickups,
            totalOpportunities,
            activeOpportunities,
            completedOpportunities,
            totalApplications,
            trends: { labels, data: trendData }
        });
    }
    catch (error) {
        console.error('Get analytics fatal error:', error);
        res.status(500).json({ message: 'Server error during analytics data collection.' });
    }
};
exports.getAnalytics = getAnalytics;
const getUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        let query = {};
        if (role)
            query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User_1.default.find(query)
            .sort({ created_at: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await User_1.default.countDocuments(query);
        res.status(200).json({ users, total });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
const updateUserStatus = async (req, res) => {
    try {
        const { userId, isSuspended } = req.body;
        const user = await User_1.default.findByIdAndUpdate(userId, { isSuspended }, { new: true });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Log the action
        await AdminLog_1.default.create({
            action: `${isSuspended ? 'Suspended' : 'Unsuspended'} user: ${user.email}`,
            user_id: req.user.id
        });
        res.status(200).json({ message: 'User status updated', user });
    }
    catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUserStatus = updateUserStatus;
const getAdminLogs = async (req, res) => {
    try {
        const logs = await AdminLog_1.default.find().populate('user_id', 'name email').sort({ timestamp: -1 }).limit(100);
        res.status(200).json(logs);
    }
    catch (error) {
        console.error('Get admin logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAdminLogs = getAdminLogs;
const generateCSVReport = async (req, res) => {
    try {
        const { type } = req.query;
        let data = [];
        let filename = `wastezero_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        let headers = '';
        if (type === 'users') {
            data = await User_1.default.find().lean();
            headers = 'ID,Name,Email,Username,Role,Location,Created At,Status\n';
            const rows = data.map(u => `${u._id},"${u.name}",${u.email},${u.username},${u.role},"${u.location || ''}",${u.created_at},${u.isSuspended ? 'Suspended' : 'Active'}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        }
        else if (type === 'opportunities') {
            data = await Opportunity_1.default.find({ isDeleted: false }).lean();
            headers = 'ID,Title,Status,Location,Required Skills,Duration,Created At\n';
            const rows = data.map(o => `${o._id},"${o.title}",${o.status},"${o.location}",${o.required_skills?.join('|')},${o.duration},${o.createdAt}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        }
        else if (type === 'applications') {
            data = await Application_1.default.find().populate('opportunity_id', 'title').populate('volunteer_id', 'name email').lean();
            headers = 'ID,Opportunity,Volunteer Name,Volunteer Email,Status,Created At\n';
            const rows = data.map(a => `${a._id},"${a.opportunity_id?.title || 'N/A'}","${a.volunteer_id?.name || 'N/A'}",${a.volunteer_id?.email || 'N/A'},${a.status},${a.createdAt}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        }
        else {
            res.status(400).json({ message: 'Invalid report type' });
        }
    }
    catch (error) {
        console.error('Generate CSV error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.generateCSVReport = generateCSVReport;
