import express from 'express';
import { redeemCoupon, getMyCoupons } from '../controllers/couponController';
import { authProtect } from '../middleware/authMiddleware';

const router = express.Router();

// @route   POST /api/coupons/redeem
// @access  Private
router.post('/redeem', authProtect, redeemCoupon);

// @route   GET /api/coupons
// @access  Private
router.get('/', authProtect, getMyCoupons);

export default router;
