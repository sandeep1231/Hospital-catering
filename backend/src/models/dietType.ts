import mongoose, { Schema, Document } from 'mongoose';

export interface IDietType extends Document {
  name: string;
  defaultPrice: number;
  active: boolean;
  hospitalId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
}

export const DietTypeSchema = new Schema<IDietType>({
  name: { type: String, required: true, maxlength: 200 },
  defaultPrice: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' }
}, { timestamps: true });

DietTypeSchema.index({ hospitalId: 1, vendorId: 1, name: 1 }, { unique: true, sparse: true });

export default mongoose.model<IDietType>('DietType', DietTypeSchema);
