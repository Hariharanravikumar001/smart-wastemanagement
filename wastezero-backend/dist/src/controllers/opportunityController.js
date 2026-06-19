"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOpportunity = exports.getMatchedOpportunities = exports.getOpportunityById = exports.getOpportunities = exports.deleteOpportunity = exports.updateOpportunity = exports.createOpportunity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Opportunity_1 = __importDefault(require("../models/Opportunity"));
const Application_1 = __importDefault(require("../models/Application"));
const User_1 = __importDefault(require("../models/User"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const notificationService_1 = require("../services/notificationService");
const Message_1 = __importDefault(require("../models/Message"));
// @desc    Create new opportunity
// @route   POST /api/opportunities
// @access  Private (Admin)
const createOpportunity = async (req, res) => {
    try {
        // Log received request context
        console.debug(`[ADMIN] Incoming createOpportunity request from user ${req.user?.id}`);
        const { title, description, skills, duration, location, status, wasteType, startDate, startTime, scheduleType, scheduleDays, scheduleTime } = req.body;
        if (!title || !description || !duration || !location) {
            const missing = [];
            if (!title)
                missing.push('title');
            if (!description)
                missing.push('description');
            if (!duration)
                missing.push('duration');
            if (!location)
                missing.push('location');
            // Validation failure - no warning needed in standard prod logs unless critical
            // console.warn(`[DEBUG] Missing required fields: ${missing.join(', ')}`);
            res.status(400).json({ message: `Please provide all required fields: ${missing.join(', ')}` });
            return;
        }
        const newOpportunity = new Opportunity_1.default({
            title,
            description,
            skills: skills || [],
            duration,
            location,
            wasteType,
            status: status || 'open',
            ngo_id: req.user.id,
            startDate,
            startTime,
            scheduleType,
            scheduleDays,
            scheduleTime
        });
        // Persistence step
        const savedOpportunity = await newOpportunity.save();
        // Notify matching volunteers in background
        // Notification trigger
        (async () => {
            try {
                const matchingVolunteers = await User_1.default.find({
                    role: 'volunteer',
                    location: { $regex: location, $options: 'i' }
                }).select('_id').lean();
                const notificationPromises = matchingVolunteers.map(volunteer => (0, notificationService_1.createNotification)(volunteer._id.toString(), 'New Opportunity Matching Your Profile', `A new opportunity "${title}" is available in ${location}.`, 'info'));
                Promise.allSettled(notificationPromises).then(results => {
                    const failures = results.filter(r => r.status === 'rejected');
                    if (failures.length > 0) {
                        console.error(`[DEBUG] Failed to send ${failures.length} out of ${matchingVolunteers.length} volunteer notifications.`);
                        failures.forEach(f => console.error('[DEBUG] Notification error details:', f.reason));
                    }
                    else {
                        // Success quietly
                    }
                });
            }
            catch (notifError) {
                console.error('[DEBUG] Background notification error:', notifError);
            }
        })();
        res.status(201).json(savedOpportunity);
    }
    catch (error) {
        console.error('[DEBUG] Create opportunity error EXCEPTIONAL:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
exports.createOpportunity = createOpportunity;
// @desc    Edit opportunity
// @route   PUT /api/opportunities/:id
// @access  Private (Admin creator)
const updateOpportunity = async (req, res) => {
    try {
        const { title, description, skills, duration, location, status, wasteType, startDate, startTime, scheduleType, scheduleDays, scheduleTime } = req.body;
        // Opportunity attached by ownership middleware
        const opportunity = req.opportunity;
        if (!title || !description || !duration || !location) {
            const missing = [];
            if (!title)
                missing.push('title');
            if (!description)
                missing.push('description');
            if (!duration)
                missing.push('duration');
            if (!location)
                missing.push('location');
            res.status(400).json({ message: `Please provide all required fields: ${missing.join(', ')}` });
            return;
        }
        opportunity.title = title;
        opportunity.description = description;
        opportunity.skills = skills || opportunity.skills;
        if (duration)
            opportunity.duration = duration;
        if (location)
            opportunity.location = location;
        if (status)
            opportunity.status = status;
        if (wasteType !== undefined)
            opportunity.wasteType = wasteType;
        // Update scheduling
        opportunity.startDate = startDate;
        opportunity.startTime = startTime;
        opportunity.scheduleType = scheduleType;
        opportunity.scheduleDays = scheduleDays || [];
        opportunity.scheduleTime = scheduleTime;
        const updatedOpportunity = await opportunity.save();
        res.status(200).json(updatedOpportunity);
    }
    catch (error) {
        console.error('Update opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOpportunity = updateOpportunity;
// @desc    Permanent delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private (Admin or NGO creator)
const deleteOpportunity = async (req, res) => {
    try {
        // Opportunity ID from request params
        const id = req.params['id'];
        const deletedOpportunity = await Opportunity_1.default.findByIdAndUpdate(id, { isDeleted: true, status: 'closed' }, { new: true });
        if (!deletedOpportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }
        await Application_1.default.updateMany({ opportunity_id: id, status: 'pending' }, { $set: { status: 'rejected' } });
        // 📋 Log admin action
        await AdminLog_1.default.create({
            action: `Soft-deleted opportunity: "${deletedOpportunity.title}"`,
            user_id: req.user.id
        });
        res.status(200).json({ message: 'Opportunity soft-deleted successfully', id });
    }
    catch (error) {
        console.error('Delete opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteOpportunity = deleteOpportunity;
// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Private (All authenticated)
const getOpportunities = async (req, res) => {
    try {
        const { location, skill, page = 1, limit = 10, includeDeleted = 'false' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        let query = {};
        const role = req.user?.role?.toLowerCase() || 'guest';
        // Standard filter: Not deleted unless explicitly requested
        if (includeDeleted !== 'true') {
            query.isDeleted = false;
        }
        // Volunteers see only open
        if (role !== 'admin' && role !== 'ngo') {
            query.status = 'open';
        }
        else if (role === 'ngo') {
            // NGOs see their own
            query.ngo_id = new mongoose_1.default.Types.ObjectId(req.user?.id);
        }
        // Admins see all (no extra filter)
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        if (skill) {
            query.skills = { $in: [skill] };
        }
        const total = await Opportunity_1.default.countDocuments(query);
        // Use populate() instead of heavy aggregate() for better performance and reliability
        const oppsRaw = await Opportunity_1.default.find(query)
            .populate('ngo_id', 'name email')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        // Get application counts separately to avoid heavy lookups in one query
        const opportunities = await Promise.all(oppsRaw.map(async (o) => {
            const applicantCount = await Application_1.default.countDocuments({ opportunity_id: o._id });
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
    }
    catch (error) {
        console.error('Get opportunities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOpportunities = getOpportunities;
// @desc    Get single opportunity
// @route   GET /api/opportunities/:id
// @access  Private
const getOpportunityById = async (req, res) => {
    try {
        const opportunity = await Opportunity_1.default.findById(req.params['id']).populate('ngo_id', 'name email');
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }
        if (opportunity.isDeleted && req.user?.role !== 'admin') {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }
        res.status(200).json(opportunity);
    }
    catch (error) {
        console.error('Get opportunity by id error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOpportunityById = getOpportunityById;
// @desc    Get matched opportunities for volunteer
// @route   GET /api/opportunities/matches
// @access  Private (Volunteer)
const getMatchedOpportunities = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const { location, skills = [] } = user;
        // Find opportunities the user is already accepted for
        const acceptedApps = await Application_1.default.find({ volunteer_id: req.user.id, status: 'accepted' }).select('opportunity_id').lean();
        const acceptedOppIds = acceptedApps.map(a => a.opportunity_id);
        let query = {
            status: { $ne: 'closed' },
            isDeleted: false,
            $or: [
                { status: 'open' },
                { _id: { $in: acceptedOppIds } }
            ]
        };
        // Construct matching query
        let matchStage = [];
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
        const oppsRaw = await Opportunity_1.default.find(query)
            .populate('ngo_id', 'name email')
            .limit(50) // Fetch a reasonable amount for sorting
            .lean();
        const opportunities = oppsRaw.map((o) => {
            let score = 0;
            // Simple location score
            if (location && o.location?.toLowerCase().includes(location.toLowerCase()))
                score += 10;
            // Simple skill score
            if (skills && Array.isArray(o.skills)) {
                const userSkills = Array.isArray(skills) ? skills : [skills];
                const matchedCount = o.skills.filter((s) => userSkills.includes(s)).length;
                score += (matchedCount * 5);
            }
            return {
                ...o,
                id: o._id,
                totalScore: score,
                organizationName: o.ngo_id?.name || 'Unknown NGO'
            };
        })
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10);
        res.status(200).json(opportunities);
    }
    catch (error) {
        console.error('Match opportunities error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
exports.getMatchedOpportunities = getMatchedOpportunities;
// @desc    Mark opportunity as completed
// @route   PATCH /api/opportunities/:id/complete
// @access  Private (Volunteer/Admin)
const completeOpportunity = async (req, res) => {
    try {
        const oppId = req.params['id'];
        const opportunity = await Opportunity_1.default.findById(oppId);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found' });
            return;
        }
        // Check if there is an accepted application for this user
        const application = await Application_1.default.findOne({
            opportunity_id: oppId,
            volunteer_id: req.user.id,
            status: 'accepted'
        });
        if (!application && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Not authorized to complete this opportunity' });
            return;
        }
        opportunity.status = 'closed';
        await opportunity.save();
        // Auto soft-delete messages between volunteer(s) and NGO/Admin for this opportunity
        if (opportunity.ngo_id) {
            const ngoId = new mongoose_1.default.Types.ObjectId(opportunity.ngo_id.toString());
            // Find all accepted applications for this opportunity to identify volunteers
            const acceptedApps = await Application_1.default.find({
                opportunity_id: oppId,
                status: 'accepted'
            });
            if (acceptedApps.length > 0) {
                try {
                    const { emitToUser } = await Promise.resolve().then(() => __importStar(require('../services/socketService')));
                    const deletePromises = acceptedApps.map(async (app) => {
                        if (app.volunteer_id) {
                            const volunteerId = new mongoose_1.default.Types.ObjectId(app.volunteer_id.toString());
                            // Soft delete all messages between the volunteer and the NGO/Admin for this opportunity
                            await Message_1.default.updateMany({
                                opportunity_id: new mongoose_1.default.Types.ObjectId(oppId),
                                $or: [
                                    { sender_id: volunteerId, receiver_id: ngoId },
                                    { sender_id: ngoId, receiver_id: volunteerId }
                                ]
                            }, {
                                $addToSet: { deletedFor: { $each: [volunteerId, ngoId] } }
                            });
                            console.log(`[SOFT DELETE] Messages soft deleted for opportunity ${oppId} between volunteer ${volunteerId} and NGO ${ngoId}`);
                            // Emit conversation_cleared socket event to both parties
                            emitToUser(volunteerId.toString(), 'conversation_cleared', { partnerId: ngoId.toString(), opportunityId: oppId });
                            emitToUser(ngoId.toString(), 'conversation_cleared', { partnerId: volunteerId.toString(), opportunityId: oppId });
                        }
                    });
                    await Promise.all(deletePromises);
                }
                catch (e) {
                    console.error('Failed to auto soft-delete opportunity messages:', e);
                }
            }
        }
        // Notify NGO
        if (opportunity.ngo_id) {
            const volunteer = await User_1.default.findById(req.user.id);
            const volunteerName = volunteer ? volunteer.name : 'A volunteer';
            await (0, notificationService_1.createNotification)(opportunity.ngo_id.toString(), 'Project Completed', `Volunteer ${volunteerName} has marked the project "${opportunity.title}" as completed.`, 'success');
        }
        res.status(200).json({ message: 'Opportunity marked as completed', opportunity });
    }
    catch (error) {
        console.error('Complete opportunity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.completeOpportunity = completeOpportunity;
