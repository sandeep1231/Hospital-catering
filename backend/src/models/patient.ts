import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  dob: Date;
  phone?: string;
  inDate?: Date; // date of admission
  inTime?: string; // time of admission HH:MM
  roomType?: string; // ICU, Ward, Cabin, etc.
  bed?: string;
  diet?: string; // current diet summary
  status?: 'in_patient' | 'discharged' | 'outpatient' | string;
  transactionType?: 'cash' | 'card' | 'insurance' | string;
  age?: number;
  sex?: 'male' | 'female' | 'other' | string;
  totalBill?: number;
  dailyBill?: number;
  recurringDetails?: any;
  feedback?: string;
  allergies?: string[];
  notes?: string;
}

const PatientSchema: Schema = new Schema({
  name: { type: String, required: true },
  dob: { type: Date },
  phone: { type: String },
  inDate: { type: Date },
  inTime: { type: String },
  roomType: { type: String },
  bed: { type: String },
  diet: { type: String },
  status: { type: String, default: 'in_patient' },
  transactionType: { type: String },
  age: { type: Number },
  sex: { type: String },
  totalBill: { type: Number, default: 0 },
  dailyBill: { type: Number, default: 0 },
  recurringDetails: { type: Schema.Types.Mixed },
  feedback: { type: String },
  allergies: [{ type: String }],
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IPatient>('Patient', PatientSchema);
