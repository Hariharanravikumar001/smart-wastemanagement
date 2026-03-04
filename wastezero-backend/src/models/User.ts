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
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
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
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
