import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { DisasterIncident, ShelterPoint, MedicalPoint, UserLocation } from '../models/tracking.model';
import { GeolocationService } from './geolocation.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private incidentsSubject = new BehaviorSubject<DisasterIncident[]>([]);
  public incidents$: Observable<DisasterIncident[]> = this.incidentsSubject.asObservable();

  private sheltersSubject = new BehaviorSubject<ShelterPoint[]>([]);
  public shelters$: Observable<ShelterPoint[]> = this.sheltersSubject.asObservable();

  private hospitalsSubject = new BehaviorSubject<MedicalPoint[]>([]);
  public hospitals$: Observable<MedicalPoint[]> = this.hospitalsSubject.asObservable();

  private mockIncidents: DisasterIncident[] = [
    {
      id: 201,
      title: 'Sector 4 Flash Flood & Evacuation Alert',
      description: 'Rising water levels reaching chest height near main market square. Rescue teams deployed.',
      disasterType: 'Flood',
      severity: 'CRITICAL',
      status: 'IN_PROGRESS',
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Dharavi Sector 4, Central Command Area',
      phoneNumber: '+91-98765-11111',
      peopleAffected: 45,
      mediaUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop',
      images: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop'],
      isAiVerified: true,
      confidenceScore: 0.96,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 202,
      title: 'Residential Structural Collapse Hazard',
      description: 'Wall collapse reported after heavy downpour. First responders on scene.',
      disasterType: 'Landslide',
      severity: 'HIGH',
      status: 'VERIFIED',
      latitude: 19.0850,
      longitude: 72.8900,
      address: 'Kurla West, Pipe Road Junction',
      phoneNumber: '+91-98765-22222',
      peopleAffected: 12,
      mediaUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=600&auto=format&fit=crop',
      images: ['https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=600&auto=format&fit=crop'],
      isAiVerified: true,
      confidenceScore: 0.91,
      createdAt: new Date(Date.now() - 45 * 60000).toISOString()
    },
    {
      id: 203,
      title: 'Substation Transformer Fire Spark',
      description: 'Transformer fire caused power outage in 3 blocks. Fire brigade dispatched.',
      disasterType: 'Fire',
      severity: 'MEDIUM',
      status: 'REPORTED',
      latitude: 19.0600,
      longitude: 72.8500,
      address: 'Bandra Reclamation Colony',
      phoneNumber: '+91-98765-33333',
      peopleAffected: 5,
      mediaUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop',
      images: ['https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop'],
      isAiVerified: true,
      confidenceScore: 0.85,
      createdAt: new Date(Date.now() - 90 * 60000).toISOString()
    }
  ];

  private mockShelters: ShelterPoint[] = [
    {
      id: 301,
      name: 'Central Municipal Relief Shelter',
      address: 'Dr. MG Road Campus, Dharavi',
      latitude: 19.0710,
      longitude: 72.8700,
      totalCapacity: 500,
      currentOccupancy: 180,
      availableBeds: 320,
      contactPhone: '+91-1800-222-001',
      medicalAvailable: true,
      foodAvailable: true,
      waterAvailable: true
    },
    {
      id: 302,
      name: 'St. Xavier School High Ground Safe Zone',
      address: 'Hill Road, Bandra West',
      latitude: 19.0550,
      longitude: 72.8350,
      totalCapacity: 300,
      currentOccupancy: 45,
      availableBeds: 255,
      contactPhone: '+91-1800-222-002',
      medicalAvailable: true,
      foodAvailable: true,
      waterAvailable: true
    }
  ];

  private mockHospitals: MedicalPoint[] = [
    {
      id: 401,
      name: 'Lokmanya Tilak General Hospital (Sion)',
      address: 'Sion Circle, Sion East',
      latitude: 19.0360,
      longitude: 72.8600,
      phone: '022-24076381',
      icuBeds: 18,
      availableBeds: 42
    },
    {
      id: 402,
      name: 'KEM Hospital & Emergency Trauma Center',
      address: 'Acharya Donde Marg, Parel',
      latitude: 19.0020,
      longitude: 72.8420,
      phone: '022-24107000',
      icuBeds: 25,
      availableBeds: 60
    }
  ];

  constructor(
    private geoService: GeolocationService,
    private wsService: WebSocketService
  ) {
    this.incidentsSubject.next(this.mockIncidents);
    this.sheltersSubject.next(this.mockShelters);
    this.hospitalsSubject.next(this.mockHospitals);
    this.subscribeToWebSocket();
  }

  private subscribeToWebSocket(): void {
    this.wsService.events$.subscribe((event) => {
      if (event.event_type === 'INCIDENT_CREATED' && event.data) {
        this.addOrUpdateIncident(event.data);
      } else if (event.event_type === 'INCIDENT_UPDATED' && event.data) {
        this.addOrUpdateIncident(event.data);
      }
    });
  }

  private addOrUpdateIncident(raw: any): void {
    const current = this.incidentsSubject.value;
    const index = current.findIndex((i) => i.id === raw.id);

    const formatted: DisasterIncident = {
      id: raw.id,
      title: raw.title || 'Emergency Incident',
      description: raw.description || '',
      disasterType: raw.disaster_type || 'General',
      severity: (raw.severity as any) || 'MEDIUM',
      status: raw.status || 'REPORTED',
      latitude: raw.latitude,
      longitude: raw.longitude,
      address: raw.address,
      peopleAffected: raw.people_affected || 1,
      mediaUrl: raw.media_url,
      isAiVerified: raw.is_ai_verified ?? true,
      confidenceScore: raw.ai_confidence_score || 0.90,
      createdAt: raw.created_at || new Date().toISOString()
    };

    if (index !== -1) {
      const updated = [...current];
      updated[index] = { ...updated[index], ...formatted };
      this.incidentsSubject.next(updated);
    } else {
      this.incidentsSubject.next([formatted, ...current]);
    }
  }

  public getNearestShelter(userLoc: UserLocation): Observable<ShelterPoint | null> {
    return this.shelters$.pipe(
      map((shelters) => {
        if (!shelters.length) return null;
        let nearest: ShelterPoint | null = null;
        let minDist = Infinity;

        for (const s of shelters) {
          const dist = this.geoService.calculateDistanceKm(userLoc.latitude, userLoc.longitude, s.latitude, s.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearest = { ...s, distanceKm: dist };
          }
        }
        return nearest;
      })
    );
  }

  public getNearestHospital(userLoc: UserLocation): Observable<MedicalPoint | null> {
    return this.hospitals$.pipe(
      map((hospitals) => {
        if (!hospitals.length) return null;
        let nearest: MedicalPoint | null = null;
        let minDist = Infinity;

        for (const h of hospitals) {
          const dist = this.geoService.calculateDistanceKm(userLoc.latitude, userLoc.longitude, h.latitude, h.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearest = { ...h, distanceKm: dist };
          }
        }
        return nearest;
      })
    );
  }
}
