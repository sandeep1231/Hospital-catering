import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  patientId: mongoose.Types.ObjectId;
  menuItemId: mongoose.Types.ObjectId;
  quantity: number;
  notes?: string;
  mealSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'; // New: meal slot for breakfast/lunch/dinner/snack/other
}

export interface IOrder extends Document {
  date: Date;
  items: IOrderItem[];
  kitchenStatus: 'pending' | 'preparing' | 'ready' | 'cancelled';
  deliveryStatus: 'pending' | 'assigned' | 'in_transit' | 'delivered';
  assignedTo?: mongoose.Types.ObjectId;
  notes?: string;
  sourcePlanId?: mongoose.Types.ObjectId;
}

const OrderItemSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
  quantity: { type: Number, default: 1 },
  notes: { type: String },
  mealSlot: { type: String, enum: ['breakfast','lunch','dinner','snack','other'] }
});

const OrderSchema: Schema = new Schema({
  date: { type: Date, required: true },
  items: [OrderItemSchema],
  kitchenStatus: { type: String, default: 'pending' },
  deliveryStatus: { type: String, default: 'pending' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  sourcePlanId: { type: Schema.Types.ObjectId, ref: 'DietPlan' }
}, { timestamps: true });

OrderSchema.index({ date: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
