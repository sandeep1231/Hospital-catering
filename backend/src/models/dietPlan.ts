import mongoose, { Schema, Document } from 'mongoose';

export interface IDietPlanItem {
  id: string; // Menu item id
  notes?: string; // manual info
}

export interface IDietPlanDay {
  dayIndex: number; // 0 = Monday ... 6 = Sunday or use date
  meals: {
    slot: string; // breakfast/lunch/dinner/snack
    // items can be simple string ids (backward compat) or objects with id+notes
    items: (string | IDietPlanItem)[]; // menu item ids or objects
  }[];
}

export interface IDietPlan extends Document {
  name?: string;
  patientId?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  days: IDietPlanDay[];
  notes?: string;
}

const DietPlanDaySchema: Schema = new Schema({
  dayIndex: { type: Number },
  meals: [{
    slot: String,
    // Use Mixed so we can store either a string id or an object with id+notes
    items: [{ type: Schema.Types.Mixed }]
  }]
});

const DietPlanSchema: Schema = new Schema({
  name: { type: String },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
  days: [DietPlanDaySchema],
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IDietPlan>('DietPlan', DietPlanSchema);
