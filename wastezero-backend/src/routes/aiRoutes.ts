import { Router } from 'express';
import { detectWaste, chatbotResponse } from '../controllers/aiController';
import { authProtect } from '../middleware/authMiddleware';

const router = Router();

// Endpoint for AI Waste Detection (mock implementation)
router.post('/detect-waste', authProtect, detectWaste);

// Public chatbot endpoint
router.post('/chatbot', chatbotResponse);

export default router;
