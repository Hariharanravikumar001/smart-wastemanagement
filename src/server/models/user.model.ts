import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password?: string;
  location: string;
  role: 'Citizen' | 'Volunteer' | 'Admin';
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String, required: true },
  role: { type: String, enum: ['Citizen', 'Volunteer', 'Admin'], default: 'Citizen' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
