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
const MessageSchema = new mongoose_1.Schema({
    sender_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    opportunity_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Opportunity' },
    content: { type: String, required: true },
    messageType: {
        type: String,
        enum: ['text', 'image', 'audio', 'location', 'link', 'live-location', 'document'],
        default: 'text'
    },
    mediaUrl: { type: String },
    isRead: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    timestamp: { type: Date, default: Date.now }
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            ret.senderId = ret.sender_id;
            ret.receiverId = ret.receiver_id;
            delete ret._id;
            delete ret.sender_id;
            delete ret.receiver_id;
            delete ret.__v;
            return ret;
        }
    }
});
MessageSchema.index({ sender_id: 1, receiver_id: 1, timestamp: -1 });
MessageSchema.index({ deletedFor: 1 });
MessageSchema.index({ opportunity_id: 1 });
exports.default = mongoose_1.default.model('Message', MessageSchema);
