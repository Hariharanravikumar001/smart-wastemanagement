"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pipelineController_1 = require("../controllers/pipelineController");
const router = express_1.default.Router();
// @route   GET api/public/analytics
// @desc    Public analytics stream for internal state/government pipelines
// @access  Public
router.get('/analytics', pipelineController_1.getPublicAnalytics);
// @route   GET api/public/stats
// @desc    Live platform stats for landing page
// @access  Public
router.get('/stats', pipelineController_1.getPublicStats);
exports.default = router;
