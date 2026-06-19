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
exports.rescheduleRequest = exports.verifyQrCode = exports.updateRequestStatus = exports.getAvailableRequests = exports.getRequestsByVolunteer = exports.getRequestsByCitizen = exports.getAllRequests = exports.createRequest = void 0;
const WasteRequest_1 = __importDefault(require("../models/WasteRequest"));
const mongoose_1 = __importDefault(require("mongoose"));
const Message_1 = __importDefault(require("../models/Message"));
const createRequest = async (req, res) => {
    try {
        const { description, location, wasteCategory, citizenId, citizenName } = req.body;
        // Ensure required fields are present to avoid validation 500 errors
        const requestData = {
            ...req.body,
            description: description || 'No description provided',
            citizenName: citizenName || 'Anonymous Citizen',
            citizenId: citizenId || req.user?.id || 'unknown'
        };
        const newRequest = new WasteRequest_1.default(requestData);
        const savedRequest = await newRequest.save();
        res.status(201).json(savedRequest);
    }
    catch (err) {
        console.error('Error creating waste request:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};
exports.createRequest = createRequest;
const getAllRequests = async (req, res) => {
    try {
        const requests = await WasteRequest_1.default.find().sort({ createdAt: -1 }).limit(200);
        res.json(requests);
    }
    catch (err) {
        console.error('Error fetching all requests:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getAllRequests = getAllRequests;
const getRequestsByCitizen = async (req, res) => {
    try {
        const { citizenId } = req.params;
        const requests = await WasteRequest_1.default.find({ citizenId }).sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (err) {
        console.error('Error fetching citizen requests:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getRequestsByCitizen = getRequestsByCitizen;
const getRequestsByVolunteer = async (req, res) => {
    try {
        const { volunteerId } = req.params;
        const requests = await WasteRequest_1.default.find({ volunteerId }).sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (err) {
        console.error('Error fetching volunteer requests:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getRequestsByVolunteer = getRequestsByVolunteer;
const getAvailableRequests = async (req, res) => {
    try {
        let query = { status: 'Pending' };
        // If the user is a volunteer, filter by their location (intelligent matching)
        if (req.user && req.user['role']?.toLowerCase() === 'volunteer' && req.user['location']) {
            // Use regex for partial matching (e.g., "New York" matches "New York, NY")
            query.location = { $regex: req.user['location'], $options: 'i' };
        }
        const requests = await WasteRequest_1.default.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(requests);
    }
    catch (err) {
        console.error('Error fetching available requests:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getAvailableRequests = getAvailableRequests;
const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const existingRequest = await WasteRequest_1.default.findById(id);
        if (!existingRequest) {
            res.status(404).json({ message: 'Waste request not found' });
            return;
        }
        const wasAlreadyCompleted = existingRequest.status === 'Completed';
        const isNowCompleted = updateData.status === 'Completed';
        // SMS / Email updates on transition
        if (updateData.status && updateData.status !== existingRequest.status && existingRequest.citizenId) {
            Promise.resolve().then(() => __importStar(require('../models/User'))).then(({ default: User }) => {
                User.findById(existingRequest.citizenId).then(user => {
                    if (user && user.email) {
                        Promise.resolve().then(() => __importStar(require('../utils/emailService'))).then(({ sendEmail }) => {
                            const transitionSubject = `WasteZero Pickup Update - Status: ${updateData.status}`;
                            const transitionHtml = `<h3>Your pickup status has been updated to: <b>${updateData.status}</b></h3><p>Description: ${existingRequest.description}</p>`;
                            sendEmail(user.email, transitionSubject, `Your pickup status is now: ${updateData.status}`, transitionHtml)
                                .then(() => console.log(`[EMAIL UPDATE] Status transition notification sent to ${user.email}`))
                                .catch(e => console.error('Failed to send status update email:', e));
                        });
                    }
                });
            });
        }
        Object.assign(existingRequest, updateData);
        const updatedRequest = await existingRequest.save();
        // Auto soft-delete messages between volunteer and citizen on completion
        if (!wasAlreadyCompleted && isNowCompleted && existingRequest.citizenId && existingRequest.volunteerId) {
            const volId = new mongoose_1.default.Types.ObjectId(existingRequest.volunteerId);
            const citId = new mongoose_1.default.Types.ObjectId(existingRequest.citizenId);
            Message_1.default.updateMany({
                $or: [
                    { sender_id: volId, receiver_id: citId },
                    { sender_id: citId, receiver_id: volId }
                ]
            }, {
                $addToSet: { deletedFor: { $each: [volId, citId] } }
            }).then(() => {
                console.log(`[SOFT DELETE] Messages soft deleted between volunteer ${volId} and citizen ${citId}`);
                Promise.resolve().then(() => __importStar(require('../services/socketService'))).then(({ emitToUser }) => {
                    emitToUser(volId.toString(), 'conversation_cleared', { partnerId: citId.toString() });
                    emitToUser(citId.toString(), 'conversation_cleared', { partnerId: volId.toString() });
                }).catch(e => console.error('Failed to import socketService:', e));
            }).catch(e => console.error('Failed to soft delete pickup messages:', e));
        }
        // Gamified Rewards System: Issue points when completed
        if (!wasAlreadyCompleted && isNowCompleted && existingRequest.citizenId) {
            Promise.resolve().then(() => __importStar(require('../models/User'))).then(({ default: User }) => {
                User.findById(existingRequest.citizenId).then(user => {
                    if (user) {
                        user.rewardPoints = (user.rewardPoints || 0) + 50;
                        if (user.rewardPoints >= 100 && !user.badges?.includes('Eco Starter')) {
                            user.badges?.push('Eco Starter');
                        }
                        if (user.rewardPoints >= 500 && !user.badges?.includes('Recycling Champion')) {
                            user.badges?.push('Recycling Champion');
                        }
                        user.save().catch(e => console.error('Failed to reward user:', e));
                    }
                }).catch(e => console.error('Error finding user for rewards:', e));
            });
        }
        // Assign QR Code when accepted by Volunteer
        if (updateData.status === 'Scheduled' || (updateData.volunteerId && !existingRequest.volunteerId)) {
            Promise.resolve().then(() => __importStar(require('crypto'))).then(crypto => {
                if (!existingRequest.qrCodeToken) {
                    existingRequest.qrCodeToken = crypto.randomBytes(16).toString('hex');
                    existingRequest.save().catch(e => console.error('Failed to save QR token:', e));
                }
            });
            // Notify citizen that pickup is scheduled
            if (existingRequest.citizenId) {
                Promise.resolve().then(() => __importStar(require('../services/socketService'))).then(({ emitToUser }) => {
                    emitToUser(existingRequest.citizenId.toString(), 'notification', {
                        id: new Date().getTime().toString(),
                        title: 'Pickup Scheduled',
                        message: `A volunteer has accepted your pickup request for ${existingRequest.description}.`,
                        type: 'info',
                        timestamp: new Date(),
                        read: false
                    });
                });
            }
        }
        if (updateData.status === 'In Progress' && existingRequest.citizenId) {
            // Notify citizen that pickup is in progress
            Promise.resolve().then(() => __importStar(require('../services/socketService'))).then(({ emitToUser }) => {
                emitToUser(existingRequest.citizenId.toString(), 'notification', {
                    id: new Date().getTime().toString(),
                    title: 'Volunteer on the way!',
                    message: `The volunteer has started the pickup and is on their way.`,
                    type: 'warning',
                    timestamp: new Date(),
                    read: false
                });
            });
        }
        res.json(updatedRequest);
    }
    catch (err) {
        console.error('Error updating request status:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.updateRequestStatus = updateRequestStatus;
const verifyQrCode = async (req, res) => {
    try {
        const { id } = req.params;
        const { qrCodeToken } = req.body;
        if (req.user?.role?.toLowerCase() !== 'volunteer') {
            res.status(403).json({ message: 'Only volunteers can verify QR codes' });
            return;
        }
        const request = await WasteRequest_1.default.findById(id);
        if (!request) {
            res.status(404).json({ message: 'Waste request not found' });
            return;
        }
        if (request.status === 'Completed') {
            res.status(400).json({ message: 'This request is already completed' });
            return;
        }
        if (!request.qrCodeToken || request.qrCodeToken !== qrCodeToken) {
            res.status(400).json({ message: 'Invalid QR code' });
            return;
        }
        // Mark as completed
        request.status = 'Completed';
        const updatedRequest = await request.save();
        // Auto soft-delete messages between volunteer and citizen on completion
        if (request.citizenId && request.volunteerId) {
            const volId = new mongoose_1.default.Types.ObjectId(request.volunteerId);
            const citId = new mongoose_1.default.Types.ObjectId(request.citizenId);
            Message_1.default.updateMany({
                $or: [
                    { sender_id: volId, receiver_id: citId },
                    { sender_id: citId, receiver_id: volId }
                ]
            }, {
                $addToSet: { deletedFor: { $each: [volId, citId] } }
            }).then(() => {
                console.log(`[SOFT DELETE] Messages soft deleted (QR verified) between volunteer ${volId} and citizen ${citId}`);
                Promise.resolve().then(() => __importStar(require('../services/socketService'))).then(({ emitToUser }) => {
                    emitToUser(volId.toString(), 'conversation_cleared', { partnerId: citId.toString() });
                    emitToUser(citId.toString(), 'conversation_cleared', { partnerId: volId.toString() });
                }).catch(e => console.error('Failed to import socketService:', e));
            }).catch(e => console.error('Failed to soft delete pickup messages:', e));
        }
        // Reward the citizen
        if (request.citizenId) {
            Promise.resolve().then(() => __importStar(require('../models/User'))).then(({ default: User }) => {
                User.findById(request.citizenId).then(user => {
                    if (user) {
                        user.rewardPoints = (user.rewardPoints || 0) + 50;
                        if (user.rewardPoints >= 100 && !user.badges?.includes('Eco Starter')) {
                            user.badges?.push('Eco Starter');
                        }
                        if (user.rewardPoints >= 500 && !user.badges?.includes('Recycling Champion')) {
                            user.badges?.push('Recycling Champion');
                        }
                        user.save().catch(e => console.error('Failed to reward user:', e));
                    }
                }).catch(e => console.error('Error finding user for rewards:', e));
            });
            // Notify citizen that pickup is complete
            Promise.resolve().then(() => __importStar(require('../services/socketService'))).then(({ emitToUser }) => {
                emitToUser(request.citizenId.toString(), 'notification', {
                    id: new Date().getTime().toString(),
                    title: 'Pickup Completed & Rewarded!',
                    message: `Your pickup was verified successfully. You earned 50 reward points!`,
                    type: 'success',
                    timestamp: new Date(),
                    read: false
                });
            });
        }
        res.json({ message: 'QR Code verified successfully. Pickup complete.', request: updatedRequest });
    }
    catch (err) {
        console.error('Error verifying QR code:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.verifyQrCode = verifyQrCode;
// @desc    Reschedule a pending pickup request (citizen only)
// @route   PATCH /api/waste-requests/:id/reschedule
// @access  Private (Citizen)
const rescheduleRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledDate, scheduledTime } = req.body;
        if (!scheduledDate && !scheduledTime) {
            res.status(400).json({ message: 'Please provide a new scheduledDate or scheduledTime.' });
            return;
        }
        const request = await WasteRequest_1.default.findById(id);
        if (!request) {
            res.status(404).json({ message: 'Waste request not found' });
            return;
        }
        // Only the citizen who owns this request can reschedule
        if (String(request.citizenId) !== String(req.user?.id)) {
            res.status(403).json({ message: 'Not authorized to reschedule this request.' });
            return;
        }
        // Can only reschedule if still Pending
        if (request.status !== 'Pending') {
            res.status(400).json({ message: 'Only pending pickups can be rescheduled.' });
            return;
        }
        if (scheduledDate)
            request.scheduledDate = new Date(scheduledDate);
        if (scheduledTime)
            request.scheduledTime = scheduledTime;
        const updated = await request.save();
        res.json(updated);
    }
    catch (err) {
        console.error('Error rescheduling request:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.rescheduleRequest = rescheduleRequest;
