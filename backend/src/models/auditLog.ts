import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  entity: string;
  entityId: mongoose.Types.ObjectId | string;
  action: string;
  userId?: mongoose.Types.ObjectId | string;
  timestamp: Date;
  details?: any;
}

const AuditLogSchema: Schema = new Schema({
  entity: { type: String, required: true },
  entityId: { type: Schema.Types.Mixed, required: true },
  action: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: () => new Date() },
  details: { type: Schema.Types.Mixed }
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
