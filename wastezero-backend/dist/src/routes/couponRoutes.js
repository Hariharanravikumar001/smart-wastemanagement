"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// @route   POST /api/coupons/redeem
// @access  Private
router.post('/redeem', authMiddleware_1.authProtect, couponController_1.redeemCoupon);
// @route   GET /api/coupons
// @access  Private
router.get('/', authMiddleware_1.authProtect, couponController_1.getMyCoupons);
exports.default = router;
