import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'super-admin' | 'admin' | 'diet-supervisor' | 'dietician';
  hospitalId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 200 },
  email: { type: String, required: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['super-admin','admin','diet-supervisor','dietician'], default: 'dietician' },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
