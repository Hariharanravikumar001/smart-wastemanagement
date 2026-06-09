"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// @route   GET /api/admin/analytics
// @access  Private (Admin/NGO)
router.get('/analytics', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), adminController_1.getAnalytics);
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), adminController_1.getUsers);
// @route   POST /api/admin/user-status
// @access  Private (Admin)
router.post('/user-status', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), adminController_1.updateUserStatus);
// @route   GET /api/admin/logs
// @access  Private (Admin)
router.get('/logs', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), adminController_1.getAdminLogs);
// @route   GET /api/admin/user-stats
// @access  Private (Admin)
router.get('/user-stats', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), authController_1.getUserStats);
// @route   GET /api/admin/reports
// @access  Private (Admin)
router.get('/reports', authMiddleware_1.authProtect, (0, roleMiddleware_1.requireRole)(['admin']), adminController_1.generateCSVReport);
exports.default = router;
