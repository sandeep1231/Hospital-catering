import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientMovement extends Document {
  patientId: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId | null;
  roomType?: string | null;
  roomNo?: string | null;
  bed?: string | null;
  start: Date; // UTC instant when this movement becomes effective
  end?: Date | null; // UTC instant when this movement ends (exclusive). Null means active/ongoing
}

const PatientMovementSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true, required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
  roomType: { type: String },
  roomNo: { type: String },
  bed: { type: String },
  start: { type: Date, required: true, index: true },
  end: { type: Date, default: null, index: true }
}, { timestamps: true });

// Useful compound index for range queries per patient
PatientMovementSchema.index({ patientId: 1, start: 1, end: 1 });

export default mongoose.model<IPatientMovement>('PatientMovement', PatientMovementSchema);
