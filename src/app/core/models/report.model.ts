import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type DisasterCategory = 'Flood' | 'Earthquake' | 'Fire' | 'Hurricane' | 'Landslide' | 'Gas Leak' | 'Power Outage' | 'Building Collapse' | 'Road Accident' | 'Other';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReportStatus = 'REPORTED' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface DisasterReport {
  id?: string;
  title: string;
  description: string;
  category: DisasterCategory;
  severity: SeverityLevel;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  images: string[];
  reportedBy: string; // User UID
  verified: boolean;
  createdAt: Timestamp | FieldValue | string;
  updatedAt: Timestamp | FieldValue | string;
}
