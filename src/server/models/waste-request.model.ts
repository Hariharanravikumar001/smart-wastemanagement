import mongoose, { Schema, Document } from 'mongoose';

export interface IWasteRequest extends Document {
  citizenId: mongoose.Types.ObjectId;
  volunteerId?: mongoose.Types.ObjectId;
  category: string;
  description: string;
  location: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed';
  scheduledDate?: Date;
  completedAt?: Date;
  weight?: number;
  createdAt: Date;
}

const WasteRequestSchema: Schema = new Schema({
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  volunteerId: { type: Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Scheduled', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  scheduledDate: { type: Date },
  completedAt: { type: Date },
  weight: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IWasteRequest>('WasteRequest', WasteRequestSchema);
