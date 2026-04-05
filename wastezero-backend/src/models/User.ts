import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: 'user' | 'volunteer' | 'admin' | 'citizen' | 'ngo';
  location?: string;
  skills?: string[];
  bio?: string;
  resetPasswordOtp?: string;
  resetPasswordExpires?: Date;
  created_at: Date;
  profileImage?: string;
  isOnline: boolean;
  lastActive: Date;
  isSuspended: boolean;
  rewardPoints: number;
  badges: string[];
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['user', 'volunteer', 'admin', 'citizen', 'ngo'],
    default: 'user' 
  },
  location: { type: String },
  skills: { type: [String], default: [] },
  bio: { type: String },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date },
  created_at: { type: Date, default: Date.now },
  profileImage: { type: String },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  isSuspended: { type: Boolean, default: false },
  rewardPoints: { type: Number, default: 0 },
  badges: { type: [String], default: [] }
}, {
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for search optimization
UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
UserSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
UserSchema.index({ role: 1 });
UserSchema.index({ location: 1 });

export default mongoose.model<IUser>('User', UserSchema);
