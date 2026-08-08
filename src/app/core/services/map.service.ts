import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DisasterIncident,
  LayerFilterState,
  MedicalPoint,
  RescueVehicle,
  RouteResult,
  ShelterPoint,
  UserLocation
} from '../models/tracking.model';

declare var maplibregl: any;

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private mapInstance: any = null;
  private isLoadedSubject = new BehaviorSubject<boolean>(false);
  public isLoaded$: Observable<boolean> = this.isLoadedSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();

  public itemSelected$ = new Subject<{ type: string; data: any }>();

  private userMarker: any = null;
  private vehicleMarkers: Map<string | number, any> = new Map();
  private incidentMarkers: Map<string | number, any> = new Map();

  private defaultCenter: [number, number] = [72.8777, 19.0760]; // [lng, lat]
  private defaultStyle = `https://api.maptiler.com/maps/streets-v4/style.json?key=${environment.mapTilerApiKey}`;

  constructor(private ngZone: NgZone) {}

  public async initMap(containerId: string): Promise<void> {
    try {
      await this.ensureMapLibreLoaded();

      const el = document.getElementById(containerId);
      if (!el) {
        throw new Error(`Map container element #${containerId} not found.`);
      }

      if (this.mapInstance) {
        this.mapInstance.remove();
        this.mapInstance = null;
      }

      this.mapInstance = new maplibregl.Map({
        container: containerId,
        style: this.defaultStyle,
        center: this.defaultCenter,
        zoom: 12,
        pitch: 45,
        bearing: -17.6,
        antialias: true,
        attributionControl: false
      });

      this.mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      this.mapInstance.on('load', () => {
        this.ngZone.run(() => {
          this.setup3DBuildings();
          this.setupSourcesAndLayers();
          this.isLoadedSubject.next(true);
          this.errorSubject.next(null);
        });
      });

      this.mapInstance.on('error', (e: any) => {
        this.ngZone.run(() => {
          console.warn('[MapService] MapLibre error notice:', e);
          if (e && e.error && e.error.status === 401) {
            this.errorSubject.next('MapTiler API Key unauthorized or invalid origin.');
          }
        });
      });
    } catch (err: any) {
      this.errorSubject.next(err?.message || 'Failed to initialize MapLibre GL engine.');
    }
  }

  private ensureMapLibreLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof maplibregl !== 'undefined') {
        resolve();
        return;
      }

      // Dynamically load MapLibre CSS & JS if missing
      const cssId = 'maplibre-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      const scriptId = 'maplibre-js';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MapLibre GL JS script from CDN.'));
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (typeof maplibregl !== 'undefined') {
            clearInterval(interval);
            resolve();
          }
        }, 50);
      }
    });
  }

  private setup3DBuildings(): void {
    if (!this.mapInstance) return;
    const layers = this.mapInstance.getStyle().layers;
    let labelLayerId: string | undefined;

    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    if (!this.mapInstance.getLayer('3d-buildings')) {
      this.mapInstance.addLayer(
        {
          id: '3d-buildings',
          source: 'maptiler_planet',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'render_height'],
              0, '#1e293b',
              20, '#334155',
              50, '#0284c7'
            ],
            'fill-extrusion-height': ['get', 'render_height'],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.65
          }
        },
        labelLayerId
      );
    }
  }

  private setupSourcesAndLayers(): void {
    if (!this.mapInstance) return;

    // Heatmap Source & Layer
    if (!this.mapInstance.getSource('incidents-heatmap-src')) {
      this.mapInstance.addSource('incidents-heatmap-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.mapInstance.addLayer({
        id: 'incidents-heatmap-layer',
        type: 'heatmap',
        source: 'incidents-heatmap-src',
        maxzoom: 15,
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.5,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.2, 'rgb(0, 255, 255)',
            0.4, 'rgb(0, 255, 0)',
            0.6, 'rgb(255, 255, 0)',
            0.8, 'rgb(255, 128, 0)',
            1, 'rgb(255, 0, 0)'
          ],
          'heatmap-radius': 30,
          'heatmap-opacity': 0.75
        }
      });
    }

    // Safe & Danger Zone Sources
    if (!this.mapInstance.getSource('danger-zones-src')) {
      this.mapInstance.addSource('danger-zones-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Dharavi Coastal Surge Hazard Zone' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [72.868, 19.070], [72.885, 19.070], [72.885, 19.082], [72.868, 19.082], [72.868, 19.070]
                ]]
              }
            }
          ]
        }
      });

      this.mapInstance.addLayer({
        id: 'danger-zones-layer',
        type: 'fill',
        source: 'danger-zones-src',
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.2,
          'fill-outline-color': '#dc2626'
        }
      });
    }

    // Route Polyline Source & Layer
    if (!this.mapInstance.getSource('route-line-src')) {
      this.mapInstance.addSource('route-line-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.mapInstance.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line-src',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 6,
          'line-opacity': 0.95
        }
      });
    }
  }

  // ── Animated User Location Marker ──
  public updateUserMarker(userLoc: UserLocation): void {
    if (!this.mapInstance || !typeof maplibregl) return;

    const el = document.createElement('div');
    el.className = 'citizen-user-marker';
    el.innerHTML = `
      <div class="user-pulse-ring"></div>
      <div class="user-core-dot"></div>
      ${userLoc.heading ? `<div class="user-heading-arrow" style="transform: rotate(${userLoc.heading}deg);">▲</div>` : ''}
    `;

    if (this.userMarker) {
      this.userMarker.setLngLat([userLoc.longitude, userLoc.latitude]);
    } else {
      this.userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([userLoc.longitude, userLoc.latitude])
        .addTo(this.mapInstance);
    }
  }

  // ── Rescue Vehicles Markers ──
  public updateRescueVehicles(vehicles: RescueVehicle[], visible: boolean = true): void {
    if (!this.mapInstance) return;

    if (!visible) {
      this.vehicleMarkers.forEach((m) => m.remove());
      this.vehicleMarkers.clear();
      return;
    }

    const currentIds = new Set(vehicles.map((v) => v.id));

    // Remove stale vehicle markers
    this.vehicleMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        this.vehicleMarkers.delete(id);
      }
    });

    vehicles.forEach((v) => {
      let iconClass = 'fa-truck-medical text-danger';
      if (v.vehicleType === 'AMBULANCE') iconClass = 'fa-ambulance text-danger';
      if (v.vehicleType === 'POLICE') iconClass = 'fa-shield-halved text-info';
      if (v.vehicleType === 'FIRE_BRIGADE') iconClass = 'fa-fire-extinguisher text-warning';
      if (v.vehicleType === 'NDRF') iconClass = 'fa-helicopter text-primary';

      if (this.vehicleMarkers.has(v.id)) {
        const existingMarker = this.vehicleMarkers.get(v.id);
        existingMarker.setLngLat([v.longitude, v.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'rescue-vehicle-marker';
        el.innerHTML = `
          <div class="vehicle-icon-wrap">
            <i class="fa ${iconClass}"></i>
          </div>
          <div class="vehicle-label">${v.name.split(' ')[0]}</div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.ngZone.run(() => {
            this.itemSelected$.next({ type: 'VEHICLE', data: v });
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .addTo(this.mapInstance);

        this.vehicleMarkers.set(v.id, marker);
      }
    });
  }

  // ── Incidents Markers & Heatmap ──
  public updateIncidents(incidents: DisasterIncident[], visible: boolean = true): void {
    if (!this.mapInstance) return;

    if (!visible) {
      this.incidentMarkers.forEach((m) => m.remove());
      this.incidentMarkers.clear();
      return;
    }

    const currentIds = new Set(incidents.map((i) => i.id));
    this.incidentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        this.incidentMarkers.delete(id);
      }
    });

    // Heatmap GeoJSON features
    const heatmapFeatures = incidents.map((inc) => ({
      type: 'Feature',
      properties: {
        weight: inc.severity === 'CRITICAL' ? 1.0 : inc.severity === 'HIGH' ? 0.75 : 0.4
      },
      geometry: {
        type: 'Point',
        coordinates: [inc.longitude, inc.latitude]
      }
    }));

    const heatSrc = this.mapInstance.getSource('incidents-heatmap-src');
    if (heatSrc) {
      heatSrc.setData({ type: 'FeatureCollection', features: heatmapFeatures });
    }

    incidents.forEach((inc) => {
      let sevClass = 'sev-low';
      if (inc.severity === 'CRITICAL') sevClass = 'sev-critical';
      if (inc.severity === 'HIGH') sevClass = 'sev-high';
      if (inc.severity === 'MEDIUM') sevClass = 'sev-medium';

      if (!this.incidentMarkers.has(inc.id)) {
        const el = document.createElement('div');
        el.className = `disaster-incident-marker ${sevClass}`;
        el.innerHTML = `
          <div class="incident-pin-core">
            <i class="fa fa-triangle-exclamation"></i>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.ngZone.run(() => {
            this.itemSelected$.next({ type: 'INCIDENT', data: inc });
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([inc.longitude, inc.latitude])
          .addTo(this.mapInstance);

        this.incidentMarkers.set(inc.id, marker);
      } else {
        this.incidentMarkers.get(inc.id).setLngLat([inc.longitude, inc.latitude]);
      }
    });
  }

  // ── Render OSRM Route ──
  public drawRoute(route: RouteResult | null): void {
    if (!this.mapInstance) return;
    const src = this.mapInstance.getSource('route-line-src');
    if (!src) return;

    if (!route || !route.coordinates.length) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    src.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates
          }
        }
      ]
    });

    // Fit map bounds smoothly around route
    const bounds = new maplibregl.LngLatBounds();
    route.coordinates.forEach((coord) => bounds.extend(coord));
    this.mapInstance.fitBounds(bounds, { padding: 90, maxZoom: 16 });
  }

  // ── Layer Toggles ──
  public updateLayerFilters(filters: LayerFilterState): void {
    if (!this.mapInstance) return;

    if (this.mapInstance.getLayer('3d-buildings')) {
      this.mapInstance.setLayoutProperty(
        '3d-buildings',
        'visibility',
        filters.buildings3D ? 'visible' : 'none'
      );
    }

    if (this.mapInstance.getLayer('incidents-heatmap-layer')) {
      this.mapInstance.setLayoutProperty(
        'incidents-heatmap-layer',
        'visibility',
        filters.heatmapLayer ? 'visible' : 'none'
      );
    }

    if (this.mapInstance.getLayer('danger-zones-layer')) {
      this.mapInstance.setLayoutProperty(
        'danger-zones-layer',
        'visibility',
        filters.dangerZones ? 'visible' : 'none'
      );
    }
  }

  // ── Controls & Actions ──
  public flyTo(center: [number, number], zoom: number = 15, pitch: number = 45): void {
    if (this.mapInstance) {
      this.mapInstance.flyTo({
        center,
        zoom,
        pitch,
        essential: true,
        duration: 1800
      });
    }
  }

  public zoomIn(): void {
    if (this.mapInstance) this.mapInstance.zoomIn();
  }

  public zoomOut(): void {
    if (this.mapInstance) this.mapInstance.zoomOut();
  }

  public resetNorth(): void {
    if (this.mapInstance) this.mapInstance.resetNorthPitch();
  }

  public resize(): void {
    if (this.mapInstance) {
      requestAnimationFrame(() => this.mapInstance.resize());
    }
  }

  public destroy(): void {
    this.vehicleMarkers.forEach((m) => m.remove());
    this.vehicleMarkers.clear();
    this.incidentMarkers.forEach((m) => m.remove());
    this.incidentMarkers.clear();

    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
    this.isLoadedSubject.next(false);
  }
}
