import { Router } from 'express';
import { optimizeRoute } from '../controllers/routeOptimizationController';
import { authProtect } from '../middleware/authMiddleware';

const router = Router();

// Endpoint for Smart Route Optimization
router.get('/optimize/:volunteerId', authProtect, optimizeRoute);

export default router;
