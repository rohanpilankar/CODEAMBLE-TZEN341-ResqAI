import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserLocation } from '../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentLocationSubject = new BehaviorSubject<UserLocation | null>(null);
  public currentLocation$: Observable<UserLocation | null> = this.currentLocationSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();

  private isTrackingSubject = new BehaviorSubject<boolean>(false);
  public isTracking$: Observable<boolean> = this.isTrackingSubject.asObservable();

  private watchId: number | null = null;

  // Default fallback center (Mumbai, India)
  private readonly defaultLocation: UserLocation = {
    latitude: 19.0760,
    longitude: 72.8777,
    accuracy: 100,
    heading: 0,
    speed: 0,
    timestamp: Date.now()
  };

  constructor(private ngZone: NgZone) {}

  public startTracking(): void {
    if (this.watchId !== null) return;

    if (!navigator.geolocation) {
      this.setError('Geolocation is not supported by your browser.');
      this.currentLocationSubject.next(this.defaultLocation);
      return;
    }

    this.isTrackingSubject.next(true);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos: GeolocationPosition) => {
        this.ngZone.run(() => {
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp
          };
          this.currentLocationSubject.next(loc);
          this.errorSubject.next(null);
        });
      },
      (err: GeolocationPositionError) => {
        this.ngZone.run(() => {
          let errorMsg = 'Failed to acquire GPS location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'GPS permission denied by user. Showing default region.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }
          this.setError(errorMsg);
          if (!this.currentLocationSubject.value) {
            this.currentLocationSubject.next(this.defaultLocation);
          }
        });
      },
      options
    );
  }

  public stopTracking(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTrackingSubject.next(false);
    }
  }

  public getCurrentPosition(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(this.defaultLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp
          };
          this.currentLocationSubject.next(loc);
          resolve(loc);
        },
        (err) => {
          resolve(this.defaultLocation);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  private setError(msg: string): void {
    this.errorSubject.next(msg);
  }

  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
}
