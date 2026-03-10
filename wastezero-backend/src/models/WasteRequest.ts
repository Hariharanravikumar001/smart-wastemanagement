import mongoose, { Document, Schema } from 'mongoose';

export interface IWasteRequest extends Document {
  citizenId: string;
  citizenName: string;
  location: string;
  wasteCategory: string;
  description: string;
  status: 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled';
  weight?: number;
  volunteerId?: string;
  volunteerName?: string;
  scheduledDate?: Date;
  createdAt: Date;
}

const wasteRequestSchema = new Schema<IWasteRequest>({
  citizenId: { type: String, required: true },
  citizenName: { type: String, required: true },
  location: { type: String, required: true },
  wasteCategory: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Scheduled', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  weight: { type: Number },
  volunteerId: { type: String },
  volunteerName: { type: String },
  scheduledDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export default mongoose.model<IWasteRequest>('WasteRequest', wasteRequestSchema);
