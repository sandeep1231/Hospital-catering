import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  dietTags?: string[];
  calories?: number;
  allergens?: string[];
  hospitalId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  price?: number;
}

export const MenuItemSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  dietTags: [{ type: String, maxlength: 100 }],
  calories: { type: Number, min: 0 },
  allergens: [{ type: String, maxlength: 100 }],
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  price: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
