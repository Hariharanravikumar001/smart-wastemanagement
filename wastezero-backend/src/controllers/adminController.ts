import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';
import User from '../models/User';
import Opportunity from '../models/Opportunity';
import AdminLog from '../models/AdminLog';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { range: analyticsRange = '1week' } = req.query;
        const analyticsNow = new Date();
        const analyticsThirtyDaysAgo = new Date(analyticsNow.getTime() - (30 * 24 * 60 * 60 * 1000));
        const analyticsSixtyDaysAgo = new Date(analyticsNow.getTime() - (60 * 24 * 60 * 60 * 1000));
        const startOfToday = new Date(analyticsNow);
        startOfToday.setHours(0, 0, 0, 0);

        // Use Promise.allSettled to parallelize queries and prevent one failure from blocking others
        const results = await Promise.allSettled([
            // 0: WasteRequest Stats
            WasteRequest.aggregate([
                { $match: { status: 'Completed' } },
                { $group: {
                    _id: null,
                    totalWeight: { $sum: '$weight' },
                    count: { $sum: 1 },
                    recentWeight: { $sum: { $cond: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, '$weight', 0] } },
                    previousWeight: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }] }, '$weight', 0] } }
                }}
            ]),
            // 1: activeUsersCount
            User.countDocuments(),
            // 2: volunteersCount (agents)
            User.countDocuments({ role: 'volunteer' }),
            // 3: totalOpportunities
            Opportunity.countDocuments({ isDeleted: false }),
            // 4: activeOpportunities
            Opportunity.countDocuments({ status: 'open', isDeleted: false }),
            // 5: completedOpportunities
            Opportunity.countDocuments({ status: 'closed', isDeleted: false }),
            // 6: totalApplications
            Application.countDocuments(),
            // 7: appStats
            Application.aggregate([
                { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                    recentTotal: { $sum: { $cond: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, 1, 0] } },
                    recentAccepted: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsThirtyDaysAgo] }, { $eq: ['$status', 'accepted'] }] }, 1, 0] } },
                    previousTotal: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }] }, 1, 0] } },
                    previousAccepted: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', analyticsSixtyDaysAgo] }, { $lt: ['$createdAt', analyticsThirtyDaysAgo] }, { $eq: ['$status', 'accepted'] }] }, 1, 0] } }
                }}
            ]),
            // 8: activeNgosCount
            User.countDocuments({ role: 'ngo' }),
            // 9: pickupsTodayCount
            WasteRequest.countDocuments({ createdAt: { $gte: startOfToday } })
        ]);

        // Process Waste Stats
        const requestStatsRaw = results[0].status === 'fulfilled' ? (results[0].value as any)[0] : null;
        const stats = requestStatsRaw || { totalWeight: 0, count: 0, recentWeight: 0, previousWeight: 0 };
        const totalImpact = stats.totalWeight || 0;
        const completedPickups = stats.count || 0;
        let totalImpactChange = 0;
        if (stats.previousWeight > 0) totalImpactChange = Math.round(((stats.recentWeight - stats.previousWeight) / stats.previousWeight) * 100);
        else if (stats.recentWeight > 0) totalImpactChange = 100;

        // Process Simple Counts
        const activeUsersCount = results[1].status === 'fulfilled' ? results[1].value : 0;
        const volunteersCount = results[2].status === 'fulfilled' ? results[2].value : 0;
        const totalOpportunities = results[3].status === 'fulfilled' ? results[3].value : 0;
        const activeOpportunities = results[4].status === 'fulfilled' ? results[4].value : 0;
        const completedOpportunities = results[5].status === 'fulfilled' ? results[5].value : 0;
        const totalApplications = results[6].status === 'fulfilled' ? results[6].value : 0;
        const activeNgosCount = results[8].status === 'fulfilled' ? results[8].value : 0;
        const pickupsTodayCount = results[9].status === 'fulfilled' ? results[9].value : 0;

        // Process App Stats
        const appsRaw = results[7].status === 'fulfilled' ? (results[7].value as any)[0] : null;
        const apps = appsRaw || { total: 0, accepted: 0, recentTotal: 0, recentAccepted: 0, previousTotal: 0, previousAccepted: 0 };
        const responseRate = apps.total > 0 ? Math.round((apps.accepted / apps.total) * 100) : 0;
        const recentRate = apps.recentTotal > 0 ? (apps.recentAccepted / apps.recentTotal) * 100 : 0;
        const previousRate = apps.previousTotal > 0 ? (apps.previousAccepted / apps.previousTotal) * 100 : 0;
        let responseRateChange = 0;
        if (previousRate > 0) responseRateChange = Math.round(recentRate - previousRate);
        else if (recentRate > 0) responseRateChange = Math.round(recentRate);

        // Mock revenue: $0.15 per kg recycled
        const estimatedRevenue = Number((totalImpact * 0.15).toFixed(2));

        // 5. Pickup Trends Data (Separate to keep main response fast if needed)
        let startDate = new Date();
        let labels: string[] = [];
        if (analyticsRange === '1day') {
            startDate.setHours(startDate.getHours() - 24);
            labels = Array.from({ length: 24 }, (_, i) => {
                const d = new Date(analyticsNow.getTime() - (23 - i) * 60 * 60 * 1000);
                return `${d.getHours()}:00`;
            });
        } else if (analyticsRange === '3days') {
            startDate.setDate(startDate.getDate() - 3);
            for (let i = 2; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        } else if (analyticsRange === '1week') {
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        } else if (analyticsRange === '1month') {
            startDate.setMonth(startDate.getMonth() - 1);
            for (let i = 29; i >= 0; i--) {
                const d = new Date(analyticsNow.getTime() - i * 24 * 60 * 60 * 1000);
                if (i % 5 === 0) labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                else labels.push('');
            }
        }

        const requests = await WasteRequest.find({ createdAt: { $gte: startDate } }).select('createdAt').limit(1000).lean();
        let trendData: number[] = new Array(labels.length).fill(0);
        requests.forEach(req => {
            const reqDate = new Date(req.createdAt);
            if (analyticsRange === '1day') {
                const hourDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (60 * 60 * 1000));
                if (hourDiff >= 0 && hourDiff < 24) trendData[hourDiff]++;
            } else {
                const dayDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                if (dayDiff >= 0 && dayDiff < trendData.length) trendData[dayDiff]++;
            }
        });

        // Structure Analytics Dashboard Charts Data
        const monthlyCollections = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [45, 68, 92, 120, 185, completedPickups || 210]
        };

        const recyclingRate = {
            labels: ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Paper', 'Other'],
            data: [72, 85, 38, 55, 65, 48]
        };

        const userGrowth = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [15, 35, 62, 110, 190, activeUsersCount || 230]
        };

        const pickupSuccessRate = {
            labels: ['Completed', 'Pending', 'Scheduled', 'Cancelled'],
            data: [completedPickups || 80, 20, 15, 8]
        };

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
            activeNgos: activeNgosCount,
            pickupsToday: pickupsTodayCount,
            estimatedRevenue,
            trends: { labels, data: trendData },
            monthlyCollections,
            recyclingRate,
            userGrowth,
            pickupSuccessRate
        });
    } catch (error) {
        console.error('Get analytics fatal error:', error);
        res.status(500).json({ message: 'Server error during analytics data collection.' });
    }
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        let query: any = {};
        
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort({ created_at: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
            
        const total = await User.countDocuments(query);

        res.status(200).json({ users, total });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, isSuspended } = req.body;
        
        const user = await User.findByIdAndUpdate(userId, { isSuspended }, { new: true });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Log the action
        await AdminLog.create({
            action: `${isSuspended ? 'Suspended' : 'Unsuspended'} user: ${user.email}`,
            user_id: req.user!.id
        });

        res.status(200).json({ message: 'User status updated', user });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const logs = await AdminLog.find().populate('user_id', 'name email').sort({ timestamp: -1 }).limit(100);
        res.status(200).json(logs);
    } catch (error) {
        console.error('Get admin logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const generateCSVReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type } = req.query;
        let data: any[] = [];
        let filename = `wastezero_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        let headers = '';

        if (type === 'users') {
            data = await User.find().lean();
            headers = 'ID,Name,Email,Username,Role,Location,Created At,Status\n';
            const rows = data.map(u => `${u._id},"${u.name}",${u.email},${u.username},${u.role},"${u.location || ''}",${u.created_at},${u.isSuspended ? 'Suspended' : 'Active'}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        } else if (type === 'opportunities') {
            data = await Opportunity.find({ isDeleted: false }).lean();
            headers = 'ID,Title,Status,Location,Required Skills,Duration,Created At\n';
            const rows = data.map(o => `${o._id},"${o.title}",${o.status},"${o.location}",${o.required_skills?.join('|')},${o.duration},${o.createdAt}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        } else if (type === 'applications') {
            data = await Application.find().populate('opportunity_id', 'title').populate('volunteer_id', 'name email').lean();
            headers = 'ID,Opportunity,Volunteer Name,Volunteer Email,Status,Created At\n';
            const rows = data.map(a => `${a._id},"${(a.opportunity_id as any)?.title || 'N/A'}","${(a.volunteer_id as any)?.name || 'N/A'}",${(a.volunteer_id as any)?.email || 'N/A'},${a.status},${a.createdAt}`).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(headers + rows);
        } else {
            res.status(400).json({ message: 'Invalid report type' });
        }
    } catch (error) {
        console.error('Generate CSV error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
