import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  address?: string;
}

const HospitalSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String }
}, { timestamps: true });

// Note: unique index on name is already declared via the schema field above.
// Avoid adding a separate non-unique index on { name: 1 } as it conflicts
// with the existing unique index when syncing indexes.

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
