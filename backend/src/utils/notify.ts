import Notification from '../models/notification';
import { Request } from 'express';

interface NotifyData {
  hospitalId: any;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdBy: any;
  createdByName?: string;
}

/**
 * Fire-and-forget helper to create a notification.
 * Uses the shared Notification model (for routes that don't have tenant context).
 * Errors are silently caught to avoid blocking the main request.
 */
export function notify(data: NotifyData) {
  Notification.create({
    hospitalId: data.hospitalId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || '',
    createdBy: data.createdBy,
    createdByName: data.createdByName || '',
    readBy: data.createdBy ? [data.createdBy] : [],
  }).catch((err) => {
    console.error('notification create error', err);
  });
}

/**
 * Fire-and-forget helper to create a notification using the tenant-scoped model.
 * Reads `req.tenantModels.Notification` to write into the vendor's database.
 */
export function notifyTenant(req: Request, data: NotifyData) {
  const NotifModel = req.tenantModels?.Notification;
  if (!NotifModel) {
    // Fallback to shared model if tenant context not available (e.g. super-admin)
    return notify(data);
  }
  NotifModel.create({
    hospitalId: data.hospitalId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || '',
    createdBy: data.createdBy,
    createdByName: data.createdByName || '',
    readBy: data.createdBy ? [data.createdBy] : [],
  }).catch((err) => {
    console.error('notification create error', err);
  });
}
