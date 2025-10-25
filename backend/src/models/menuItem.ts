import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  dietTags?: string[];
  calories?: number;
  allergens?: string[];
  hospitalId?: mongoose.Types.ObjectId;
  price?: number;
}

const MenuItemSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  dietTags: [{ type: String }],
  calories: { type: Number },
  allergens: [{ type: String }],
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
  price: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
