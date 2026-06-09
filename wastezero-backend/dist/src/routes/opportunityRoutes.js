"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const opportunityController_1 = require("../controllers/opportunityController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const ownershipMiddleware_1 = require("../middleware/ownershipMiddleware");
const router = express_1.default.Router();
// Publicly readable routes
// @route   GET /api/opportunities
router.get('/', opportunityController_1.getOpportunities);
// Protected routes below
router.use(authMiddleware_1.authProtect);
// Reordered to prevent Express from matching "matches" as the ":id" dynamic parameter
// @route   GET /api/opportunities/matches
router.get('/matches', (0, roleMiddleware_1.requireRole)(['volunteer']), opportunityController_1.getMatchedOpportunities);
// @route   GET /api/opportunities/:id
router.get('/:id', opportunityController_1.getOpportunityById);
// @route   POST /api/opportunities
router.post('/', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), opportunityController_1.createOpportunity);
// @route   PUT /api/opportunities/:id
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), ownershipMiddleware_1.verifyOwnership, opportunityController_1.updateOpportunity);
// @route   DELETE /api/opportunities/:id
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'ngo']), ownershipMiddleware_1.verifyOwnership, opportunityController_1.deleteOpportunity);
// @route   PATCH /api/opportunities/:id/complete
router.patch('/:id/complete', (0, roleMiddleware_1.requireRole)(['admin', 'volunteer']), opportunityController_1.completeOpportunity);
exports.default = router;
