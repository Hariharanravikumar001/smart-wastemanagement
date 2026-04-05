import { Request, Response } from 'express';
import Application from '../models/Application';
import Opportunity from '../models/Opportunity';
import { AuthRequest } from '../middleware/authMiddleware';
import Notification from '../models/Notification';
import { createNotification } from '../services/notificationService';
import AdminLog from '../models/AdminLog';

// @desc    Apply for an opportunity
// @route   POST /api/applications
// @access  Private (Volunteer)
export const applyForOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { opportunity_id } = req.body;

        if (!opportunity_id) {
            res.status(400).json({ message: 'Opportunity ID is required' });
            return;
        }

        // Check if opportunity exists, is open, and not deleted
        const opportunity = await Opportunity.findById(opportunity_id);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        if (opportunity.isDeleted || opportunity.status !== 'open') {
            res.status(400).json({ message: 'Opportunity is closed or no longer available' });
            return;
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
            opportunity_id,
            volunteer_id: req.user!.id
        });

        if (existingApplication) {
            res.status(400).json({ message: 'You have already applied for this opportunity' });
            return;
        }

        const application = new Application({
            opportunity_id,
            volunteer_id: req.user!.id
        });

        const savedApplication = await application.save();
        res.status(201).json(savedApplication);
    } catch (error) {
        console.error('Application creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get applications for my opportunities
// @route   GET /api/applications/admin
// @access  Private (Admin)
export const getAdminApplications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let query = {};
        const role = req.user!.role?.toLowerCase();

        if (role === 'ngo') {
            const myOpportunities = await Opportunity.find({ ngo_id: req.user!.id }).select('_id').lean();
            const oppIds = myOpportunities.map(opp => opp._id);
            query = { opportunity_id: { $in: oppIds } };
        } 
        // Admin gets all (empty query)

        const applications = await Application.find(query)
            .populate('volunteer_id', 'name email username location')
            .populate('opportunity_id', 'title description location duration')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.status(200).json(applications);
    } catch (error) {
        console.error('Get admin applications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get my applications
// @route   GET /api/applications/volunteer
// @access  Private (Volunteer)
export const getVolunteerApplications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const applications = await Application.find({ volunteer_id: req.user!.id })
            .populate('opportunity_id', 'title description location duration status ngo_id')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.status(200).json(applications);
    } catch (error) {
        console.error('Get volunteer applications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update application status (Accept/Reject)
// @route   PUT /api/applications/:id/status
// @access  Private (Admin)
export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const appId = req.params['id'];

        console.log('Update Status Request:', { appId, status, userId: req.user?.id, role: req.user?.role });

        if (!['accepted', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const application = await Application.findById(appId)
            .populate('opportunity_id');

        if (!application) {
            console.log('Application not found:', appId);
            res.status(404).json({ message: 'Application not found' });
            return;
        }

        // Verify ownership indirectly or directly
        const opp: any = application.opportunity_id;
        
        if (!opp) {
            console.log('Opportunity not found for application:', appId);
            if (req.user!.role?.toLowerCase() !== 'admin') {
                res.status(404).json({ message: 'Associated opportunity not found. Only admins can modify this.' });
                return;
            }
        } else {
            const oppNgoId = opp.ngo_id.toString();
            if (oppNgoId !== req.user!.id && req.user!.role?.toLowerCase() !== 'admin') {
                const msg = `Not authorized to update this application.`;
                res.status(403).json({ message: msg });
                return;
            }
        }

        application.status = status;
        const updatedApplication = await application.save();

        // 📋 Log admin action
        await AdminLog.create({
          action: `${status === 'accepted' ? 'Accepted' : 'Rejected'} application for opportunity: "${opp?.title || appId}" — volunteer: ${application.volunteer_id}`,
          user_id: req.user!.id
        });

        if (status === 'accepted' && opp) {
            opp.status = 'in-progress';
            await opp.save();

            // Real-time Notification
            await createNotification(
                application.volunteer_id.toString(),
                'Application Accepted',
                `Congratulations! Your application for "${opp.title}" has been accepted.`,
                'success'
            );
        } else if (status === 'rejected' && opp) {
            // Real-time Notification
            await createNotification(
                application.volunteer_id.toString(),
                'Application Update',
                `Your application for "${opp.title}" was not accepted at this time.`,
                'info'
            );
        }

        res.status(200).json(updatedApplication);
    } catch (error: any) {
        console.error('Update application status error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
