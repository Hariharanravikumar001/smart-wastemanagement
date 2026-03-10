import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
    opportunity_id: mongoose.Types.ObjectId;
    volunteer_id: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema({
    opportunity_id: {
        type: Schema.Types.ObjectId,
        ref: 'Opportunity',
        required: true
    },
    volunteer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret: any) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Compound index to prevent duplicate applications for the same opportunity
ApplicationSchema.index({ opportunity_id: 1, volunteer_id: 1 }, { unique: true });
ApplicationSchema.index({ volunteer_id: 1 });

export default mongoose.model<IApplication>('Application', ApplicationSchema);
