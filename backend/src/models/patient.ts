import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  dob: Date;
  phone?: string;
  inDate?: Date; // date of admission
  inTime?: string; // time of admission HH:MM
  roomType?: string; // ICU, Ward, Cabin, etc.
  bed?: string;
  roomNo?: string;
  diet?: string; // current diet summary
  status?: 'in_patient' | 'discharged' | 'outpatient' | string;
  transactionType?: 'cash' | 'card' | 'insurance' | string;
  age?: number;
  sex?: 'male' | 'female' | 'other' | string;
  // removed billing fields
  feedback?: string;
  allergies?: string[];
  notes?: string;
  hospitalId?: mongoose.Types.ObjectId;
  code?: string; // optional human-friendly identifier (MRN/bed code)
  dietNote?: string; // note associated with selected diet
  dischargeDate?: Date;
  dischargeTime?: string; // HH:MM
}

const PatientSchema: Schema = new Schema({
  name: { type: String, required: true },
  dob: { type: Date },
  phone: { type: String },
  inDate: { type: Date },
  inTime: { type: String },
  roomType: { type: String },
  bed: { type: String },
  roomNo: { type: String },
  diet: { type: String },
  status: { type: String, default: 'in_patient' },
  transactionType: { type: String },
  age: { type: Number },
  sex: { type: String },
  // removed billing fields: totalBill, dailyBill, recurringDetails
  feedback: { type: String },
  allergies: [{ type: String }],
  notes: { type: String },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  code: { type: String },
  dietNote: { type: String },
  dischargeDate: { type: Date },
  dischargeTime: { type: String }
}, { timestamps: true });

// Unique code per hospital (only when code is set)
PatientSchema.index({ hospitalId: 1, code: 1 }, { unique: true, sparse: true });

export default mongoose.model<IPatient>('Patient', PatientSchema);
