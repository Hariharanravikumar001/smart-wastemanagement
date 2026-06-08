import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
    title: string;
    description: string;
    skills: string[];
    duration: string;
    location: string;
    wasteType?: string | string[];
    status: 'open' | 'closed' | 'in-progress';
    ngo_id: mongoose.Types.ObjectId;
    isDeleted: boolean;
    // Scheduling
    startDate?: string;
    startTime?: string;
    scheduleType?: 'none' | 'daily' | 'weekly-2' | 'weekly-3';
    scheduleDays?: string[];
    scheduleTime?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OpportunitySchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    duration: { type: String, required: true },
    location: { type: String, required: true },
    wasteType: { type: [String], default: [] },
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
    isDeleted: { type: Boolean, default: false },
    // Scheduling fields
    startDate: { type: String },
    startTime: { type: String },
    scheduleType: { type: String, enum: ['none', 'daily', 'weekly-2', 'weekly-3'], default: 'none' },
    scheduleDays: { type: [String], default: [] },
    scheduleTime: { type: String }
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
