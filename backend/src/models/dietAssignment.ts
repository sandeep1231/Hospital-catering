import mongoose, { Schema, Document } from 'mongoose';

export type DietName = string;
export type DietStatus = 'pending' | 'delivered' | 'cancelled';

export interface IDietAssignment extends Document {
  patientId: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  date: Date; // date-only (start of day)
  fromTime?: string; // optional start time HH:MM
  toTime?: string;   // optional end time HH:MM
  diet: DietName;
  note?: string;
  status: DietStatus;
  deliveredBy?: mongoose.Types.ObjectId; // user id
  deliveredAt?: Date;
  price?: number; // captured at assignment for billing
}

export const DietAssignmentSchema = new Schema<IDietAssignment>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  date: { type: Date, required: true },
  fromTime: { type: String },
  toTime: { type: String },
  diet: { type: String, required: true, maxlength: 200 },
  note: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['pending','delivered','cancelled'], default: 'pending' },
  deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: { type: Date },
  price: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

DietAssignmentSchema.index({ hospitalId: 1, vendorId: 1, patientId: 1, date: 1 });

export default mongoose.model<IDietAssignment>('DietAssignment', DietAssignmentSchema);
