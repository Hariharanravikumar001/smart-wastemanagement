import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import WasteRequest from '../models/WasteRequest';

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

    res.json(updatedRequest);
  } catch (err: any) {
    console.error('Error updating request status:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
