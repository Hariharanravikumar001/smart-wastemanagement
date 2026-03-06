import { Request, Response } from 'express';
import Application from '../models/Application';
import Opportunity from '../models/Opportunity';
import { AuthRequest } from '../middleware/authMiddleware';

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
            volunteer_id: req.user.id
        });

        if (existingApplication) {
            res.status(400).json({ message: 'You have already applied for this opportunity' });
            return;
        }

        const application = new Application({
            opportunity_id,
            volunteer_id: req.user.id
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
        // Find all opportunities owned by this admin
        const myOpportunities = await Opportunity.find({ ngo_id: req.user.id }).select('_id');
        const oppIds = myOpportunities.map(opp => opp._id);

        // Find applications for these opportunities
        const applications = await Application.find({ opportunity_id: { $in: oppIds } })
            .populate('volunteer_id', 'name email username location')
            .populate('opportunity_id', 'title description location duration')
            .sort({ createdAt: -1 });

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
        const applications = await Application.find({ volunteer_id: req.user.id })
            .populate('opportunity_id', 'title description location duration status')
            .sort({ createdAt: -1 });

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

        if (!['accepted', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const application = await Application.findById(req.params.id)
            .populate('opportunity_id');

        if (!application) {
            res.status(404).json({ message: 'Application not found' });
            return;
        }

        // Verify ownership indirectly or directly
        const opp: any = application.opportunity_id;
        if (opp.ngo_id.toString() !== req.user.id) {
            res.status(403).json({ message: 'Not authorized to update this application' });
            return;
        }

        application.status = status;
        const updatedApplication = await application.save();

        // Optionally update the opportunity to 'in-progress' if accepted
        // if (status === 'accepted') {
        //  await Opportunity.findByIdAndUpdate(opp._id, { status: 'in-progress' });
        // }

        res.status(200).json(updatedApplication);
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
