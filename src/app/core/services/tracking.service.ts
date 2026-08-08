import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { RescueVehicle, UserLocation } from '../models/tracking.model';
import { WebSocketService } from './websocket.service';
import { GeolocationService } from './geolocation.service';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private rescueVehiclesSubject = new BehaviorSubject<RescueVehicle[]>([]);
  public rescueVehicles$: Observable<RescueVehicle[]> = this.rescueVehiclesSubject.asObservable();

  // Initial mock / seed data for live vehicles
  private mockVehicles: RescueVehicle[] = [
    {
      id: 'v-101',
      name: 'NDRF Quick Response Team 1',
      vehicleType: 'NDRF',
      latitude: 19.0790,
      longitude: 72.8850,
      status: 'EN_ROUTE',
      etaMinutes: 8,
      speedKmh: 48,
      destination: 'Sector 4 Dharavi Flood Command',
      assignedIncidentId: 101,
      contactPhone: '+91-98765-43210',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'v-102',
      name: 'City Trauma Ambulance Alpha',
      vehicleType: 'AMBULANCE',
      latitude: 19.0680,
      longitude: 72.8650,
      status: 'ON_SCENE',
      etaMinutes: 3,
      speedKmh: 0,
      destination: 'Sion Hospital Trauma Ward',
      assignedIncidentId: 102,
      contactPhone: '108',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'v-103',
      name: 'Fire Brigade Unit #4',
      vehicleType: 'FIRE_BRIGADE',
      latitude: 19.0880,
      longitude: 72.8950,
      status: 'EN_ROUTE',
      etaMinutes: 12,
      speedKmh: 52,
      destination: 'Kurla West Fire Incident',
      assignedIncidentId: 103,
      contactPhone: '101',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'v-104',
      name: 'Police Patrol Command 7',
      vehicleType: 'POLICE',
      latitude: 19.0550,
      longitude: 72.8450,
      status: 'AVAILABLE',
      etaMinutes: 5,
      speedKmh: 35,
      destination: 'Coastal Highway Patrol',
      contactPhone: '100',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'v-105',
      name: 'Mobile Medical Van Bravo',
      vehicleType: 'MEDICAL_TEAM',
      latitude: 19.0950,
      longitude: 72.8700,
      status: 'EN_ROUTE',
      etaMinutes: 15,
      speedKmh: 40,
      destination: 'Bandra Relief Camp',
      contactPhone: '+91-91234-56789',
      lastUpdated: new Date().toISOString()
    }
  ];

  private animationTimer: any = null;

  constructor(
    private wsService: WebSocketService,
    private geoService: GeolocationService
  ) {
    this.rescueVehiclesSubject.next(this.mockVehicles);
    this.subscribeToWebSocket();
    this.startMockMovementSimulation();
  }

  private subscribeToWebSocket(): void {
    this.wsService.events$.subscribe((event) => {
      if (event.event_type === 'RESCUE_LOCATION_UPDATED' || event.event_type === 'RESOURCE_ASSIGNED') {
        this.handleVehicleUpdate(event.data);
      }
    });
  }

  private handleVehicleUpdate(data: any): void {
    const current = this.rescueVehiclesSubject.value;
    const index = current.findIndex((v) => v.id === data.id || v.id === data.vehicle_id);

    if (index !== -1) {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        latitude: data.latitude ?? updated[index].latitude,
        longitude: data.longitude ?? updated[index].longitude,
        speedKmh: data.speed ?? updated[index].speedKmh,
        etaMinutes: data.eta ?? updated[index].etaMinutes,
        status: data.status ?? updated[index].status,
        lastUpdated: new Date().toISOString()
      };
      this.rescueVehiclesSubject.next(updated);
    }
  }

  public getNearestVehicle(userLoc: UserLocation): Observable<RescueVehicle | null> {
    return this.rescueVehicles$.pipe(
      map((vehicles) => {
        if (!vehicles.length) return null;

        let nearest: RescueVehicle | null = null;
        let minDistance = Infinity;

        for (const v of vehicles) {
          const dist = this.geoService.calculateDistanceKm(userLoc.latitude, userLoc.longitude, v.latitude, v.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = v;
          }
        }
        return nearest;
      })
    );
  }

  private startMockMovementSimulation(): void {
    // Subtle realistic movement simulation for demo smoothness
    this.animationTimer = setInterval(() => {
      const current = this.rescueVehiclesSubject.value;
      const updated = current.map((v) => {
        if (v.status === 'EN_ROUTE') {
          // Micro-movement delta ~ 50 meters
          const deltaLat = (Math.random() - 0.48) * 0.0006;
          const deltaLng = (Math.random() - 0.48) * 0.0006;
          return {
            ...v,
            latitude: parseFloat((v.latitude + deltaLat).toFixed(5)),
            longitude: parseFloat((v.longitude + deltaLng).toFixed(5)),
            lastUpdated: new Date().toISOString()
          };
        }
        return v;
      });
      this.rescueVehiclesSubject.next(updated);
    }, 4000);
  }
}
