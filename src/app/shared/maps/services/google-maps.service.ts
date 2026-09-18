import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GoogleMapsApiService } from './google-maps-api.service';
import { LatLng, MapOptions, MapViewportState, MapBounds } from '../models/map.models';
import { MarkerData, InfoWindowConfig } from '../models/marker.models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private map: google.maps.Map | null = null;
  private markers: Map<string, google.maps.Marker> = new Map();
  private infoWindows: Map<string, google.maps.InfoWindow> = new Map();
  private polylines: Map<string, google.maps.Polyline> = new Map();
  private circles: Map<string, google.maps.Circle> = new Map();
  private drawingManager: google.maps.drawing.DrawingManager | null = null;

  private mapViewportState$ = new BehaviorSubject<MapViewportState | null>(null);
  private markerClicked$ = new BehaviorSubject<MarkerData | null>(null);
  private mapClicked$ = new BehaviorSubject<LatLng | null>(null);

  constructor(private googleMapsApi: GoogleMapsApiService) {}

  /**
   * Initialize the Google Map
   */
  async initializeMap(
    element: HTMLElement,
    options: MapOptions = {}
  ): Promise<google.maps.Map> {
    await this.googleMapsApi.loadGoogleMapsApi();
    const google = this.googleMapsApi.getGoogle();

    const defaultOptions: google.maps.MapOptions = {
      center: options.center || environment.googleMaps?.defaultCenter || { lat: 20, lng: 0 },
      zoom: options.zoom ?? environment.googleMaps?.defaultZoom ?? 10,
      mapTypeId: options.mapTypeId || google.maps.MapTypeId.ROADMAP,
      gestureHandling: 'cooperative',
      ...options,
    };

    const map: google.maps.Map = new google.maps.Map(element, defaultOptions);
    this.map = map;

    // Setup default event listeners
    this.setupMapEventListeners();

    return map;
  }

  /**
   * Get the current map instance
   */
  getMap(): google.maps.Map {
    if (!this.map) {
      throw new Error('Map not initialized. Call initializeMap() first.');
    }
    return this.map;
  }

  /**
   * Add a marker to the map
   */
  addMarker(markerData: MarkerData): google.maps.Marker {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();

    const markerOptions: google.maps.MarkerOptions = {
      position: markerData.position,
      map,
      title: markerData.title,
      label: markerData.label,
      icon: markerData.icon,
      draggable: markerData.draggable ?? false,
      visible: markerData.visible ?? true,
      opacity: markerData.opacity ?? 1,
      zIndex: markerData.zIndex,
      animation: markerData.animation,
    };

    const marker = new google.maps.Marker(markerOptions);

    // Setup marker event listeners
    marker.addListener('click', () => {
      this.markerClicked$.next(markerData);
      this.showInfoWindow(markerData.id, markerData.infoContent);
    });

    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        markerData.position = {
          lat: position.lat(),
          lng: position.lng(),
        };
      }
    });

    this.markers.set(markerData.id, marker);
    return marker;
  }

  /**
   * Remove a marker from the map
   */
  removeMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.setMap(null);
      this.markers.delete(markerId);
      this.infoWindows.get(markerId)?.close();
      this.infoWindows.delete(markerId);
    }
  }

  /**
   * Clear all markers from the map
   */
  clearMarkers(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers.clear();
    this.infoWindows.forEach((window) => window.close());
    this.infoWindows.clear();
  }

  /**
   * Get a specific marker
   */
  getMarker(markerId: string): google.maps.Marker | undefined {
    return this.markers.get(markerId);
  }

  /**
   * Get all markers
   */
  getAllMarkers(): Map<string, google.maps.Marker> {
    return new Map(this.markers);
  }

  /**
   * Show info window for a marker
   */
  showInfoWindow(markerId: string, content?: string): void {
    const marker = this.markers.get(markerId);
    if (!marker) return;

    const google = this.googleMapsApi.getGoogle();
    let infoWindow = this.infoWindows.get(markerId);

    if (!infoWindow) {
      infoWindow = new google.maps.InfoWindow({
        content: content || marker.getTitle() || 'Marker Info',
      }) as google.maps.InfoWindow;
      this.infoWindows.set(markerId, infoWindow);
    }

    infoWindow.open({
      anchor: marker,
      map: this.map,
      shouldFocus: true,
    });
  }

  /**
   * Hide info window for a marker
   */
  hideInfoWindow(markerId: string): void {
    const infoWindow = this.infoWindows.get(markerId);
    if (infoWindow) {
      infoWindow.close();
    }
  }

  /**
   * Draw a polyline on the map
   */
  drawPolyline(
    polylineId: string,
    path: LatLng[],
    options: google.maps.PolylineOptions = {}
  ): google.maps.Polyline {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();

    const defaultOptions: google.maps.PolylineOptions = {
      map,
      path,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      ...options,
    };

    const polyline = new google.maps.Polyline(defaultOptions);
    this.polylines.set(polylineId, polyline);

    return polyline;
  }

  /**
   * Remove a polyline from the map
   */
  removePolyline(polylineId: string): void {
    const polyline = this.polylines.get(polylineId);
    if (polyline) {
      polyline.setMap(null);
      this.polylines.delete(polylineId);
    }
  }

  /**
   * Clear all polylines
   */
  clearPolylines(): void {
    this.polylines.forEach((polyline) => polyline.setMap(null));
    this.polylines.clear();
  }

  /**
   * Draw a circle on the map
   */
  drawCircle(
    circleId: string,
    center: LatLng,
    radius: number,
    options: google.maps.CircleOptions = {}
  ): google.maps.Circle {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();

    const defaultOptions: google.maps.CircleOptions = {
      map,
      center,
      radius,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      ...options,
    };

    const circle = new google.maps.Circle(defaultOptions);
    this.circles.set(circleId, circle);

    return circle;
  }

  /**
   * Remove a circle from the map
   */
  removeCircle(circleId: string): void {
    const circle = this.circles.get(circleId);
    if (circle) {
      circle.setMap(null);
      this.circles.delete(circleId);
    }
  }

  /**
   * Clear all circles
   */
  clearCircles(): void {
    this.circles.forEach((circle) => circle.setMap(null));
    this.circles.clear();
  }

  /**
   * Fit map bounds to show all markers
   */
  fitBoundsToMarkers(): void {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();

    if (this.markers.size === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach((marker) => {
      const position = marker.getPosition();
      if (position) {
        bounds.extend(position);
      }
    });

    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  /**
   * Fit map bounds to custom bounds
   */
  fitBounds(bounds: google.maps.LatLngBounds): void {
    const map = this.getMap();
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  /**
   * Pan to a location
   */
  panTo(location: LatLng): void {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();
    map.panTo(new google.maps.LatLng(location.lat, location.lng));
  }

  /**
   * Set map center
   */
  setCenter(location: LatLng): void {
    const google = this.googleMapsApi.getGoogle();
    const map = this.getMap();
    map.setCenter(new google.maps.LatLng(location.lat, location.lng));
  }

  /**
   * Set map zoom
   */
  setZoom(zoom: number): void {
    const map = this.getMap();
    map.setZoom(zoom);
  }

  /**
   * Get current viewport state
   */
  getViewportState(): MapViewportState | null {
    return this.mapViewportState$.value;
  }

  /**
   * Watch viewport changes
   */
  onViewportChange(): Observable<MapViewportState | null> {
    return this.mapViewportState$.asObservable();
  }

  /**
   * Watch marker click events
   */
  onMarkerClick(): Observable<MarkerData | null> {
    return this.markerClicked$.asObservable();
  }

  /**
   * Watch map click events
   */
  onMapClick(): Observable<LatLng | null> {
    return this.mapClicked$.asObservable();
  }

  /**
   * Setup default map event listeners
   */
  private setupMapEventListeners(): void {
    const map = this.getMap();
    const google = this.googleMapsApi.getGoogle();

    // Listen to center_changed event
    map.addListener('center_changed', () => {
      this.updateViewportState();
    });

    // Listen to zoom_changed event
    map.addListener('zoom_changed', () => {
      this.updateViewportState();
    });

    // Listen to bounds_changed event
    map.addListener('bounds_changed', () => {
      this.updateViewportState();
    });

    // Listen to map click event
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const location: LatLng = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        this.mapClicked$.next(location);
      }
    });
  }

  /**
   * Update viewport state from current map
   */
  private updateViewportState(): void {
    const map = this.getMap();
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    if (center && zoom !== undefined && bounds) {
      const viewportState: MapViewportState = {
        center: {
          lat: center.lat(),
          lng: center.lng(),
        },
        zoom,
        bounds: {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        },
      };

      this.mapViewportState$.next(viewportState);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearMarkers();
    this.clearPolylines();
    this.clearCircles();
    this.map = null;
  }
}
