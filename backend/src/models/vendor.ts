import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdBy?: mongoose.Types.ObjectId;
}

const VendorSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String },
  address: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

VendorSchema.index({ status: 1 });

export default mongoose.model<IVendor>('Vendor', VendorSchema);
