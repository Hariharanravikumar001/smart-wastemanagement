import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  userId: mongoose.Types.ObjectId;
  couponName: string;
  costPoints: number;
  couponCode: string;
  isRedeemed: boolean;
  expiryDate: Date;
  createdAt: Date;
}

const CouponSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  couponName: { type: String, required: true },
  costPoints: { type: Number, required: true },
  couponCode: { type: String, required: true, unique: true },
  isRedeemed: { type: Boolean, default: false },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
