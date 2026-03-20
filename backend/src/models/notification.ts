import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  hospitalId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const NotificationSchema = new Schema({
  hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
  type: { type: String, required: true }, // patient_admitted, patient_discharged, diet_assigned, diet_delivered, diet_changed, order_created
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  createdByName: { type: String, default: '' },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// TTL index: auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Compound index for efficient querying
NotificationSchema.index({ hospitalId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
