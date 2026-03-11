import { Request, Response } from 'express';
import Opportunity from '../models/Opportunity';
import Application from '../models/Application';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Create new opportunity
// @route   POST /api/opportunities
// @access  Private (Admin)
export const createOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, skills, duration, location, status } = req.body;

        if (!title || !description || !duration || !location) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }

        const newOpportunity = new Opportunity({
            title,
            description,
            skills: skills || [],
            duration,
            location,
            status: status || 'open',
            ngo_id: req.user.id
        });

        const savedOpportunity = await newOpportunity.save();
        res.status(201).json(savedOpportunity);
    } catch (error) {
        console.error('Create opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Edit opportunity
// @route   PUT /api/opportunities/:id
// @access  Private (Admin creator)
export const updateOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, skills, duration, location, status } = req.body;

        // Opportunity attached by ownership middleware
        const opportunity = (req as any).opportunity;

        if (!title || !description || !duration || !location) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }

        opportunity.title = title;
        opportunity.description = description;
        opportunity.skills = skills || opportunity.skills;
        opportunity.duration = duration;
        opportunity.location = location;
        if (status) opportunity.status = status;

        const updatedOpportunity = await opportunity.save();
        res.status(200).json(updatedOpportunity);
    } catch (error) {
        console.error('Update opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Permanent delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private (Admin or NGO creator)
export const deleteOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Opportunity ID from request params
        const id = req.params.id;

        // Clean up associated applications
        await Application.deleteMany({ opportunity_id: id });

        const deletedOpportunity = await Opportunity.findByIdAndDelete(id);

        if (!deletedOpportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        res.status(200).json({ message: 'Opportunity permanently deleted' });
    } catch (error) {
        console.error('Delete opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Private (All authenticated)
export const getOpportunities = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { location, skill, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        let query: any = {};

        const role = req.user.role?.toLowerCase();

        // Volunteer sees only open and not deleted
        if (role !== 'admin' && role !== 'ngo') {
            query.status = 'open';
            query.isDeleted = false;
        } else if (role === 'ngo') {
            // NGOs see their own
            query.ngo_id = req.user.id;
        }
        // Admins see ALL opportunities for global oversight


        if (location) {
            query.location = { $regex: location as string, $options: 'i' };
        }

        if (skill) {
            query.skills = { $in: [skill as string] };
        }

        const total = await Opportunity.countDocuments(query);
        const opportunities = await Opportunity.find(query)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .sort({ createdAt: -1 })
            .populate({
                path: 'applications',
                populate: { path: 'volunteer_id', select: 'name' }
            })
            .populate('ngo_id', 'name email');

        // Transform to include applicant data and remove raw virtuals if not admin (for privacy/cleanliness)
        const transformedOpportunities = opportunities.map(opp => {
            const oppObj = opp.toObject();
            const apps = (oppObj as any).applications || [];
            
            return {
                ...oppObj,
                applicantCount: apps.length,
                applicantNames: apps.map((a: any) => a.volunteer_id?.name || 'Unknown Volunteer'),
                applications: undefined // Remove raw applications data
            };
        });

        res.status(200).json({
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            opportunities: transformedOpportunities
        });

    } catch (error) {
        console.error('Get opportunities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single opportunity
// @route   GET /api/opportunities/:id
// @access  Private
export const getOpportunityById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const opportunity = await Opportunity.findById(req.params.id).populate('ngo_id', 'name email');

        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        if (opportunity.isDeleted && req.user.role !== 'admin') {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        res.status(200).json(opportunity);
    } catch (error) {
        console.error('Get opportunity by id error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
