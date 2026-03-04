import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdminLog extends Document {
  action: string;
  user_id: Types.ObjectId;
  timestamp: Date;
}

const AdminLogSchema: Schema = new Schema({
  action: { type: String, required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);
