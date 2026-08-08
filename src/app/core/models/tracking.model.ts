export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VehicleType = 'AMBULANCE' | 'POLICE' | 'FIRE_BRIGADE' | 'NDRF' | 'MEDICAL_TEAM';
export type VehicleStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING';

export interface UserLocation {
  latitude: float;
  longitude: float;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

// Ensure compatibility with TS number type
export type float = number;

export interface RescueVehicle {
  id: number | string;
  name: string;
  vehicleType: VehicleType;
  latitude: number;
  longitude: number;
  status: VehicleStatus;
  etaMinutes: number;
  speedKmh: number;
  destination: string;
  assignedIncidentId?: number | string;
  contactPhone?: string;
  lastUpdated: string;
}

export interface DisasterIncident {
  id: number;
  title: string;
  description: string;
  disasterType: string;
  severity: SeverityLevel;
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  phoneNumber?: string;
  peopleAffected?: number;
  mediaUrl?: string;
  images?: string[];
  isAiVerified: boolean | number;
  confidenceScore: number;
  reportedById?: number;
  createdAt: string;
  distanceKm?: number;
}

export interface ShelterPoint {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalCapacity: number;
  currentOccupancy: number;
  availableBeds: number;
  contactPhone?: string;
  medicalAvailable: boolean;
  foodAvailable: boolean;
  waterAvailable: boolean;
  distanceKm?: number;
}

export interface MedicalPoint {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  icuBeds?: number;
  availableBeds?: number;
  distanceKm?: number;
}

export interface LayerFilterState {
  disasterReports: boolean;
  rescueTeams: boolean;
  hospitals: boolean;
  policeStations: boolean;
  fireStations: boolean;
  shelters: boolean;
  safeZones: boolean;
  dangerZones: boolean;
  weatherLayer: boolean;
  aiPredictionLayer: boolean;
  heatmapLayer: boolean;
  buildings3D: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: number; // in meters
  name: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lng, lat]
  steps: RouteStep[];
}

export interface SearchResultItem {
  id: string | number;
  type: 'HOSPITAL' | 'SHELTER' | 'INCIDENT' | 'PLACE';
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}
