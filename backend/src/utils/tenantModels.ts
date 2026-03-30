import { Connection, Model } from 'mongoose';

import { IPatient, PatientSchema } from '../models/patient';
import { IOrder, OrderSchema } from '../models/order';
import { IDietAssignment, DietAssignmentSchema } from '../models/dietAssignment';
import { IDietPlan, DietPlanSchema } from '../models/dietPlan';
import { IDietType, DietTypeSchema } from '../models/dietType';
import { IMenuItem, MenuItemSchema } from '../models/menuItem';
import { INotification, NotificationSchema } from '../models/notification';
import { IAuditLog, AuditLogSchema } from '../models/auditLog';
import { IPatientMovement, PatientMovementSchema } from '../models/patientMovement';

export interface TenantModels {
  Patient: Model<IPatient>;
  Order: Model<IOrder>;
  DietAssignment: Model<IDietAssignment>;
  DietPlan: Model<IDietPlan>;
  DietType: Model<IDietType>;
  MenuItem: Model<IMenuItem>;
  Notification: Model<INotification>;
  AuditLog: Model<IAuditLog>;
  PatientMovement: Model<IPatientMovement>;
}

/**
 * Build (or retrieve cached) Mongoose models for a given vendor connection.
 * Uses conn.model() which caches by model name on the connection instance.
 */
export function getTenantModels(conn: Connection): TenantModels {
  // conn.model() returns existing if already registered, or registers new
  const model = <T>(name: string, schema: any): Model<T> => {
    try {
      return conn.model<T>(name);
    } catch {
      return conn.model<T>(name, schema);
    }
  };

  return {
    Patient: model<IPatient>('Patient', PatientSchema),
    Order: model<IOrder>('Order', OrderSchema),
    DietAssignment: model<IDietAssignment>('DietAssignment', DietAssignmentSchema),
    DietPlan: model<IDietPlan>('DietPlan', DietPlanSchema),
    DietType: model<IDietType>('DietType', DietTypeSchema),
    MenuItem: model<IMenuItem>('MenuItem', MenuItemSchema),
    Notification: model<INotification>('Notification', NotificationSchema),
    AuditLog: model<IAuditLog>('AuditLog', AuditLogSchema),
    PatientMovement: model<IPatientMovement>('PatientMovement', PatientMovementSchema),
  };
}
