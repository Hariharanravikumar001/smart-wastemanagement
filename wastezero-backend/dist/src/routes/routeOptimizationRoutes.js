"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routeOptimizationController_1 = require("../controllers/routeOptimizationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Endpoint for Smart Route Optimization
router.get('/optimize/:volunteerId', authMiddleware_1.authProtect, routeOptimizationController_1.optimizeRoute);
exports.default = router;
