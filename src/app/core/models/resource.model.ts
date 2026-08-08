import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type ResourceCategory = 'Medical' | 'Food' | 'Water' | 'Shelter' | 'Rescue Equipment' | 'Transport' | 'Personnel';

export interface ResourceLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface EmergencyResource {
  id?: string;
  name: string;
  category: ResourceCategory;
  quantity: number;
  location: ResourceLocation;
  contact: string;
  availability: boolean;
  updatedAt: Timestamp | FieldValue | string;
}
