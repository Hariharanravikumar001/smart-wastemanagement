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
const wasteRequestSchema = new mongoose_1.Schema({
    citizenId: { type: String, required: true },
    citizenName: { type: String, required: true },
    location: { type: String, required: true },
    wasteCategory: { type: [String], required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    weight: { type: Number },
    volunteerId: { type: String },
    volunteerName: { type: String },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    qrCodeToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    imageUrl: { type: String },
    aiPredictedCategory: { type: String }
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
// Indexes for dashboard performance
wasteRequestSchema.index({ citizenId: 1, createdAt: -1 });
wasteRequestSchema.index({ volunteerId: 1, createdAt: -1 });
wasteRequestSchema.index({ status: 1 });
exports.default = mongoose_1.default.model('WasteRequest', wasteRequestSchema);
