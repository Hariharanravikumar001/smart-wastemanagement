"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const OpportunitySchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        transform: (doc, ret) => {
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
exports.default = mongoose_1.default.model('Opportunity', OpportunitySchema);
