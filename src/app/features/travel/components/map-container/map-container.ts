import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  signal,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Leaflet touches `window` as soon as its module is evaluated, which crashes
// Angular's server-side prerendering. Import only its types statically here,
// and load the real module dynamically (browser-only) in ngAfterViewInit.
import type * as Leaflet from 'leaflet';
type L = typeof Leaflet;

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'tourist_site' | 'attraction' | 'hidden_gem';
  rating?: number;
  description?: string;
}

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

export interface TripRoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TripRouteEndpoints {
  origin: TripRoutePoint;
  destination: TripRoutePoint;
}

export interface TripRouteInfo extends RouteInfo {
  /** True when this is a straight-line (haversine) estimate, not a real driving route. */
  approx?: boolean;
  note?: string;
}

// Free, no-API-key routing via the public OSRM demo server.
// Fine for light/demo use; swap for a self-hosted OSRM instance for production traffic.
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

const MARKER_COLORS: Record<string, string> = {
  restaurant: '#ff7043',
  tourist_site: '#5c6bc0',
  attraction: '#ab47bc',
  hidden_gem: '#26a69a',
};

const MARKER_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  tourist_site: '🏛️',
  attraction: '🎪',
  hidden_gem: '💎',
};

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="map-container">
      <div #mapElement class="map-element"></div>

      <div class="map-controls">
        <div class="zoom-controls">
          <button (click)="zoomIn()" class="btn btn-sm btn-light" title="Zoom in">
            +
          </button>
          <button (click)="zoomOut()" class="btn btn-sm btn-light" title="Zoom out">
            −
          </button>
        </div>

        <div class="layer-controls">
          <label class="control-label">
            <input type="checkbox" [(ngModel)]="showRestaurants" (change)="updateMarkers()" />
            Restaurants
          </label>
          <label class="control-label">
            <input type="checkbox" [(ngModel)]="showAttractions" (change)="updateMarkers()" />
            Attractions
          </label>
          <label class="control-label">
            <input type="checkbox" [(ngModel)]="showHiddenGems" (change)="updateMarkers()" />
            Hidden Gems
          </label>
        </div>
      </div>

      <div
        class="trip-route-panel"
        *ngIf="tripRoute && (loadingTripRoute() || tripRouteInfo() || tripRouteError())"
      >
        <p class="trip-route-loading" *ngIf="loadingTripRoute()">Calculating route…</p>
        <ng-container *ngIf="!loadingTripRoute() && tripRouteInfo() as info">
          <div class="trip-route-summary">
            <span>{{ info.approx ? '📏' : '🚗' }} {{ info.distanceKm }} km</span>
            <span>⏱️ {{ formatDuration(info.durationMin) }}</span>
          </div>
          <p class="trip-route-note" *ngIf="info.note">{{ info.note }}</p>
        </ng-container>
      </div>

      <div class="marker-info" *ngIf="selectedMarker()">
        <div class="marker-header">
          <h4>{{ selectedMarker()?.name }}</h4>
          <button (click)="closeMarkerInfo()" class="btn-close">✕</button>
        </div>
        <p class="marker-type">{{ selectedMarker()?.type }}</p>
        <p class="marker-rating" *ngIf="selectedMarker()?.rating">
          ⭐ {{ selectedMarker()?.rating }}/5
        </p>
        <p class="marker-description">{{ selectedMarker()?.description }}</p>

        <div class="route-info" *ngIf="routeInfo()">
          🚗 {{ routeInfo()!.distanceKm }} km · {{ routeInfo()!.durationMin }} min
        </div>
        <p class="route-error" *ngIf="routeError()">{{ routeError() }}</p>

        <div class="marker-actions">
          <button
            (click)="showDirectionsToSelected()"
            class="btn btn-secondary btn-sm"
            [disabled]="loadingRoute()"
          >
            {{ loadingRoute() ? 'Loading route…' : '🧭 Directions' }}
          </button>
          <button (click)="onLocationSelected()" class="btn btn-primary btn-sm">
            View Details
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .map-container {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 500px;
      }

      .map-element {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        overflow: hidden;
        background: #e0e0e0;
        position: relative;
      }

      .map-controls {
        position: absolute;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }

      .zoom-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 15px;
      }

      .zoom-controls button {
        width: 36px;
        height: 36px;
        padding: 0;
        font-size: 18px;
        border: 1px solid #ddd;
        background: white;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .zoom-controls button:hover {
        background: #f0f0f0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .layer-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid #eee;
        padding-top: 12px;
      }

      .control-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
      }

      .control-label input[type='checkbox'] {
        cursor: pointer;
      }

      .trip-route-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        background: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-width: 260px;
      }

      .trip-route-loading {
        margin: 0;
        font-size: 13px;
        color: #667eea;
      }

      .trip-route-summary {
        display: flex;
        gap: 14px;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      .trip-route-note {
        margin: 6px 0 0 0;
        font-size: 11px;
        color: #999;
      }

      .marker-info {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .marker-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 8px;
      }

      .marker-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-close:hover {
        color: #333;
      }

      .marker-type {
        margin: 4px 0;
        font-size: 12px;
        color: #666;
        text-transform: capitalize;
        background: #f0f0f0;
        padding: 4px 8px;
        border-radius: 4px;
        display: inline-block;
      }

      .marker-rating {
        margin: 4px 0;
        font-size: 14px;
        font-weight: 500;
      }

      .marker-description {
        margin: 8px 0;
        font-size: 13px;
        color: #555;
        line-height: 1.4;
      }

      .route-info {
        margin: 8px 0;
        font-size: 13px;
        font-weight: 500;
        color: #2e7d32;
        background: #eaf6ea;
        padding: 6px 10px;
        border-radius: 4px;
      }

      .route-error {
        margin: 8px 0;
        font-size: 12px;
        color: #c62828;
      }

      .marker-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .btn {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        flex: 1;
      }

      .btn-primary {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }

      .btn-primary:hover {
        background: #0056b3;
        border-color: #0056b3;
      }

      .btn-secondary {
        background: white;
        color: #333;
      }

      .btn-secondary:hover {
        background: #f0f0f0;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class MapContainerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapElement', { read: ElementRef }) mapElement!: ElementRef;
  @Input() locations: MapLocation[] = [];
  @Input() center?: { lat: number; lng: number };
  @Input() zoom?: number;
  /** Draws a route (real driving route via OSRM, falling back to a straight-line estimate) between two arbitrary points. */
  @Input() tripRoute: TripRouteEndpoints | null = null;
  @Output() locationSelected = new EventEmitter<MapLocation>();
  @Output() tripRouteComputed = new EventEmitter<TripRouteInfo | null>();

  selectedMarker = signal<MapLocation | null>(null);
  routeInfo = signal<RouteInfo | null>(null);
  routeError = signal<string | null>(null);
  loadingRoute = signal(false);

  tripRouteInfo = signal<TripRouteInfo | null>(null);
  tripRouteError = signal<string | null>(null);
  loadingTripRoute = signal(false);

  showRestaurants = true;
  showAttractions = true;
  showHiddenGems = true;

  private readonly isBrowser: boolean;
  private leaflet!: typeof Leaflet;
  private map: Leaflet.Map | null = null;
  private markers = new Map<string, Leaflet.Marker>();
  private routeLayer: Leaflet.GeoJSON | null = null;
  private tripRouteLayer: Leaflet.GeoJSON | Leaflet.Polyline | null = null;
  private tripMarkers: Leaflet.Marker[] = [];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngAfterViewInit() {
    if (!this.isBrowser) return; // Leaflet needs the DOM; skip during SSR/prerender.

    if (!this.mapElement) {
      console.error('Map element not found');
      return;
    }

    this.leaflet = await import('leaflet');
    const L = this.leaflet;

    const center = this.center ?? { lat: 20, lng: 0 };
    this.map = L.map(this.mapElement.nativeElement, {
      center: [center.lat, center.lng],
      zoom: this.zoom ?? 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Leaflet sizes itself based on its container at creation time; the
    // container can still be mid-layout right after *ngIf reveals it.
    setTimeout(() => this.map?.invalidateSize(), 100);

    this.addLocationsToMap();
    if (this.tripRoute) this.drawTripRoute();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locations'] && !changes['locations'].firstChange && this.map) {
      this.refreshMap();
    }
    if (changes['center'] && !changes['center'].firstChange && this.map && this.center) {
      this.map.setView([this.center.lat, this.center.lng], this.zoom ?? this.map.getZoom());
    }
    if (changes['tripRoute'] && !changes['tripRoute'].firstChange && this.map) {
      this.drawTripRoute();
    }
  }

  ngOnDestroy() {
    this.markers.clear();
    this.clearTripRoute();
    this.map?.remove();
    this.map = null;
  }

  private refreshMap() {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.clearRoute();
    this.addLocationsToMap();
  }

  private addLocationsToMap() {
    if (!this.map) return;

    for (const location of this.locations) {
      this.addLocationMarker(location);
    }

    if (this.locations.length > 0) {
      const positions = Array.from(this.markers.values()).map((m) => m.getLatLng());
      if (positions.length > 1) {
        this.map.fitBounds(this.leaflet.latLngBounds(positions), { padding: [50, 50] });
      } else if (positions.length === 1) {
        this.map.setView(positions[0], 15);
      }
    }
  }

  private addLocationMarker(location: MapLocation) {
    if (!this.map) return;

    const marker = this.leaflet.marker([location.lat, location.lng], {
      icon: this.buildIcon(location.type),
    }).addTo(this.map);

    marker.bindTooltip(location.name, { direction: 'top', offset: [0, -28] });

    marker.on('click', () => {
      this.clearRoute();
      this.selectedMarker.set(location);
    });

    this.markers.set(location.id, marker);
  }

  private buildIcon(type: string): Leaflet.DivIcon {
    const color = MARKER_COLORS[type] || '#757575';
    const emoji = MARKER_ICONS[type] || '📍';
    return this.leaflet.divIcon({
      className: 'custom-map-marker',
      html: `<div style="
        width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
        background: ${color}; transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;
      "><span style="transform: rotate(45deg); font-size: 15px;">${emoji}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }

  updateMarkers() {
    this.markers.forEach((marker, id) => {
      const location = this.locations.find((l) => l.id === id);
      if (!location || !this.map) return;

      const shouldShow =
        (location.type === 'restaurant' && this.showRestaurants) ||
        (location.type === 'tourist_site' && this.showAttractions) ||
        (location.type === 'attraction' && this.showAttractions) ||
        (location.type === 'hidden_gem' && this.showHiddenGems);

      if (shouldShow) {
        marker.addTo(this.map);
      } else {
        marker.remove();
      }
    });
  }

  zoomIn() {
    this.map?.zoomIn();
  }

  zoomOut() {
    this.map?.zoomOut();
  }

  closeMarkerInfo() {
    this.selectedMarker.set(null);
    this.clearRoute();
  }

  onLocationSelected() {
    const location = this.selectedMarker();
    if (location) {
      this.locationSelected.emit(location);
      this.closeMarkerInfo();
    }
  }

  panToLocation(location: MapLocation) {
    this.map?.setView([location.lat, location.lng], 16);
  }

  /**
   * Draw a driving route from the destination's center to the selected marker,
   * using the free OSRM demo routing service (no API key required).
   */
  async showDirectionsToSelected() {
    const destination = this.selectedMarker();
    if (!destination || !this.map || !this.center) return;

    this.clearRoute();
    this.loadingRoute.set(true);
    this.routeError.set(null);

    try {
      const url =
        `${OSRM_ROUTE_URL}/${this.center.lng},${this.center.lat};${destination.lng},${destination.lat}` +
        `?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

      const data = await response.json();
      const route = data.routes?.[0];
      if (!route) throw new Error('No route found');

      this.routeLayer = this.leaflet.geoJSON(route.geometry, {
        style: { color: '#1976d2', weight: 4, opacity: 0.8 },
      }).addTo(this.map);

      this.routeInfo.set({
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
      });

      this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
    } catch (error) {
      console.error('Failed to fetch directions:', error);
      this.routeError.set('Could not load directions right now. Please try again.');
    } finally {
      this.loadingRoute.set(false);
    }
  }

  private clearRoute() {
    this.routeLayer?.remove();
    this.routeLayer = null;
    this.routeInfo.set(null);
    this.routeError.set(null);
  }

  /**
   * Draw a route between two arbitrary points (e.g. a searched starting
   * point and destination), independent of the location markers. Tries the
   * free OSRM demo routing service first for a real driving route; if that's
   * unreachable (network/rate-limit), falls back to a straight-line
   * (haversine) distance estimate so the feature still works offline.
   */
  private async drawTripRoute() {
    this.clearTripRoute();
    if (!this.map || !this.tripRoute) {
      this.tripRouteComputed.emit(null);
      return;
    }

    const { origin, destination } = this.tripRoute;
    const bounds = this.leaflet.latLngBounds([
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ]);

    const originMarker = this.leaflet
      .marker([origin.lat, origin.lng], { icon: this.buildEndpointIcon('🚩', '#43a047') })
      .addTo(this.map);
    originMarker.bindTooltip(origin.name || 'Starting point', { direction: 'top', offset: [0, -30] });

    const destMarker = this.leaflet
      .marker([destination.lat, destination.lng], { icon: this.buildEndpointIcon('🏁', '#e53935') })
      .addTo(this.map);
    destMarker.bindTooltip(destination.name || 'Destination', { direction: 'top', offset: [0, -30] });

    this.tripMarkers = [originMarker, destMarker];
    this.loadingTripRoute.set(true);

    try {
      const url =
        `${OSRM_ROUTE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
        `?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

      const data = await response.json();
      const route = data.routes?.[0];
      if (!route) throw new Error('No route found');

      const layer = this.leaflet
        .geoJSON(route.geometry, { style: { color: '#1976d2', weight: 4, opacity: 0.85 } })
        .addTo(this.map);
      this.tripRouteLayer = layer;

      const info: TripRouteInfo = {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
      };
      this.tripRouteInfo.set(info);
      this.tripRouteComputed.emit(info);
      this.map.fitBounds(layer.getBounds(), { padding: [60, 60] });
    } catch (error) {
      console.error('Trip route lookup failed, falling back to straight-line distance:', error);

      this.tripRouteLayer = this.leaflet
        .polyline(
          [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ],
          { color: '#9e9e9e', weight: 3, dashArray: '8 8' },
        )
        .addTo(this.map);

      const distanceKm = Math.round(this.haversineKm(origin, destination) * 10) / 10;
      const info: TripRouteInfo = {
        distanceKm,
        durationMin: Math.round((distanceKm / 50) * 60), // ~50 km/h assumed average for the estimate
        approx: true,
        note: 'Live routing is unavailable right now — showing straight-line distance instead.',
      };
      this.tripRouteInfo.set(info);
      this.tripRouteComputed.emit(info);
      this.tripRouteError.set(info.note ?? null);
      this.map.fitBounds(bounds, { padding: [60, 60] });
    } finally {
      this.loadingTripRoute.set(false);
    }
  }

  private clearTripRoute() {
    this.tripMarkers.forEach((m) => m.remove());
    this.tripMarkers = [];
    this.tripRouteLayer?.remove();
    this.tripRouteLayer = null;
    this.tripRouteInfo.set(null);
    this.tripRouteError.set(null);
  }

  private buildEndpointIcon(emoji: string, color: string): Leaflet.DivIcon {
    return this.leaflet.divIcon({
      className: 'custom-map-marker',
      html: `<div style="
        width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
        background: ${color}; transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;
      "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
  }

  private haversineKm(a: TripRoutePoint, b: TripRoutePoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(h));
  }

  formatDuration(min: number): string {
    const hours = Math.floor(min / 60);
    const minutes = Math.round(min % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
