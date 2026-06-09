"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authProtect);
// @route   GET /api/messages/conversations
router.get('/conversations', messageController_1.getConversationsList);
// @route   PUT /api/messages/read/:partnerId
router.put('/read/:partnerId', messageController_1.markAsRead);
// @route   GET /api/messages/:partnerId
router.get('/:partnerId', messageController_1.getConversation);
// @route   POST /api/messages
router.post('/', messageController_1.sendMessage);
exports.default = router;
