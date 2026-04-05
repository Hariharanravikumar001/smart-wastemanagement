import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
    title: string;
    description: string;
    skills: string[];
    duration: string;
    location: string;
    wasteType?: string;
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
    wasteType: { type: String },
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
    timestamps: true,
    toJSON: {
        transform: (doc, ret: any) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Virtual for applications
OpportunitySchema.virtual('applications', {
    ref: 'Application',
    localField: '_id',
    foreignField: 'opportunity_id'
});


// Index for listing optimizations
OpportunitySchema.index({ status: 1, isDeleted: 1 });
OpportunitySchema.index({ location: 1 });
OpportunitySchema.index({ ngo_id: 1 });

export default mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
