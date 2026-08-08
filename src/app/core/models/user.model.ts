import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type UserRole = 'Government' | 'RescueTeam' | 'Volunteer' | 'Citizen' | 'Admin';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImage?: string;
  location?: UserLocation;
  createdAt: Timestamp | FieldValue | string;
  updatedAt: Timestamp | FieldValue | string;
}

export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImage?: string;
  location?: UserLocation;
}
