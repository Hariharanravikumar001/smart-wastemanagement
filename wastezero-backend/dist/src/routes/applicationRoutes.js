"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const applicationController_1 = require("../controllers/applicationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authProtect);
// @route   POST /api/applications
router.post('/', (0, roleMiddleware_1.requireRole)(['volunteer']), applicationController_1.applyForOpportunity);
// @route   GET /api/applications/admin
router.get('/admin', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), applicationController_1.getAdminApplications);
// @route   GET /api/applications/volunteer
router.get('/volunteer', (0, roleMiddleware_1.requireRole)(['volunteer']), applicationController_1.getVolunteerApplications);
// @route   GET /api/applications (all — for admin CSV export)
router.get('/', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), applicationController_1.getAdminApplications);
// @route   PUT /api/applications/:id/status
router.put('/:id/status', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), applicationController_1.updateApplicationStatus);
exports.default = router;
