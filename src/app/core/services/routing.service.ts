import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs';
import { RouteResult, RouteStep } from '../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private activeRouteSubject = new BehaviorSubject<RouteResult | null>(null);
  public activeRoute$: Observable<RouteResult | null> = this.activeRouteSubject.asObservable();

  private isCalculatingSubject = new BehaviorSubject<boolean>(false);
  public isCalculating$: Observable<boolean> = this.isCalculatingSubject.asObservable();

  // Primary public OSRM Endpoint with fallback to direct Haversine interpolation
  private readonly osrmBaseUrl = 'https://router.project-osrm.org/route/v1/driving';

  constructor(private http: HttpClient) {}

  public calculateRoute(
    originLng: number,
    originLat: number,
    destLng: number,
    destLat: number
  ): Observable<RouteResult> {
    this.isCalculatingSubject.next(true);

    const coordsParam = `${originLng},${originLat};${destLng},${destLat}`;
    const url = `${this.osrmBaseUrl}/${coordsParam}?overview=full&geometries=geojson&steps=true`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        this.isCalculatingSubject.next(false);
        if (res && res.routes && res.routes.length > 0) {
          const route = res.routes[0];
          const distKm = parseFloat((route.distance / 1000).toFixed(2));
          const durMin = Math.round(route.duration / 60);

          const geometryCoordinates: [number, number][] = route.geometry.coordinates; // [lng, lat]

          const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((step: any) => ({
            instruction: step.maneuver?.instruction || step.name || 'Proceed along designated route',
            distance: Math.round(step.distance),
            name: step.name || 'Emergency Corridor'
          }));

          const result: RouteResult = {
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: geometryCoordinates,
            steps: steps.length ? steps : [
              { instruction: 'Depart starting position', distance: Math.round(route.distance * 0.3), name: 'Origin' },
              { instruction: 'Follow emergency evacuation corridor', distance: Math.round(route.distance * 0.7), name: 'Safe Path' },
              { instruction: 'Arrive safely at destination', distance: 0, name: 'Target Destination' }
            ]
          };

          this.activeRouteSubject.next(result);
          return result;
        }

        // If OSRM returns empty routes, fall back to straight line path
        return this.createFallbackRoute(originLng, originLat, destLng, destLat);
      }),
      catchError((err) => {
        this.isCalculatingSubject.next(false);
        console.warn('[RoutingService] OSRM Service unavailable, using fallback route interpolation:', err);
        const fallback = this.createFallbackRoute(originLng, originLat, destLng, destLat);
        this.activeRouteSubject.next(fallback);
        return of(fallback);
      })
    );
  }

  public clearRoute(): void {
    this.activeRouteSubject.next(null);
  }

  private createFallbackRoute(
    originLng: number,
    originLat: number,
    destLng: number,
    destLat: number
  ): RouteResult {
    // Generate 10 interpolated intermediate waypoints for smooth line drawing
    const numPoints = 12;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const lng = originLng + (destLng - originLng) * fraction;
      const lat = originLat + (destLat - originLat) * fraction;
      coordinates.push([lng, lat]);
    }

    const distKm = this.haversineDistance(originLat, originLng, destLat, destLng);
    const durMin = Math.max(1, Math.round(distKm * 2.5)); // ~ 24 km/h emergency speed

    return {
      distanceKm: distKm,
      durationMinutes: durMin,
      coordinates: coordinates,
      steps: [
        { instruction: 'Head towards destination on direct safe corridor', distance: Math.round(distKm * 500), name: 'Emergency Path' },
        { instruction: 'Arrive at destination', distance: Math.round(distKm * 500), name: 'Destination' }
      ]
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
}
