import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import {
  RouteMode,
  RouteProfile,
  RouteResult,
  RouteStep,
  UserLocation
} from '../models/tracking.model';

export interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  progressPercent: number; // 0 to 100
  currentIndex: number;
  totalPoints: number;
  currentSpeedKmh: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private activeRouteSubject = new BehaviorSubject<RouteResult | null>(null);
  public activeRoute$: Observable<RouteResult | null> = this.activeRouteSubject.asObservable();

  private isCalculatingSubject = new BehaviorSubject<boolean>(false);
  public isCalculating$: Observable<boolean> = this.isCalculatingSubject.asObservable();

  private routingErrorSubject = new BehaviorSubject<string | null>(null);
  public routingError$: Observable<string | null> = this.routingErrorSubject.asObservable();

  // Simulation State Observables
  private simulationStateSubject = new BehaviorSubject<SimulationState>({
    isPlaying: false,
    isPaused: false,
    progressPercent: 0,
    currentIndex: 0,
    totalPoints: 0,
    currentSpeedKmh: 45
  });
  public simulationState$: Observable<SimulationState> = this.simulationStateSubject.asObservable();

  private simulatedUserLocationSubject = new BehaviorSubject<UserLocation | null>(null);
  public simulatedUserLocation$: Observable<UserLocation | null> = this.simulatedUserLocationSubject.asObservable();

  // In-memory route caching & local storage cache key prefix
  private routeCache = new Map<string, RouteResult>();
  private readonly localStorageCacheKey = 'resqai_cached_routes_v1';

  // FastAPI backend routing endpoint & direct OSRM fallback URL
  private readonly backendRouteUrl = 'http://localhost:8000/api/v1/route';
  private readonly osrmDirectUrl = 'https://router.project-osrm.org/route/v1/driving';

  private lastCalculatedOrigin: [number, number] | null = null;
  private simTimer: any = null;

  constructor(private http: HttpClient) {
    this.loadLocalStorageCache();
  }

  public calculateRoute(
    originLng: number,
    originLat: number,
    destLng: number,
    destLat: number,
    profile: RouteProfile = 'driving',
    routeMode: RouteMode = 'fastest'
  ): Observable<RouteResult> {
    const cacheKey = `${originLng.toFixed(4)},${originLat.toFixed(4)};${destLng.toFixed(4)},${destLat.toFixed(4)};${profile};${routeMode}`;
    
    if (this.routeCache.has(cacheKey)) {
      const cached = this.routeCache.get(cacheKey)!;
      console.log(`[RoutingService] Cache HIT for key ${cacheKey}. Rendered road coordinates count: ${cached.coordinates.length}`);
      this.lastCalculatedOrigin = [originLng, originLat];
      this.activeRouteSubject.next(cached);
      this.routingErrorSubject.next(null);
      return of(cached);
    }

    this.isCalculatingSubject.next(true);

    const params = new HttpParams()
      .set('startLat', originLat.toString())
      .set('startLng', originLng.toString())
      .set('endLat', destLat.toString())
      .set('endLng', destLng.toString())
      .set('profile', profile)
      .set('routeMode', routeMode);

    console.log(`[RoutingService] Requesting FastAPI route: ${this.backendRouteUrl} with params:`, {
      startLat: originLat,
      startLng: originLng,
      endLat: destLat,
      endLng: destLng,
      profile,
      routeMode
    });

    return this.http.get<any>(this.backendRouteUrl, { params }).pipe(
      map((res) => {
        this.isCalculatingSubject.next(false);
        if (res && res.success && res.data) {
          const r = res.data;
          const coords: [number, number][] = r.geometry?.coordinates || [];

          console.log(`[RoutingService] Backend API response received. Extracted ${coords.length} OSRM road coordinates.`);

          if (coords.length <= 2) {
            console.error(`[RoutingService] ERROR: Backend returned <= 2 coordinates. Rejecting straight-line route.`);
            throw new Error('Unable to calculate road route. Insufficient road geometry returned by engine.');
          }

          const eta = this.computeArrivalTime(r.duration_minutes || 0);

          const result: RouteResult = {
            distanceKm: r.distance_km,
            distanceMeters: r.distance_meters,
            durationMinutes: r.duration_minutes,
            durationSeconds: r.duration_seconds,
            profile: r.profile || profile,
            routeMode: r.route_mode || routeMode,
            safetyScore: r.safety_score ?? 95,
            riskLevel: r.risk_level || 'LOW',
            hazardWarnings: r.hazard_warnings || [],
            isSafe: r.is_safe ?? true,
            coordinates: coords,
            steps: (r.steps || []).map((s: any) => ({
              instruction: s.instruction,
              distance: s.distance,
              duration: s.duration,
              name: s.name,
              modifier: s.modifier,
              type: s.type,
              location: s.location
            })),
            alternativeRoutes: r.alternative_routes || [],
            etaArrivalTime: eta,
            currentSpeedKmh: 45,
            currentRoadName: r.steps?.[0]?.name || 'Main Corridor',
            nextInstruction: r.steps?.[0]?.instruction || 'Proceed on route',
            nextInstructionDistance: r.steps?.[0]?.distance || 0
          };

          this.routeCache.set(cacheKey, result);
          this.saveLocalStorageCache(cacheKey, result);
          this.lastCalculatedOrigin = [originLng, originLat];
          this.activeRouteSubject.next(result);
          this.routingErrorSubject.next(null);
          return result;
        }
        throw new Error('Unable to calculate road route. Invalid response payload from backend.');
      }),
      catchError((err) => {
        console.warn('[RoutingService] Backend endpoint error, attempting OSRM direct fallback:', err);
        return this.fetchDirectOSRM(originLng, originLat, destLng, destLat, cacheKey, profile, routeMode);
      })
    );
  }

  private fetchDirectOSRM(
    originLng: number,
    originLat: number,
    destLng: number,
    destLat: number,
    cacheKey: string,
    profile: RouteProfile,
    routeMode: RouteMode
  ): Observable<RouteResult> {
    const coordsParam = `${originLng},${originLat};${destLng},${destLat}`;
    const url = `${this.osrmDirectUrl}/${coordsParam}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    console.log(`[RoutingService] Direct OSRM Fallback Query: ${url}`);

    return this.http.get<any>(url).pipe(
      map((res) => {
        this.isCalculatingSubject.next(false);
        if (res && res.routes && res.routes.length > 0) {
          const route = res.routes[0];
          const coords: [number, number][] = route.geometry?.coordinates || [];

          console.log(`[RoutingService] OSRM Direct returned ${coords.length} road coordinates.`);

          if (coords.length <= 2) {
            console.error('[RoutingService] Direct OSRM returned <= 2 coordinates. Rejecting straight line.');
            throw new Error('Unable to calculate road route.');
          }

          const distKm = parseFloat((route.distance / 1000).toFixed(2));
          const durMin = Math.round(route.duration / 60);
          const eta = this.computeArrivalTime(durMin);

          const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((step: any) => ({
            instruction: step.maneuver?.instruction || step.name || 'Follow road corridor',
            distance: Math.round(step.distance),
            duration: Math.round(step.duration),
            name: step.name || 'OpenStreetMap Road',
            modifier: step.maneuver?.modifier || 'straight',
            type: step.maneuver?.type || 'turn'
          }));

          const result: RouteResult = {
            distanceKm: distKm,
            distanceMeters: Math.round(route.distance),
            durationMinutes: durMin,
            durationSeconds: Math.round(route.duration),
            profile,
            routeMode,
            safetyScore: 90,
            riskLevel: 'LOW',
            hazardWarnings: [],
            isSafe: true,
            coordinates: coords,
            steps,
            etaArrivalTime: eta,
            currentSpeedKmh: 40,
            currentRoadName: steps[0]?.name || 'OpenStreetMap Corridor',
            nextInstruction: steps[0]?.instruction || 'Proceed on road',
            nextInstructionDistance: steps[0]?.distance || 0
          };

          this.routeCache.set(cacheKey, result);
          this.saveLocalStorageCache(cacheKey, result);
          this.lastCalculatedOrigin = [originLng, originLat];
          this.activeRouteSubject.next(result);
          this.routingErrorSubject.next(null);
          return result;
        }
        throw new Error('Unable to calculate road route.');
      }),
      catchError((osrmErr) => {
        this.isCalculatingSubject.next(false);
        const localCached = this.getLocalStorageCacheItem(cacheKey);
        if (localCached && localCached.coordinates.length > 2) {
          console.info('[RoutingService] Offline mode: loaded cached route from localStorage.');
          this.activeRouteSubject.next(localCached);
          this.routingErrorSubject.next('Live routing server unreachable. Displaying cached road route.');
          return of(localCached);
        }

        const errMsg = 'Unable to calculate road route.';
        this.routingErrorSubject.next(errMsg);
        this.activeRouteSubject.next(null);
        throw new Error(errMsg);
      })
    );
  }

  // ── Dynamic Rerouting Threshold (> 25 meters movement) ──
  public shouldTriggerReroute(newLng: number, newLat: number): boolean {
    if (!this.lastCalculatedOrigin) return true;
    const distMeters = this.haversineMeters(this.lastCalculatedOrigin[1], this.lastCalculatedOrigin[0], newLat, newLng);
    return distMeters > 25;
  }

  // ── Simulation Controller ──
  public startSimulation(): void {
    const route = this.activeRouteSubject.value;
    if (!route || !route.coordinates || route.coordinates.length <= 2) return;

    this.stopSimulation();

    const coords = route.coordinates;
    let idx = 0;
    const speed = 50; // km/h

    this.simulationStateSubject.next({
      isPlaying: true,
      isPaused: false,
      progressPercent: 0,
      currentIndex: 0,
      totalPoints: coords.length,
      currentSpeedKmh: speed
    });

    this.simTimer = setInterval(() => {
      if (idx >= coords.length) {
        this.stopSimulation();
        return;
      }

      const point = coords[idx];
      const lng = point[0];
      const lat = point[1];

      let heading = 0;
      if (idx < coords.length - 1) {
        const nextPt = coords[idx + 1];
        heading = this.calculateHeading(lat, lng, nextPt[1], nextPt[0]);
      }

      this.simulatedUserLocationSubject.next({
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        heading,
        speed: speed / 3.6, // m/s
        timestamp: Date.now()
      });

      const pct = Math.round((idx / (coords.length - 1)) * 100);
      this.simulationStateSubject.next({
        isPlaying: true,
        isPaused: false,
        progressPercent: pct,
        currentIndex: idx,
        totalPoints: coords.length,
        currentSpeedKmh: speed
      });

      idx++;
    }, 300);
  }

  public pauseSimulation(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
      const current = this.simulationStateSubject.value;
      this.simulationStateSubject.next({
        ...current,
        isPlaying: false,
        isPaused: true
      });
    }
  }

  public resumeSimulation(): void {
    const current = this.simulationStateSubject.value;
    if (current.isPaused) {
      this.startSimulationFromIndex(current.currentIndex);
    }
  }

  private startSimulationFromIndex(startIndex: number): void {
    const route = this.activeRouteSubject.value;
    if (!route || !route.coordinates || route.coordinates.length <= 2) return;

    this.stopSimulation();
    const coords = route.coordinates;
    let idx = startIndex;
    const speed = 50;

    this.simTimer = setInterval(() => {
      if (idx >= coords.length) {
        this.stopSimulation();
        return;
      }

      const point = coords[idx];
      const lng = point[0];
      const lat = point[1];

      let heading = 0;
      if (idx < coords.length - 1) {
        const nextPt = coords[idx + 1];
        heading = this.calculateHeading(lat, lng, nextPt[1], nextPt[0]);
      }

      this.simulatedUserLocationSubject.next({
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        heading,
        speed: speed / 3.6,
        timestamp: Date.now()
      });

      const pct = Math.round((idx / (coords.length - 1)) * 100);
      this.simulationStateSubject.next({
        isPlaying: true,
        isPaused: false,
        progressPercent: pct,
        currentIndex: idx,
        totalPoints: coords.length,
        currentSpeedKmh: speed
      });

      idx++;
    }, 300);
  }

  public resetSimulation(): void {
    this.stopSimulation();
    this.simulatedUserLocationSubject.next(null);
  }

  public stopSimulation(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.simulationStateSubject.next({
      isPlaying: false,
      isPaused: false,
      progressPercent: 0,
      currentIndex: 0,
      totalPoints: 0,
      currentSpeedKmh: 0
    });
  }

  public clearRoute(): void {
    this.stopSimulation();
    this.lastCalculatedOrigin = null;
    this.activeRouteSubject.next(null);
    this.routingErrorSubject.next(null);
  }

  // ── Helper Utilities ──
  private computeArrivalTime(durationMinutes: number): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMinutes);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private haversineMeters(lat1: float, lon1: float, lat2: float, lon2: float): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
    const x =
      Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
      Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
  }

  private saveLocalStorageCache(key: string, route: RouteResult): void {
    try {
      const raw = localStorage.getItem(this.localStorageCacheKey);
      const cacheMap = raw ? JSON.parse(raw) : {};
      cacheMap[key] = { route, savedAt: Date.now() };
      localStorage.setItem(this.localStorageCacheKey, JSON.stringify(cacheMap));
    } catch (e) {
      console.warn('[RoutingService] Failed to save route to localStorage:', e);
    }
  }

  private loadLocalStorageCache(): void {
    try {
      const raw = localStorage.getItem(this.localStorageCacheKey);
      if (raw) {
        const cacheMap = JSON.parse(raw);
        Object.keys(cacheMap).forEach((k) => {
          if (Date.now() - cacheMap[k].savedAt < 86400000) {
            this.routeCache.set(k, cacheMap[k].route);
          }
        });
      }
    } catch (e) {
      console.warn('[RoutingService] Failed to load localStorage route cache:', e);
    }
  }

  private getLocalStorageCacheItem(key: string): RouteResult | null {
    try {
      const raw = localStorage.getItem(this.localStorageCacheKey);
      if (raw) {
        const cacheMap = JSON.parse(raw);
        if (cacheMap[key]) return cacheMap[key].route;
      }
    } catch (e) {}
    return null;
  }
}
type float = number;
