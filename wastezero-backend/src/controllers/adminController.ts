import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';
import User from '../models/User';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { range = '1week' } = req.query;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        // 1. Total Impact & Completed Pickups
        const completedRequests = await WasteRequest.find({ status: 'Completed' });
        const totalImpact = completedRequests.reduce((sum, req) => sum + (req.weight || 0), 0);
        const completedPickups = completedRequests.length;

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

        // 2. User Stats
        const allUsers = await User.find();
        const activeUsersCount = allUsers.length;
        const volunteersCount = allUsers.filter(u => u.role === 'volunteer').length;

        // 3. Volunteer Response Rate (Accepted / Total Applications)
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

        // 4. Pickup Trends Data
        let startDate = new Date();
        let labels: string[] = [];
        let groupByFormat = '';
        
        if (range === '1day') {
            startDate.setHours(startDate.getHours() - 24);
            labels = Array.from({ length: 24 }, (_, i) => {
                const d = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
                return `${d.getHours()}:00`;
            });
        } else if (range === '3days') {
            startDate.setDate(startDate.getDate() - 3);
            for (let i = 2; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        } else if (range === '1week') {
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        } else if (range === '1month') {
            startDate.setMonth(startDate.getMonth() - 1);
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                if (i % 5 === 0) labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                else labels.push('');
            }
        }

        const requests = await WasteRequest.find({ createdAt: { $gte: startDate } });
        let trendData: number[] = new Array(labels.length).fill(0);

        requests.forEach(req => {
            const reqDate = new Date(req.createdAt);
            if (range === '1day') {
                const hourDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (60 * 60 * 1000));
                if (hourDiff >= 0 && hourDiff < 24) trendData[hourDiff]++;
            } else {
                const dayDiff = Math.floor((reqDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                if (dayDiff >= 0 && dayDiff < trendData.length) trendData[dayDiff]++;
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
            trends: {
                labels,
                data: trendData
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
