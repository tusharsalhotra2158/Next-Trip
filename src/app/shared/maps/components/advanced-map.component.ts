import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { GoogleMapsService } from '../services/google-maps.service';
import { GeocodingService } from '../services/geocoding.service';
import { DirectionsService } from '../services/directions.service';
import { PlacesService } from '../services/places.service';
import { LocationService } from '../services/location.service';

import {
  LatLng,
  MapOptions,
  MapViewportState,
  DARK_MODE_STYLES,
  MapTheme,
} from '../models/map.models';
import {
  MarkerData,
  MarkerClusterOptions,
  DEFAULT_MARKER_ICONS,
} from '../models/marker.models';
import {
  DirectionsRequest,
  TravelMode,
  RouteSummary,
  DEFAULT_POLYLINE_STYLES,
} from '../models/directions.models';
import { PlaceSearchRequest, PlaceDetails, PlacePrediction } from '../models/place.models';
import { GeolocationPosition, GeolocationError, ReverseGeocodeRequest } from '../models/location.models';

import { formatDistance, formatDuration } from '../utils/map.utils';

@Component({
  selector: 'app-advanced-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="map-container" [class.dark-mode]="isDarkMode()">
      <!-- Loading spinner -->
      <div *ngIf="isLoading()" class="map-loader">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>

      <!-- Error message -->
      <div *ngIf="error()" class="map-error">
        <span class="error-icon">⚠️</span>
        <div class="error-content">
          <p class="error-message">{{ error() }}</p>
          <button (click)="retryInitialize()" class="btn-retry">Retry</button>
        </div>
      </div>

      <!-- Map canvas -->
      <div #mapElement class="map-element" [hidden]="isLoading() || error()"></div>

      <!-- Search autocomplete -->
      <div *ngIf="enableAutocomplete()" class="search-container">
        <input
          #searchInput
          type="text"
          class="search-input"
          placeholder="Search places..."
          (input)="onSearchInput($event)"
          (keydown.enter)="onSearchEnter()"
        />
        <div *ngIf="searchSuggestions().length > 0" class="search-suggestions">
          <div
            *ngFor="let suggestion of searchSuggestions()"
            class="suggestion-item"
            (click)="selectPlace(suggestion)"
          >
            <div class="suggestion-text">{{ suggestion.mainText }}</div>
            <div class="suggestion-secondary">{{ suggestion.secondaryText }}</div>
          </div>
        </div>
      </div>

      <!-- Directions panel -->
      <div *ngIf="enableDirections() && routeSummary()" class="directions-panel">
        <div class="directions-header">
          <h3>Route Details</h3>
          <button (click)="clearDirections()" class="btn-close">✕</button>
        </div>
        <div class="directions-content">
          <div class="direction-stat">
            <span class="stat-label">Distance:</span>
            <span class="stat-value">{{ formatDistance(getTotalDistance()) }}</span>
          </div>
          <div class="direction-stat">
            <span class="stat-label">Duration:</span>
            <span class="stat-value">{{ formatDuration(getTotalDuration()) }}</span>
          </div>
          <div class="directions-steps" *ngIf="routeSummary()?.routes?.[0]?.steps">
            <div class="steps-label">Steps:</div>
            <div
              *ngFor="let step of routeSummary()!.routes[0].steps"
              class="step-item"
              [innerHTML]="step.instructions"
            ></div>
          </div>
        </div>
      </div>

      <!-- Current location indicator -->
      <div *ngIf="currentLocation()" class="current-location-indicator">
        <div class="location-dot"></div>
        <div class="location-accuracy">
          Accuracy: {{ currentLocation()!.accuracy.toFixed(0) }}m
        </div>
      </div>

      <!-- Map controls -->
      <div class="map-controls">
        <div class="control-group">
          <button
            (click)="zoomIn()"
            class="control-btn"
            title="Zoom in"
            [disabled]="isLoading()"
          >
            +
          </button>
          <button
            (click)="zoomOut()"
            class="control-btn"
            title="Zoom out"
            [disabled]="isLoading()"
          >
            −
          </button>
        </div>

        <div class="control-group" *ngIf="!readonly()">
          <button
            (click)="getUserLocation()"
            class="control-btn"
            title="Get current location"
            [disabled]="isGettingLocation()"
            [class.loading]="isGettingLocation()"
          >
            📍
          </button>
        </div>

        <div class="control-group">
          <button
            (click)="toggleDarkMode()"
            class="control-btn"
            [title]="isDarkMode() ? 'Light mode' : 'Dark mode'"
          >
            {{ isDarkMode() ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>

      <!-- Markers cluster toggle (if clustering enabled) -->
      <div class="map-legend" *ngIf="showLegend()">
        <div class="legend-item" *ngFor="let item of getLegendItems()">
          <span class="legend-icon">{{ item.icon }}</span>
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-count">({{ item.count }})</span>
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
        min-height: 400px;
        background: #f5f5f5;
        font-family: 'Roboto', sans-serif;
        overflow: hidden;
      }

      .map-container.dark-mode {
        background: #1a1a1a;
      }

      .map-element {
        width: 100%;
        height: 100%;
      }

      /* Loading spinner */
      .map-loader {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 100;
      }

      .map-container.dark-mode .map-loader {
        background: rgba(26, 26, 26, 0.95);
        color: #fff;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .map-container.dark-mode .spinner {
        border-color: #333;
        border-top-color: #667eea;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Error message */
      .map-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        text-align: center;
        z-index: 100;
        max-width: 400px;
      }

      .map-container.dark-mode .map-error {
        background: #2a2a2a;
        color: #fff;
      }

      .error-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 12px;
      }

      .error-message {
        margin: 0 0 16px 0;
        color: #333;
      }

      .map-container.dark-mode .error-message {
        color: #ccc;
      }

      .btn-retry {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.3s;
      }

      .btn-retry:hover {
        background: #5568d3;
      }

      /* Search container */
      .search-container {
        position: absolute;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 50;
        max-width: 400px;
      }

      .search-input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
      }

      .search-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
      }

      .search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-top: -1px;
      }

      .suggestion-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      }

      .suggestion-item:last-child {
        border-bottom: none;
      }

      .suggestion-item:hover {
        background: #f9f9f9;
      }

      .suggestion-text {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .suggestion-secondary {
        font-size: 12px;
        color: #999;
        margin-top: 2px;
      }

      /* Directions panel */
      .directions-panel {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 350px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 40;
      }

      .map-container.dark-mode .directions-panel {
        background: #2a2a2a;
        color: #fff;
      }

      .directions-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
      }

      .map-container.dark-mode .directions-header {
        border-bottom-color: #444;
      }

      .directions-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
      }

      .btn-close:hover {
        color: #333;
      }

      .map-container.dark-mode .btn-close:hover {
        color: #ccc;
      }

      .directions-content {
        padding: 16px;
      }

      .direction-stat {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .map-container.dark-mode .direction-stat {
        border-bottom-color: #444;
      }

      .stat-label {
        font-weight: 500;
        color: #666;
      }

      .map-container.dark-mode .stat-label {
        color: #999;
      }

      .stat-value {
        font-weight: 600;
        color: #333;
      }

      .map-container.dark-mode .stat-value {
        color: #fff;
      }

      .directions-steps {
        margin-top: 12px;
      }

      .steps-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #999;
        margin-bottom: 8px;
      }

      .step-item {
        font-size: 12px;
        padding: 6px 0;
        line-height: 1.4;
        color: #666;
      }

      .map-container.dark-mode .step-item {
        color: #aaa;
      }

      /* Current location indicator */
      .current-location-indicator {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: white;
        padding: 8px 12px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        z-index: 30;
      }

      .map-container.dark-mode .current-location-indicator {
        background: #2a2a2a;
        color: #fff;
      }

      .location-dot {
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Map controls */
      .map-controls {
        position: absolute;
        right: 12px;
        top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 40;
      }

      .control-group {
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .map-container.dark-mode .control-group {
        background: #2a2a2a;
      }

      .control-btn {
        width: 40px;
        height: 40px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .map-container.dark-mode .control-btn {
        background: #2a2a2a;
        border-color: #444;
        color: #ccc;
      }

      .control-btn:hover:not(:disabled) {
        background: #f5f5f5;
      }

      .map-container.dark-mode .control-btn:hover:not(:disabled) {
        background: #3a3a3a;
      }

      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .control-btn.loading {
        animation: spin 1s linear infinite;
      }

      .control-btn + .control-btn {
        border-top: 1px solid #ddd;
      }

      .map-container.dark-mode .control-btn + .control-btn {
        border-top-color: #444;
      }

      /* Map legend */
      .map-legend {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 30;
      }

      .map-container.dark-mode .map-legend {
        background: #2a2a2a;
        color: #fff;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        margin-bottom: 6px;
      }

      .legend-item:last-child {
        margin-bottom: 0;
      }

      .legend-icon {
        font-size: 16px;
      }

      .legend-label {
        flex: 1;
        color: #666;
      }

      .map-container.dark-mode .legend-label {
        color: #aaa;
      }

      .legend-count {
        font-weight: 600;
        color: #333;
        min-width: 30px;
        text-align: right;
      }

      .map-container.dark-mode .legend-count {
        color: #ccc;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedMapComponent implements OnInit, OnDestroy {
  // Template references
  @ViewChild('mapElement', { read: ElementRef }) mapElement!: ElementRef<HTMLElement>;
  @ViewChild('searchInput', { read: ElementRef }) searchInput!: ElementRef<HTMLInputElement>;

  // Inputs
  @Input() center: LatLng = { lat: 20, lng: 0 };
  @Input() zoom: number = 10;
  @Input() markers: MarkerData[] = [];
  @Input() showCurrentLocation: boolean = false;
  @Input() enableDirections: () => boolean = () => false;
  @Input() enableAutocomplete: () => boolean = () => true;
  @Input() readonly: () => boolean = () => false;
  @Input() showLegend: () => boolean = () => true;
  @Input() mapOptions: MapOptions = {};
  @Input() theme: MapTheme = MapTheme.DEFAULT;

  // Outputs
  @Output() mapClicked = new EventEmitter<LatLng>();
  @Output() markerClicked = new EventEmitter<MarkerData>();
  @Output() markerMoved = new EventEmitter<{ id: string; position: LatLng }>();
  @Output() placeChanged = new EventEmitter<PlaceDetails>();
  @Output() routeCalculated = new EventEmitter<RouteSummary>();
  @Output() locationDetected = new EventEmitter<GeolocationPosition>();

  // Signals
  isLoading = signal(true);
  error = signal<string | null>(null);
  isDarkMode = signal(false);
  isGettingLocation = signal(false);
  searchSuggestions = signal<PlacePrediction[]>([]);
  currentLocation = signal<GeolocationPosition | null>(null);
  routeSummary = signal<RouteSummary | null>(null);
  viewportState = signal<MapViewportState | null>(null);

  // Private properties
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private selectedMarkerIds = new Set<string>();
  private travelMode: TravelMode = TravelMode.DRIVING;

  constructor(
    private mapsService: GoogleMapsService,
    private geocodingService: GeocodingService,
    private directionsService: DirectionsService,
    private placesService: PlacesService,
    private locationService: LocationService
  ) {
    // Setup dark mode effect
    effect(() => {
      if (this.isDarkMode()) {
        this.applyDarkModeStyle();
      } else {
        this.applyLightModeStyle();
      }
    });
  }

  ngOnInit(): void {
    this.initializeMap();
    this.setupSearch();

    if (this.showCurrentLocation) {
      this.getUserLocation();
    }
  }

  /**
   * Initialize the map
   */
  private async initializeMap(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      await this.mapsService.initializeMap(this.mapElement.nativeElement, {
        center: this.center,
        zoom: this.zoom,
        styles:
          this.theme === MapTheme.DARK
            ? DARK_MODE_STYLES
            : undefined,
        ...this.mapOptions,
      });

      this.isDarkMode.set(this.theme === MapTheme.DARK);

      // Subscribe to map events
      this.mapsService
        .onViewportChange()
        .pipe(takeUntil(this.destroy$))
        .subscribe((state) => {
          this.viewportState.set(state);
        });

      this.mapsService
        .onMapClick()
        .pipe(takeUntil(this.destroy$))
        .subscribe((location) => {
          if (location) {
            this.mapClicked.emit(location);
          }
        });

      this.mapsService
        .onMarkerClick()
        .pipe(takeUntil(this.destroy$))
        .subscribe((markerData) => {
          if (markerData) {
            this.markerClicked.emit(markerData);
          }
        });

      // Add markers
      this.addMarkers();

      this.isLoading.set(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize map';
      this.error.set(message);
      console.error('Map initialization failed:', err);
    }
  }

  /**
   * Add markers to the map
   */
  private addMarkers(): void {
    this.markers.forEach((markerData) => {
      this.mapsService.addMarker(markerData);
      this.selectedMarkerIds.add(markerData.id);
    });
  }

  /**
   * Setup search functionality
   */
  private setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query) => {
        if (query.trim().length > 0) {
          this.performPlaceSearch(query);
        } else {
          this.searchSuggestions.set([]);
        }
      });
  }

  /**
   * Perform place search
   */
  private performPlaceSearch(query: string): void {
    const request: PlaceSearchRequest = {
      input: query,
    };

    this.placesService
      .getAutocompletePredictions(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (predictions) => {
          this.searchSuggestions.set(predictions);
        },
        error: (err) => {
          console.error('Place search failed:', err);
        },
      });
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject$.next(input.value);
  }

  /**
   * Handle search enter key
   */
  onSearchEnter(): void {
    // Placeholder for future implementation
  }

  /**
   * Select a place from suggestions
   */
  selectPlace(prediction: PlacePrediction): void {
    this.placesService
      .getPlaceDetails(prediction.placeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (placeDetails) => {
          this.placeChanged.emit(placeDetails);
          this.mapsService.setCenter(placeDetails.location);
          this.mapsService.setZoom(15);

          // Add marker for selected place
          const markerData: MarkerData = {
            id: `place_${placeDetails.placeId}`,
            position: placeDetails.location,
            title: placeDetails.name,
            infoContent: `<div><strong>${placeDetails.name}</strong><br/>${placeDetails.address}</div>`,
          };

          this.mapsService.addMarker(markerData);

          // Clear search
          this.searchSuggestions.set([]);
          if (this.searchInput) {
            this.searchInput.nativeElement.value = '';
          }
        },
        error: (err) => {
          console.error('Failed to get place details:', err);
        },
      });
  }

  /**
   * Get user's current location
   */
  getUserLocation(): void {
    this.isGettingLocation.set(true);

    this.locationService
      .getCurrentLocation()
      .then((position) => {
        this.currentLocation.set(position);
        this.locationDetected.emit(position);

        const location: LatLng = {
          lat: position.latitude,
          lng: position.longitude,
        };

        this.mapsService.setCenter(location);
        this.mapsService.setZoom(15);

        // Add current location marker
        const markerData: MarkerData = {
          id: 'current_location',
          position: location,
          title: 'Your Location',
          icon: DEFAULT_MARKER_ICONS.blue,
        };

        this.mapsService.addMarker(markerData);
        this.isGettingLocation.set(false);
      })
      .catch((err) => {
        console.error('Failed to get location:', err);
        this.isGettingLocation.set(false);
      });
  }

  /**
   * Calculate directions
   */
  calculateDirections(origin: LatLng, destination: LatLng, mode: TravelMode = TravelMode.DRIVING): void {
    const request: DirectionsRequest = {
      origin,
      destination,
      travelMode: mode,
    };

    this.directionsService
      .getDirections(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.routeSummary.set(summary);
          this.routeCalculated.emit(summary);

          // Draw polyline on map
          if (summary.routes[0]) {
            const polylineStyle = DEFAULT_POLYLINE_STYLES[mode];
            // Note: You would need to decode the polyline to get lat/lng points
          }
        },
        error: (err) => {
          console.error('Directions calculation failed:', err);
        },
      });
  }

  /**
   * Clear directions
   */
  clearDirections(): void {
    this.routeSummary.set(null);
    this.mapsService.clearPolylines();
  }

  /**
   * Format distance utility
   */
  formatDistance(meters: number): string {
    return formatDistance(meters);
  }

  /**
   * Format duration utility
   */
  formatDuration(seconds: number): string {
    return formatDuration(seconds);
  }

  /**
   * Get total distance from route
   */
  getTotalDistance(): number {
    const summary = this.routeSummary();
    if (!summary || !summary.routes[0]) return 0;
    return summary.routes[0].distance.value;
  }

  /**
   * Get total duration from route
   */
  getTotalDuration(): number {
    const summary = this.routeSummary();
    if (!summary || !summary.routes[0]) return 0;
    return summary.routes[0].duration.value;
  }

  /**
   * Get legend items
   */
  getLegendItems(): Array<{ icon: string; label: string; count: number }> {
    return [
      { icon: '🍽️', label: 'Restaurants', count: 0 },
      { icon: '🏛️', label: 'Attractions', count: 0 },
      { icon: '💎', label: 'Hidden Gems', count: 0 },
    ];
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    const map = this.mapsService.getMap();
    const zoom = map.getZoom();
    if (zoom !== undefined) {
      this.mapsService.setZoom(zoom + 1);
    }
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const map = this.mapsService.getMap();
    const zoom = map.getZoom();
    if (zoom !== undefined) {
      this.mapsService.setZoom(zoom - 1);
    }
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  /**
   * Apply dark mode style
   */
  private applyDarkModeStyle(): void {
    const map = this.mapsService.getMap();
    if (map) {
      map.setOptions({
        styles: DARK_MODE_STYLES,
      });
    }
  }

  /**
   * Apply light mode style
   */
  private applyLightModeStyle(): void {
    const map = this.mapsService.getMap();
    if (map) {
      map.setOptions({
        styles: [],
      });
    }
  }

  /**
   * Retry initializing the map
   */
  retryInitialize(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapsService.destroy();
    this.locationService.destroy();
  }
}
