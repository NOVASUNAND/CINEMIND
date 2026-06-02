import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../interfaces/auth.interface.js';


export interface IUserDocument extends IUser, Document {}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUserDocument>('User', UserSchema);