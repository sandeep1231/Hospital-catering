import mongoose, { Schema, Document } from 'mongoose';

export interface IVendorHospital extends Document {
  vendorId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  status: 'requested' | 'approved' | 'rejected' | 'revoked';
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
}

const VendorHospitalSchema: Schema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'revoked'], default: 'requested' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

VendorHospitalSchema.index({ vendorId: 1, hospitalId: 1 }, { unique: true });
VendorHospitalSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.model<IVendorHospital>('VendorHospital', VendorHospitalSchema);
