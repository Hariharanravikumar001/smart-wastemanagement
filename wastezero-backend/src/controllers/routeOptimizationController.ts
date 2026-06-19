import { Request, Response } from 'express';
import WasteRequest from '../models/WasteRequest';

// Mock Route Optimization Controller
export const optimizeRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { volunteerId } = req.params;

    // Fetch all accepted pickups for this volunteer
    const pickups = await WasteRequest.find({
      volunteerId,
      status: { $in: ['Scheduled', 'In Progress'] }
    });

    if (!pickups || pickups.length === 0) {
      res.status(200).json({
        message: 'No active pickups found',
        optimizedRoute: []
      });
      return;
    }

    // Simulate route optimization (Traveling Salesperson Problem heuristic)
    // We mock distances since we don't have lat/long for addresses
    const optimizedPickups = pickups.map((pickup, index) => {
      // Mock distance from previous location or base
      const mockDistanceKm = (Math.random() * 5 + 1).toFixed(1);
      const mockTimeMins = Math.round(Number(mockDistanceKm) * 4); // ~15km/h city speed
      return {
        pickup,
        stepOrder: index + 1,
        distanceFromPreviousKm: mockDistanceKm,
        estimatedTimeMins: mockTimeMins
      };
    });

    const totalDistance = optimizedPickups.reduce((sum, item) => sum + Number(item.distanceFromPreviousKm), 0);
    const totalTime = optimizedPickups.reduce((sum, item) => sum + item.estimatedTimeMins, 0);

    res.status(200).json({
      message: 'Route optimized successfully',
      optimizedRoute: optimizedPickups,
      totalDistanceKm: totalDistance.toFixed(1),
      totalEstimatedTimeMins: totalTime
    });
  } catch (error) {
    console.error('Error in Route Optimization:', error);
    res.status(500).json({ message: 'Internal server error during route optimization' });
  }
};
