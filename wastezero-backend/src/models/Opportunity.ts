import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOpportunity extends Document {
  ngo_id: Types.ObjectId;
  title: string;
  description: string;
  required_skills: string[];
  duration: string;
  location: string;
  status: 'open' | 'closed' | 'in-progress';
  created_at: Date;
}

const OpportunitySchema: Schema = new Schema({
  ngo_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  required_skills: { type: [String], default: [] },
  duration: { type: String, required: true },
  location: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['open', 'closed', 'in-progress'],
    default: 'open' 
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
