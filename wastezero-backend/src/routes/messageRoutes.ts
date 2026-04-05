import express from 'express';
import {
    sendMessage,
    getConversation,
    getConversationsList,
    markAsRead
} from '../controllers/messageController';
import { authProtect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authProtect);

// @route   GET /api/messages/conversations
router.get('/conversations', getConversationsList);

// @route   PUT /api/messages/read/:partnerId
router.put('/read/:partnerId', markAsRead);

// @route   GET /api/messages/:partnerId
router.get('/:partnerId', getConversation);

// @route   POST /api/messages
router.post('/', sendMessage);

export default router;
