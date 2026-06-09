"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Endpoint for AI Waste Detection (mock implementation)
router.post('/detect-waste', authMiddleware_1.authProtect, aiController_1.detectWaste);
// Public chatbot endpoint
router.post('/chatbot', aiController_1.chatbotResponse);
exports.default = router;
