export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VehicleType = 'AMBULANCE' | 'POLICE' | 'FIRE_BRIGADE' | 'NDRF' | 'MEDICAL_TEAM';
export type VehicleStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING';
export type RouteProfile = 'driving' | 'emergency' | 'walking' | 'cycling';
export type RouteMode = 'fastest' | 'shortest' | 'safest' | 'emergency';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface RescueVehicle {
  id: number | string;
  name: string;
  vehicleType: VehicleType;
  latitude: number;
  longitude: number;
  heading?: number;
  status: VehicleStatus;
  etaMinutes: number;
  speedKmh: number;
  destination: string;
  assignedIncidentId?: number | string;
  contactPhone?: string;
  lastUpdated: string;
  onlineStatus?: 'ONLINE' | 'OFFLINE';
  currentRoad?: string;
  routeStatus?: 'ON_ROUTE' | 'REROUTED' | 'ARRIVED';
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

export interface RoadClosure {
  id: string | number;
  roadName: string;
  latitude: number;
  longitude: number;
  radius: number;
  closureReason: string;
  severity: SeverityLevel;
  status: 'ACTIVE' | 'CLEARED';
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
  duration: number; // in seconds
  name: string;
  modifier?: string;
  type?: string;
  location?: [number, number];
}

export interface AlternativeRoute {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  safetyScore: number;
  riskLevel: RiskLevel;
}

export interface RouteResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  durationSeconds: number;
  profile?: RouteProfile;
  routeMode?: RouteMode;
  safetyScore: number;
  riskLevel: RiskLevel;
  hazardWarnings: string[];
  isSafe: boolean;
  coordinates: [number, number][]; // [lng, lat]
  steps: RouteStep[];
  alternativeRoutes?: AlternativeRoute[];
  etaArrivalTime?: string; // e.g. "14:25 PM"
  currentSpeedKmh?: number;
  currentRoadName?: string;
  nextInstruction?: string;
  nextInstructionDistance?: number; // in meters
}

export interface SearchResultItem {
  id: string | number;
  type: 'HOSPITAL' | 'SHELTER' | 'INCIDENT' | 'VEHICLE' | 'PLACE';
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}
