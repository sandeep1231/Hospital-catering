import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'diet-supervisor' | 'dietician';
  hospitalId?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','diet-supervisor','dietician'], default: 'dietician' },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
