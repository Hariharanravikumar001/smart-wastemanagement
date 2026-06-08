import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import WasteRequest from '../models/WasteRequest';
import mongoose from 'mongoose';
import Message from '../models/Message';

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, location, wasteCategory, citizenId, citizenName } = req.body;
    
    // Ensure required fields are present to avoid validation 500 errors
    const requestData = {
      ...req.body,
      description: description || 'No description provided',
      citizenName: citizenName || 'Anonymous Citizen',
      citizenId: citizenId || req.user?.id || 'unknown'
    };

    const newRequest = new WasteRequest(requestData);
    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err: any) {
    console.error('Error creating waste request:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
};

export const getAllRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await WasteRequest.find().sort({ createdAt: -1 }).limit(200);
    res.json(requests);
  } catch (err: any) {
    console.error('Error fetching all requests:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getRequestsByCitizen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { citizenId } = req.params;
    const requests = await WasteRequest.find({ citizenId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err: any) {
    console.error('Error fetching citizen requests:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getRequestsByVolunteer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { volunteerId } = req.params;
    const requests = await WasteRequest.find({ volunteerId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err: any) {
    console.error('Error fetching volunteer requests:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAvailableRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let query: any = { status: 'Pending' };
    
    // If the user is a volunteer, filter by their location (intelligent matching)
    if (req.user && req.user['role']?.toLowerCase() === 'volunteer' && req.user['location']) {
        // Use regex for partial matching (e.g., "New York" matches "New York, NY")
        query.location = { $regex: req.user['location'], $options: 'i' };
    }

    const requests = await WasteRequest.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(requests);
  } catch (err: any) {
    console.error('Error fetching available requests:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const existingRequest = await WasteRequest.findById(id);
    if (!existingRequest) {
      res.status(404).json({ message: 'Waste request not found' });
      return;
    }

    const wasAlreadyCompleted = existingRequest.status === 'Completed';
    const isNowCompleted = updateData.status === 'Completed';

    Object.assign(existingRequest, updateData);
    const updatedRequest = await existingRequest.save();
    
    // Auto soft-delete messages between volunteer and citizen on completion
    if (!wasAlreadyCompleted && isNowCompleted && existingRequest.citizenId && existingRequest.volunteerId) {
      const volId = new mongoose.Types.ObjectId(existingRequest.volunteerId);
      const citId = new mongoose.Types.ObjectId(existingRequest.citizenId);
      Message.updateMany(
        {
          $or: [
            { sender_id: volId, receiver_id: citId },
            { sender_id: citId, receiver_id: volId }
          ]
        },
        {
          $addToSet: { deletedFor: { $each: [volId, citId] } }
        }
      ).then(() => {
        console.log(`[SOFT DELETE] Messages soft deleted between volunteer ${volId} and citizen ${citId}`);
        import('../services/socketService').then(({ emitToUser }) => {
          emitToUser(volId.toString(), 'conversation_cleared', { partnerId: citId.toString() });
          emitToUser(citId.toString(), 'conversation_cleared', { partnerId: volId.toString() });
        }).catch(e => console.error('Failed to import socketService:', e));
      }).catch(e => console.error('Failed to soft delete pickup messages:', e));
    }

    // Gamified Rewards System: Issue points when completed
    if (!wasAlreadyCompleted && isNowCompleted && existingRequest.citizenId) {
      import('../models/User').then(({ default: User }) => {
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
      import('crypto').then(crypto => {
        if (!existingRequest.qrCodeToken) {
          existingRequest.qrCodeToken = crypto.randomBytes(16).toString('hex');
          existingRequest.save().catch(e => console.error('Failed to save QR token:', e));
        }
      });
      
      // Notify citizen that pickup is scheduled
      if (existingRequest.citizenId) {
        import('../services/socketService').then(({ emitToUser }) => {
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
       import('../services/socketService').then(({ emitToUser }) => {
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
  } catch (err: any) {
    console.error('Error updating request status:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const verifyQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { qrCodeToken } = req.body;
    
    if (req.user?.role?.toLowerCase() !== 'volunteer') {
      res.status(403).json({ message: 'Only volunteers can verify QR codes' });
      return;
    }

    const request = await WasteRequest.findById(id);
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
      const volId = new mongoose.Types.ObjectId(request.volunteerId);
      const citId = new mongoose.Types.ObjectId(request.citizenId);
      Message.updateMany(
        {
          $or: [
            { sender_id: volId, receiver_id: citId },
            { sender_id: citId, receiver_id: volId }
          ]
        },
        {
          $addToSet: { deletedFor: { $each: [volId, citId] } }
        }
      ).then(() => {
        console.log(`[SOFT DELETE] Messages soft deleted (QR verified) between volunteer ${volId} and citizen ${citId}`);
        import('../services/socketService').then(({ emitToUser }) => {
          emitToUser(volId.toString(), 'conversation_cleared', { partnerId: citId.toString() });
          emitToUser(citId.toString(), 'conversation_cleared', { partnerId: volId.toString() });
        }).catch(e => console.error('Failed to import socketService:', e));
      }).catch(e => console.error('Failed to soft delete pickup messages:', e));
    }

    // Reward the citizen
    if (request.citizenId) {
      import('../models/User').then(({ default: User }) => {
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
      import('../services/socketService').then(({ emitToUser }) => {
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
  } catch (err: any) {
    console.error('Error verifying QR code:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reschedule a pending pickup request (citizen only)
// @route   PATCH /api/waste-requests/:id/reschedule
// @access  Private (Citizen)
export const rescheduleRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime } = req.body;

    if (!scheduledDate && !scheduledTime) {
      res.status(400).json({ message: 'Please provide a new scheduledDate or scheduledTime.' });
      return;
    }

    const request = await WasteRequest.findById(id);
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

    if (scheduledDate) request.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) request.scheduledTime = scheduledTime;

    const updated = await request.save();
    res.json(updated);
  } catch (err: any) {
    console.error('Error rescheduling request:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

