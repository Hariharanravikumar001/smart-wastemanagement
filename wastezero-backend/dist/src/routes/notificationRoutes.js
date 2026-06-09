"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authProtect);
// @route   GET /api/notifications
router.get('/', notificationController_1.getNotifications);
// @route   PUT /api/notifications/:id/read
router.put('/:id/read', notificationController_1.markAsRead);
exports.default = router;
