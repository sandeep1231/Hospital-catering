import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  address?: string;
}

const HospitalSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String }
}, { timestamps: true });

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
