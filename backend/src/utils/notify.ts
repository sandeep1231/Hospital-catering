import Notification from '../models/notification';

/**
 * Fire-and-forget helper to create a notification.
 * Errors are silently caught to avoid blocking the main request.
 */
export function notify(data: {
  hospitalId: any;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdBy: any;
  createdByName?: string;
}) {
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
