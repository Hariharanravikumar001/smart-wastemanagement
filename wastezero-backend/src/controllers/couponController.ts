import { Request, Response } from 'express';
import Coupon from '../models/Coupon';
import User from '../models/User';

export const redeemCoupon = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, cost } = req.body;

    if (!name || !cost) {
      return res.status(400).json({ message: 'Coupon name and cost are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentPoints = user.rewardPoints || 0;
    if (currentPoints < cost) {
      return res.status(400).json({ message: `Insufficient Eco-Points. You need ${cost - currentPoints} more points.` });
    }

    // Deduct points
    user.rewardPoints = currentPoints - cost;
    await user.save();

    // Generate unique code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ZERO-';
    let codeUnique = false;
    while (!codeUnique) {
      let suffix = '';
      for (let i = 0; i < 8; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await Coupon.findOne({ couponCode: code + suffix });
      if (!existing) {
        code += suffix;
        codeUnique = true;
      }
    }

    // Calculate expiry: 30 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const coupon = new Coupon({
      userId,
      couponName: name,
      costPoints: cost,
      couponCode: code,
      expiryDate
    });

    await coupon.save();

    res.status(201).json({
      message: 'Voucher claimed successfully!',
      couponCode: code,
      updatedPoints: user.rewardPoints
    });
  } catch (error) {
    console.error('Redeem coupon error:', error);
    res.status(500).json({ message: 'Server error during redemption' });
  }
};

export const getMyCoupons = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const coupons = await Coupon.find({ userId }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Server error retrieving vouchers' });
  }
};
