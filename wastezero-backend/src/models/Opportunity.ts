import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
    title: string;
    description: string;
    skills: string[];
    duration: string;
    location: string;
    status: 'open' | 'closed' | 'in-progress';
    ngo_id: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OpportunitySchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    duration: { type: String, required: true },
    location: { type: String, required: true },
    status: {
        type: String,
        enum: ['open', 'closed', 'in-progress'],
        default: 'open'
    },
    ngo_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Index for listing optimizations
OpportunitySchema.index({ status: 1, isDeleted: 1 });
OpportunitySchema.index({ location: 1 });

export default mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
