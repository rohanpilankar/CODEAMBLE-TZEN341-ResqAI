import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type NotificationType = 'ALERT' | 'ASSIGNMENT' | 'STATUS_UPDATE' | 'SYSTEM';

export interface UserNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Timestamp | FieldValue | string;
}
