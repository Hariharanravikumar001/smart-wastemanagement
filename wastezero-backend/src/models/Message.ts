import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  sender_id: Types.ObjectId;
  receiver_id: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'location' | 'link';
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
    enum: ['text', 'image', 'audio', 'location', 'link'], 
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

export default mongoose.model<IMessage>('Message', MessageSchema);
