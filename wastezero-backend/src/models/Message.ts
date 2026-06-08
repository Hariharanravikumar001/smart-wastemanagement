import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  sender_id: Types.ObjectId;
  receiver_id: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'location' | 'link' | 'live-location' | 'document';
  mediaUrl?: string;
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  isDeletedForEveryone: boolean;
  deletedFor: Types.ObjectId[];
  opportunity_id?: Types.ObjectId;
}

const MessageSchema: Schema = new Schema({
  sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
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
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  timestamp: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret: any) => {
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

export default mongoose.model<IMessage>('Message', MessageSchema);
