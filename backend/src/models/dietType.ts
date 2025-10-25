import mongoose, { Schema, Document } from 'mongoose';

export interface IDietType extends Document {
  name: string;
  defaultPrice: number;
  active: boolean;
  hospitalId?: mongoose.Types.ObjectId;
}

const DietTypeSchema = new Schema<IDietType>({
  name: { type: String, required: true },
  defaultPrice: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

DietTypeSchema.index({ hospitalId: 1, name: 1 }, { unique: true, sparse: true });

export default mongoose.model<IDietType>('DietType', DietTypeSchema);
