import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type AlertType = 'EMERGENCY' | 'WARNING' | 'ADVISORY' | 'INFO';
export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
  id?: string;
  title: string;
  message: string;
  type: AlertType;
  priority: AlertPriority;
  affectedArea: string;
  startTime: Timestamp | FieldValue | string;
  endTime?: Timestamp | FieldValue | string;
  active: boolean;
  createdAt: Timestamp | FieldValue | string;
}
