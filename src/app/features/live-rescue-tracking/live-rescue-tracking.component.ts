import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  DisasterIncident,
  LayerFilterState,
  MedicalPoint,
  RescueVehicle,
  RouteResult,
  SearchResultItem,
  ShelterPoint,
  UserLocation
} from '../../core/models/tracking.model';

import {
  GeolocationService,
  IncidentService,
  MapService,
  RoutingService,
  TrackingService,
  WebSocketService
} from '../../core/services';

@Component({
  selector: 'app-live-rescue-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-rescue-tracking.component.html',
  styleUrls: ['./live-rescue-tracking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveRescueTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  public mapContainerId = 'live-rescue-map-viewport';

  // Subscriptions & Observables
  private subs = new Subscription();

  public userLocation: UserLocation | null = null;
  public rescueVehicles: RescueVehicle[] = [];
  public incidents: DisasterIncident[] = [];
  public shelters: ShelterPoint[] = [];
  public hospitals: MedicalPoint[] = [];

  public activeRoute: RouteResult | null = null;
  public isCalculatingRoute = false;

  public nearestShelter: ShelterPoint | null = null;
  public nearestHospital: MedicalPoint | null = null;
  public nearestVehicle: RescueVehicle | null = null;

  public selectedInspectorItem: { type: 'INCIDENT' | 'VEHICLE' | 'SHELTER' | 'HOSPITAL'; data: any } | null = null;

  public isMapLoaded = false;
  public mapError: string | null = null;
  public isOffline = !navigator.onLine;

  // Search State
  public searchQuery = '';
  public searchResults: SearchResultItem[] = [];

  // Layer Filter State
  public filters: LayerFilterState = {
    disasterReports: true,
    rescueTeams: true,
    hospitals: true,
    policeStations: true,
    fireStations: true,
    shelters: true,
    safeZones: true,
    dangerZones: true,
    weatherLayer: false,
    aiPredictionLayer: false,
    heatmapLayer: false,
    buildings3D: true
  };

  public isFilterPanelOpen = true;

  constructor(
    private mapService: MapService,
    private geoService: GeolocationService,
    private trackingService: TrackingService,
    private incidentService: IncidentService,
    private routingService: RoutingService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.wsService.connect();
    this.geoService.startTracking();

    window.addEventListener('online', () => { this.isOffline = false; this.cdr.markForCheck(); });
    window.addEventListener('offline', () => { this.isOffline = true; this.cdr.markForCheck(); });

    // Bind User Location
    this.subs.add(
      this.geoService.currentLocation$.subscribe((loc) => {
        if (loc) {
          this.userLocation = loc;
          this.mapService.updateUserMarker(loc);
          this.recalculateNearestPoints();
          this.cdr.markForCheck();
        }
      })
    );

    // Bind Map Loading State
    this.subs.add(
      this.mapService.isLoaded$.subscribe((loaded) => {
        this.isMapLoaded = loaded;
        if (loaded) {
          this.syncMapData();
        }
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.mapService.error$.subscribe((err) => {
        this.mapError = err;
        this.cdr.markForCheck();
      })
    );

    // Bind Rescue Vehicles
    this.subs.add(
      this.trackingService.rescueVehicles$.subscribe((vehicles) => {
        this.rescueVehicles = vehicles;
        if (this.isMapLoaded) {
          this.mapService.updateRescueVehicles(vehicles, this.filters.rescueTeams);
        }
        this.cdr.markForCheck();
      })
    );

    // Bind Disaster Incidents
    this.subs.add(
      this.incidentService.incidents$.subscribe((incidents) => {
        this.incidents = incidents;
        if (this.isMapLoaded) {
          this.mapService.updateIncidents(incidents, this.filters.disasterReports);
        }
        this.cdr.markForCheck();
      })
    );

    // Bind Shelters & Hospitals
    this.subs.add(
      combineLatest([
        this.incidentService.shelters$,
        this.incidentService.hospitals$
      ]).subscribe(([shelters, hospitals]) => {
        this.shelters = shelters;
        this.hospitals = hospitals;
        this.recalculateNearestPoints();
        this.cdr.markForCheck();
      })
    );

    // Bind Active Route
    this.subs.add(
      this.routingService.activeRoute$.subscribe((route) => {
        this.activeRoute = route;
        this.mapService.drawRoute(route);
        this.cdr.markForCheck();
      })
    );

    // Bind Map Item Selection
    this.subs.add(
      this.mapService.itemSelected$.subscribe((item) => {
        this.selectedInspectorItem = item as any;
        this.cdr.markForCheck();
      })
    );
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.mapService.initMap(this.mapContainerId);
    }, 100);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.geoService.stopTracking();
    this.wsService.disconnect();
    this.mapService.destroy();
  }

  private syncMapData(): void {
    if (this.userLocation) {
      this.mapService.updateUserMarker(this.userLocation);
    }
    this.mapService.updateRescueVehicles(this.rescueVehicles, this.filters.rescueTeams);
    this.mapService.updateIncidents(this.incidents, this.filters.disasterReports);
    this.mapService.updateLayerFilters(this.filters);
  }

  private recalculateNearestPoints(): void {
    if (!this.userLocation) return;

    this.subs.add(
      this.incidentService.getNearestShelter(this.userLocation).subscribe((s) => {
        this.nearestShelter = s;
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.incidentService.getNearestHospital(this.userLocation).subscribe((h) => {
        this.nearestHospital = h;
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.trackingService.getNearestVehicle(this.userLocation).subscribe((v) => {
        this.nearestVehicle = v;
        this.cdr.markForCheck();
      })
    );
  }

  // ── Search Handling ──
  public onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      return;
    }

    const results: SearchResultItem[] = [];

    this.hospitals.forEach((h) => {
      if (h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)) {
        results.push({ id: h.id, type: 'HOSPITAL', title: h.name, subtitle: h.address, latitude: h.latitude, longitude: h.longitude });
      }
    });

    this.shelters.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)) {
        results.push({ id: s.id, type: 'SHELTER', title: s.name, subtitle: s.address, latitude: s.latitude, longitude: s.longitude });
      }
    });

    this.incidents.forEach((i) => {
      if (i.title.toLowerCase().includes(q) || (i.address && i.address.toLowerCase().includes(q))) {
        results.push({ id: i.id, type: 'INCIDENT', title: i.title, subtitle: i.address || i.disasterType, latitude: i.latitude, longitude: i.longitude });
      }
    });

    this.searchResults = results.slice(0, 5);
  }

  public selectSearchResult(item: SearchResultItem): void {
    this.searchQuery = item.title;
    this.searchResults = [];
    this.mapService.flyTo([item.longitude, item.latitude], 16, 50);

    if (item.type === 'INCIDENT') {
      const inc = this.incidents.find((i) => i.id === item.id);
      if (inc) this.selectedInspectorItem = { type: 'INCIDENT', data: inc };
    }
  }

  // ── Route Calculation ──
  public navigateTo(destLat: number, destLng: number): void {
    const originLat = this.userLocation?.latitude || 19.0760;
    const originLng = this.userLocation?.longitude || 72.8777;

    this.routingService.calculateRoute(originLng, originLat, destLng, destLat).subscribe();
  }

  public clearRoute(): void {
    this.routingService.clearRoute();
  }

  // ── Controls Actions ──
  public recenterLocation(): void {
    if (this.userLocation) {
      this.mapService.flyTo([this.userLocation.longitude, this.userLocation.latitude], 15, 45);
    }
  }

  public zoomIn(): void { this.mapService.zoomIn(); }
  public zoomOut(): void { this.mapService.zoomOut(); }
  public resetNorth(): void { this.mapService.resetNorth(); }

  public toggleFilter(key: keyof LayerFilterState): void {
    this.filters[key] = !this.filters[key];
    this.mapService.updateLayerFilters(this.filters);
    this.syncMapData();
  }

  public triggerEmergencySOS(): void {
    alert('🚨 EMERGENCY SOS DISPATCH TRIGGERED! Your live GPS coordinates have been broadcast to regional first responders.');
  }

  public closeInspector(): void {
    this.selectedInspectorItem = null;
  }
}
