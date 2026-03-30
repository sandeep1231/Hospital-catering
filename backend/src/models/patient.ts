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
  vendorId?: mongoose.Types.ObjectId;
  code?: string; // optional human-friendly identifier (MRN/bed code)
  dietNote?: string; // note associated with selected diet
  dischargeDate?: Date;
  dischargeTime?: string; // HH:MM
}

export const PatientSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 200 },
  dob: { type: Date },
  phone: { type: String, maxlength: 20 },
  inDate: { type: Date },
  inTime: { type: String, maxlength: 10 },
  roomType: { type: String, maxlength: 50 },
  bed: { type: String, maxlength: 50 },
  roomNo: { type: String, maxlength: 50 },
  diet: { type: String, maxlength: 100 },
  status: { type: String, default: 'in_patient' },
  transactionType: { type: String },
  age: { type: Number, min: 0, max: 200 },
  sex: { type: String },
  // removed billing fields: totalBill, dailyBill, recurringDetails
  feedback: { type: String, maxlength: 2000 },
  allergies: [{ type: String, maxlength: 100 }],
  notes: { type: String, maxlength: 2000 },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  code: { type: String, maxlength: 50 },
  dietNote: { type: String, maxlength: 500 },
  dischargeDate: { type: Date },
  dischargeTime: { type: String, maxlength: 10 }
}, { timestamps: true });

// Unique code per hospital (only when code exists and is not null)
// Use partialFilterExpression instead of sparse to avoid treating null as a value
// and to ensure uniqueness is enforced only when `code` is present.
PatientSchema.index(
  { hospitalId: 1, vendorId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string' } } }
);

export default mongoose.model<IPatient>('Patient', PatientSchema);
