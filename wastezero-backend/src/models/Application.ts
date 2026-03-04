import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApplication extends Document {
  opportunity_id: Types.ObjectId;
  volunteer_id: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: Date;
}

const ApplicationSchema: Schema = new Schema({
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  volunteer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending' 
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IApplication>('Application', ApplicationSchema);
