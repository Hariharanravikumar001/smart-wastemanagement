import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Opportunity from '../models/Opportunity';
import Application from '../models/Application';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import AdminLog from '../models/AdminLog';
import { createNotification } from '../services/notificationService';

// @desc    Create new opportunity
// @route   POST /api/opportunities
// @access  Private (Admin)
export const createOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log(`[DEBUG] Incoming createOpportunity request from user ${req.user?.id}`);
        const { title, description, skills, duration, location, status, wasteType } = req.body;

        if (!title || !description || !duration || !location) {
            const missing = [];
            if (!title) missing.push('title');
            if (!description) missing.push('description');
            if (!duration) missing.push('duration');
            if (!location) missing.push('location');
            
            console.warn(`[DEBUG] Missing required fields: ${missing.join(', ')}`);
            res.status(400).json({ message: `Please provide all required fields: ${missing.join(', ')}` });
            return;
        }

        const newOpportunity = new Opportunity({
            title,
            description,
            skills: skills || [],
            duration,
            location,
            wasteType,
            status: status || 'open',
            ngo_id: req.user!.id
        });

        console.log(`[DEBUG] Attempting to save new opportunity to database...`);
        const savedOpportunity = await newOpportunity.save();

        // Notify matching volunteers in background
        console.log(`[DEBUG] Starting background notification process...`);
        (async () => {
          try {
            const matchingVolunteers = await User.find({ 
                role: 'volunteer', 
                location: { $regex: location, $options: 'i' } 
            }).select('_id').lean();


            const notificationPromises = matchingVolunteers.map(volunteer => 
                createNotification(
                    volunteer._id.toString(),
                    'New Opportunity Matching Your Profile',
                    `A new opportunity "${title}" is available in ${location}.`,
                    'info'
                )
            );

            Promise.allSettled(notificationPromises).then(results => {
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    console.error(`[DEBUG] Failed to send ${failures.length} out of ${matchingVolunteers.length} volunteer notifications.`);
                    failures.forEach(f => console.error('[DEBUG] Notification error details:', (f as PromiseRejectedResult).reason));
                } else {
                    // Success quietly
                }
            });
          } catch (notifError) {
            console.error('[DEBUG] Background notification error:', notifError);
          }
        })();

        res.status(201).json(savedOpportunity);
    } catch (error: any) {
        console.error('[DEBUG] Create opportunity error EXCEPTIONAL:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Edit opportunity
// @route   PUT /api/opportunities/:id
// @access  Private (Admin creator)
export const updateOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, skills, duration, location, status, wasteType } = req.body;

        // Opportunity attached by ownership middleware
        const opportunity = (req as any).opportunity;

        if (!title || !description || !duration || !location) {
            const missing = [];
            if (!title) missing.push('title');
            if (!description) missing.push('description');
            if (!duration) missing.push('duration');
            if (!location) missing.push('location');
            
            res.status(400).json({ message: `Please provide all required fields: ${missing.join(', ')}` });
            return;
        }

        opportunity.title = title;
        opportunity.description = description;
        opportunity.skills = skills || opportunity.skills;
        if (duration) opportunity.duration = duration;
        if (location) opportunity.location = location;
        if (status) opportunity.status = status;
        if (wasteType !== undefined) (opportunity as any).wasteType = wasteType;

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
        const id = req.params['id'];

        const deletedOpportunity = await Opportunity.findByIdAndUpdate(id, { isDeleted: true, status: 'closed' }, { new: true });

        if (!deletedOpportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        await Application.updateMany(
            { opportunity_id: id, status: 'pending' },
            { $set: { status: 'rejected' } }
        );

        // 📋 Log admin action
        await AdminLog.create({
            action: `Soft-deleted opportunity: "${deletedOpportunity.title}"`,
            user_id: req.user!.id
        });

        res.status(200).json({ message: 'Opportunity soft-deleted successfully', id });
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
        const { location, skill, page = 1, limit = 10, includeDeleted = 'false' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        let query: any = {};

        const role = req.user?.role?.toLowerCase() || 'guest';

        // Standard filter: Not deleted unless explicitly requested
        if (includeDeleted !== 'true') {
            query.isDeleted = false;
        }

        // Volunteers see only open
        if (role !== 'admin' && role !== 'ngo') {
            query.status = 'open';
        } else if (role === 'ngo') {
            // NGOs see their own
            query.ngo_id = new mongoose.Types.ObjectId(req.user?.id);
        }
        // Admins see all (no extra filter)


        if (location) {
            query.location = { $regex: location as string, $options: 'i' };
        }

        if (skill) {
            query.skills = { $in: [skill as string] };
        }

        const total = await Opportunity.countDocuments(query);
        
        // Use populate() instead of heavy aggregate() for better performance and reliability
        const oppsRaw = await Opportunity.find(query)
            .populate('ngo_id', 'name email')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

        // Get application counts separately to avoid heavy lookups in one query
        const opportunities = await Promise.all(oppsRaw.map(async (o: any) => {
            const applicantCount = await Application.countDocuments({ opportunity_id: o._id });
            
            // Map to the format the frontend expects
            return {
                ...o,
                id: o._id,
                organizationName: o.ngo_id?.name || 'Unknown NGO',
                applicantCount
            };
        }));

        res.status(200).json({
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            opportunities
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
        const opportunity = await Opportunity.findById(req.params['id']).populate('ngo_id', 'name email');

        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        if (opportunity.isDeleted && req.user?.role !== 'admin') {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        res.status(200).json(opportunity);
    } catch (error) {
        console.error('Get opportunity by id error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// @desc    Get matched opportunities for volunteer
// @route   GET /api/opportunities/matches
// @access  Private (Volunteer)
export const getMatchedOpportunities = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const { location, skills = [] } = user;
        
        // Find opportunities the user is already accepted for
        const acceptedApps = await Application.find({ volunteer_id: req.user!.id, status: 'accepted' }).select('opportunity_id').lean();
        const acceptedOppIds = acceptedApps.map(a => a.opportunity_id);

        let query: any = { 
            status: { $ne: 'closed' },
            isDeleted: false,
            $or: [
                { status: 'open' },
                { _id: { $in: acceptedOppIds } }
            ]
        };

        // Construct matching query
        let matchStage: any[] = [];
        
        if (location) {
            // Priority 1: Exact location match (case insensitive)
            // Priority 2: partial location match
            matchStage.push({
                $addFields: {
                    locationScore: {
                        $cond: [{ $regexMatch: { input: "$location", regex: location, options: "i" } }, 10, 0]
                    }
                }
            });
        }

        if (skills && skills.length > 0) {
            matchStage.push({
                $addFields: {
                    skillScore: {
                        $ifNull: [
                            {
                                $multiply: [
                                    { $size: { $setIntersection: [{ $ifNull: ["$skills", []] }, Array.isArray(skills) ? skills : []] } },
                                    5
                                ]
                            },
                            0
                        ]
                    }
                }
            });
        }

        // Fetch opportunities and calculate scores in application layer for better reliability
        const oppsRaw = await Opportunity.find(query)
            .populate('ngo_id', 'name email')
            .limit(50) // Fetch a reasonable amount for sorting
            .lean();

        const opportunities = oppsRaw.map((o: any) => {
            let score = 0;
            // Simple location score
            if (location && o.location?.toLowerCase().includes(location.toLowerCase())) score += 10;
            
            // Simple skill score
            if (skills && Array.isArray(o.skills)) {
                const userSkills = Array.isArray(skills) ? skills : [skills];
                const matchedCount = o.skills.filter((s: string) => userSkills.includes(s)).length;
                score += (matchedCount * 5);
            }

            return {
                ...o,
                id: o._id,
                totalScore: score,
                organizationName: o.ngo_id?.name || 'Unknown NGO'
            };
        })
        .sort((a: any, b: any) => b.totalScore - a.totalScore)
        .slice(0, 10);

        res.status(200).json(opportunities);

        res.status(200).json(opportunities);
    } catch (error: any) {
        console.error('Match opportunities error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Mark opportunity as completed
// @route   PATCH /api/opportunities/:id/complete
// @access  Private (Volunteer/Admin)
export const completeOpportunity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const oppId = req.params['id'];
        const opportunity = await Opportunity.findById(oppId);

        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }

        // Check if there is an accepted application for this user
        const application = await Application.findOne({
            opportunity_id: oppId,
            volunteer_id: req.user!.id,
            status: 'accepted'
        });

        if (!application && req.user!.role !== 'admin') {
            res.status(403).json({ message: 'Not authorized to complete this opportunity' });
            return;
        }

        opportunity.status = 'closed';
        await opportunity.save();

        // Notify NGO
        if (opportunity.ngo_id) {
            await createNotification(
                opportunity.ngo_id.toString(),
                'Project Completed',
                `Volunteer ${req.user!['name']} has marked the project "${opportunity.title}" as completed.`,
                'success'
            );
        }

        res.status(200).json({ message: 'Opportunity marked as completed', opportunity });
    } catch (error) {
        console.error('Complete opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
