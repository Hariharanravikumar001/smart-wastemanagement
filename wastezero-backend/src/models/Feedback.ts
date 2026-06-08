import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  role: string;
  content: string;
  sentimentScore: number;
  sentimentComparative: number;
  isNegative: boolean;
  priority?: 'Normal' | 'Urgent';
  createdAt: Date;
}

const FeedbackSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  sentimentScore: { type: Number, required: true },
  sentimentComparative: { type: Number, required: true },
  isNegative: { type: Boolean, required: true, default: false },
  priority: { type: String, enum: ['Normal', 'Urgent'], default: 'Normal' }
}, { timestamps: true });

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
