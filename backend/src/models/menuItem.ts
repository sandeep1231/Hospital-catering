import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  dietTags?: string[];
  calories?: number;
  allergens?: string[];
}

const MenuItemSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  dietTags: [{ type: String }],
  calories: { type: Number },
  allergens: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
