"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// @route   POST /api/feedback
// @desc    Submit feedback/review
// @access  Private (Any authenticated user)
router.post('/', authMiddleware_1.authProtect, feedbackController_1.submitFeedback);
// @route   GET /api/feedback
// @desc    Get all feedback for admin sentiment analysis
// @access  Private (Admin only)
router.get('/', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), feedbackController_1.getFeedback);
exports.default = router;
