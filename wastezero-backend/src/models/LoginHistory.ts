import mongoose, { Schema, Document } from 'mongoose';

export interface ILoginHistory extends Document {
  userId?: mongoose.Types.ObjectId;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'Success' | 'Failed' | '2FA Required';
  timestamp: Date;
}

const LoginHistorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['Success', 'Failed', '2FA Required'], required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);
