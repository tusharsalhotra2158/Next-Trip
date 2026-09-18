import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdvancedMapComponent } from '../components/advanced-map.component';
import { LatLng, MapTheme } from '../models/map.models';
import {
  MarkerData,
  DEFAULT_MARKER_ICONS,
} from '../models/marker.models';
import { DirectionsService } from '../services/directions.service';
import { DirectionsRequest, TravelMode, RouteSummary } from '../models/directions.models';
import { PlaceDetails } from '../models/place.models';
import { GeolocationPosition } from '../models/location.models';

/**
 * Example component showing how to use the AdvancedMapComponent
 * This demonstrates:
 * - Initializing the map
 * - Adding markers
 * - Handling user location
 * - Place search
 * - Route calculation
 * - Event handling
 */
@Component({
  selector: 'app-advanced-map-example',
  standalone: true,
  imports: [CommonModule, FormsModule, AdvancedMapComponent],
  template: `
    <div class="example-container">
      <div class="example-header">
        <h1>Advanced Google Maps Example</h1>
        <p>Demonstration of all map features</p>
      </div>

      <div class="example-controls">
        <div class="control-section">
          <h3>Map Settings</h3>
          <label>
            <input type="checkbox" [(ngModel)]="showCurrentLocation" />
            Show Current Location
          </label>
          <label>
            Enable Autocomplete:
            <input type="checkbox" [ngModel]="enableAutocompleteFeature" />
          </label>
          <label>
            Enable Directions:
            <input type="checkbox" [ngModel]="enableDirectionsFeature" />
          </label>
          <label>
            Theme:
            <select [(ngModel)]="selectedTheme">
              <option [value]="'default'">Default</option>
              <option [value]="'dark'">Dark</option>
              <option [value]="'light'">Light</option>
            </select>
          </label>
        </div>

        <div class="control-section">
          <h3>Add Marker</h3>
          <div class="form-group">
            <input
              type="number"
              [(ngModel)]="newMarkerLat"
              placeholder="Latitude"
              min="-90"
              max="90"
              step="0.001"
            />
            <input
              type="number"
              [(ngModel)]="newMarkerLng"
              placeholder="Longitude"
              min="-180"
              max="180"
              step="0.001"
            />
            <input
              type="text"
              [(ngModel)]="newMarkerTitle"
              placeholder="Marker Title"
            />
            <select [(ngModel)]="newMarkerIcon">
              <option value="blue">Blue</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="orange">Orange</option>
              <option value="purple">Purple</option>
            </select>
            <button (click)="addMarker()" class="btn btn-primary">
              Add Marker
            </button>
          </div>
        </div>

        <div class="control-section">
          <h3>Calculate Route</h3>
          <div class="form-group">
            <select [(ngModel)]="selectedTravelMode">
              <option [value]="'DRIVING'">Driving</option>
              <option [value]="'WALKING'">Walking</option>
              <option [value]="'BICYCLING'">Bicycling</option>
              <option [value]="'TRANSIT'">Transit</option>
            </select>
            <button
              (click)="calculateRoute()"
              class="btn btn-primary"
              [disabled]="!canCalculateRoute()"
            >
              Calculate Route
            </button>
            <button
              (click)="clearRoute()"
              class="btn btn-secondary"
              [disabled]="!routeCalculated"
            >
              Clear Route
            </button>
          </div>
        </div>

        <div class="control-section">
          <h3>Events Log</h3>
          <div class="events-log">
            <div *ngFor="let event of eventsLog.slice(-10)" class="log-entry">
              <span class="log-time">{{ event.timestamp | date: 'HH:mm:ss' }}</span>
              <span class="log-message">{{ event.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="map-wrapper">
        <app-advanced-map
          [center]="mapCenter"
          [zoom]="mapZoom"
          [markers]="markers"
          [showCurrentLocation]="showCurrentLocation"
          [enableDirections]="() => enableDirectionsFeature"
          [enableAutocomplete]="() => enableAutocompleteFeature"
          [readonly]="() => false"
          [theme]="selectedTheme"
          (mapClicked)="onMapClicked($event)"
          (markerClicked)="onMarkerClicked($event)"
          (placeChanged)="onPlaceChanged($event)"
          (routeCalculated)="onRouteCalculated($event)"
          (locationDetected)="onLocationDetected($event)"
        ></app-advanced-map>
      </div>

      <div class="example-info">
        <h3>Information</h3>
        <div *ngIf="selectedPlace" class="info-section">
          <h4>Selected Place</h4>
          <p><strong>Name:</strong> {{ selectedPlace.name }}</p>
          <p><strong>Address:</strong> {{ selectedPlace.address }}</p>
          <p *ngIf="selectedPlace.rating">
            <strong>Rating:</strong> ⭐ {{ selectedPlace.rating }}/5
          </p>
        </div>
        <div *ngIf="currentUserLocation" class="info-section">
          <h4>Your Location</h4>
          <p>
            <strong>Latitude:</strong> {{ currentUserLocation.latitude.toFixed(6) }}
          </p>
          <p>
            <strong>Longitude:</strong> {{ currentUserLocation.longitude.toFixed(6) }}
          </p>
          <p>
            <strong>Accuracy:</strong> {{ currentUserLocation.accuracy.toFixed(0) }}m
          </p>
        </div>
        <div *ngIf="routeInfo" class="info-section">
          <h4>Route Information</h4>
          <p><strong>Distance:</strong> {{ routeInfo.distance }}</p>
          <p><strong>Duration:</strong> {{ routeInfo.duration }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .example-container {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 16px;
        height: 100vh;
        background: #f5f5f5;
        padding: 16px;
      }

      .example-header {
        grid-column: 1 / -1;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin-bottom: 16px;
      }

      .example-header h1 {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #333;
      }

      .example-header p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      .example-controls {
        grid-column: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
      }

      .control-section {
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .control-section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
        text-transform: uppercase;
        font-weight: 600;
      }

      .control-section label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        color: #666;
        cursor: pointer;
      }

      .control-section input[type='checkbox'],
      .control-section input[type='radio'] {
        margin-right: 6px;
        cursor: pointer;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group input,
      .form-group select {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
      }

      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
      }

      .btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #667eea;
        color: white;
      }

      .btn-primary:hover {
        background: #5568d3;
      }

      .btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .btn-secondary:hover {
        background: #e0e0e0;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .events-log {
        max-height: 200px;
        overflow-y: auto;
        background: #f9f9f9;
        border-radius: 4px;
        padding: 8px;
      }

      .log-entry {
        display: flex;
        gap: 8px;
        padding: 4px;
        font-size: 11px;
        border-bottom: 1px solid #f0f0f0;
      }

      .log-entry:last-child {
        border-bottom: none;
      }

      .log-time {
        color: #999;
        min-width: 50px;
        font-weight: 600;
      }

      .log-message {
        color: #666;
        flex: 1;
      }

      .map-wrapper {
        grid-column: 2;
        grid-row: 2;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .example-info {
        grid-column: 1;
        grid-row: 2;
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow-y: auto;
      }

      .example-info h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
        text-transform: uppercase;
        font-weight: 600;
      }

      .info-section {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }

      .info-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }

      .info-section h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #667eea;
        text-transform: uppercase;
        font-weight: 600;
      }

      .info-section p {
        margin: 4px 0;
        font-size: 12px;
        color: #666;
      }

      .info-section strong {
        color: #333;
      }

      @media (max-width: 1024px) {
        .example-container {
          grid-template-columns: 1fr;
        }

        .example-controls {
          grid-column: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .map-wrapper {
          grid-column: 1;
          min-height: 400px;
        }

        .example-info {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class AdvancedMapExampleComponent implements OnInit {
  // Map configuration
  mapCenter: LatLng = { lat: 40.7128, lng: -74.006 }; // New York
  mapZoom = 12;
  markers: MarkerData[] = [];

  // Feature flags
  showCurrentLocation = true;
  enableAutocompleteFeature = true;
  enableDirectionsFeature = true;

  // New marker form
  newMarkerLat = 40.7128;
  newMarkerLng = -74.006;
  newMarkerTitle = 'New Marker';
  newMarkerIcon = 'blue';

  // Route calculation
  selectedTravelMode = 'DRIVING';
  routeCalculated = false;

  // Theme
  selectedTheme: MapTheme = MapTheme.DEFAULT;

  // State
  selectedPlace: PlaceDetails | null = null;
  currentUserLocation: GeolocationPosition | null = null;
  routeInfo: { distance: string; duration: string } | null = null;

  // Events log
  eventsLog: Array<{ timestamp: Date; message: string }> = [];

  // For route calculation
  private originMarker: MarkerData | null = null;
  private destinationMarker: MarkerData | null = null;

  constructor(private directionsService: DirectionsService) {}

  ngOnInit(): void {
    // Initialize with some sample markers
    this.addSampleMarkers();
  }

  /**
   * Add sample markers to the map
   */
  private addSampleMarkers(): void {
    const sampleMarkers: MarkerData[] = [
      {
        id: 'statue_of_liberty',
        position: { lat: 40.6892, lng: -74.0445 },
        title: 'Statue of Liberty',
        label: 'Liberty',
        icon: DEFAULT_MARKER_ICONS.red,
        infoContent: '<div><strong>Statue of Liberty</strong><br/>National Monument</div>',
      },
      {
        id: 'times_square',
        position: { lat: 40.758, lng: -73.9855 },
        title: 'Times Square',
        label: 'Times Sq',
        icon: DEFAULT_MARKER_ICONS.green,
        infoContent: '<div><strong>Times Square</strong><br/>Famous intersection</div>',
      },
      {
        id: 'brooklyn_bridge',
        position: { lat: 40.7061, lng: -73.9969 },
        title: 'Brooklyn Bridge',
        label: 'Bridge',
        icon: DEFAULT_MARKER_ICONS.orange,
        infoContent: '<div><strong>Brooklyn Bridge</strong><br/>Historic bridge</div>',
      },
    ];

    this.markers = sampleMarkers;
    this.log('Sample markers added');
  }

  /**
   * Add a new marker
   */
  addMarker(): void {
    const marker: MarkerData = {
      id: `marker_${Date.now()}`,
      position: {
        lat: this.newMarkerLat,
        lng: this.newMarkerLng,
      },
      title: this.newMarkerTitle,
      icon: (DEFAULT_MARKER_ICONS as any)[this.newMarkerIcon],
    };

    this.markers = [...this.markers, marker];
    this.log(`Marker added: ${this.newMarkerTitle}`);
  }

  /**
   * Handle map click
   */
  onMapClicked(location: LatLng): void {
    this.log(`Map clicked at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
  }

  /**
   * Handle marker click
   */
  onMarkerClicked(marker: MarkerData): void {
    this.log(`Marker clicked: ${marker.title}`);
  }

  /**
   * Handle place selection
   */
  onPlaceChanged(place: PlaceDetails): void {
    this.selectedPlace = place;
    this.log(`Place selected: ${place.name}`);
  }

  /**
   * Handle route calculation
   */
  onRouteCalculated(summary: RouteSummary): void {
    const route = summary.routes[0];
    if (route) {
      const distance = (route.distance.value / 1000).toFixed(2); // km
      const duration = route.duration.text;

      this.routeInfo = {
        distance: `${distance} km`,
        duration,
      };

      this.routeCalculated = true;
      this.log(`Route calculated: ${distance} km, ${duration}`);
    }
  }

  /**
   * Handle location detection
   */
  onLocationDetected(position: GeolocationPosition): void {
    this.currentUserLocation = position;
    this.log(
      `Location detected: ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
    );
  }

  /**
   * Calculate route between markers
   */
  calculateRoute(): void {
    if (!this.canCalculateRoute()) return;

    // Use first two markers as origin and destination
    const origin = this.markers[0].position;
    const destination = this.markers[1].position;

    this.log(`Calculating route from marker 0 to marker 1...`);

    // Note: This would integrate with DirectionsService
    // For now, it's just a placeholder
  }

  /**
   * Clear route
   */
  clearRoute(): void {
    this.routeCalculated = false;
    this.routeInfo = null;
    this.log('Route cleared');
  }

  /**
   * Check if route can be calculated
   */
  canCalculateRoute(): boolean {
    return this.markers.length >= 2;
  }

  /**
   * Add event to log
   */
  private log(message: string): void {
    this.eventsLog.push({
      timestamp: new Date(),
      message,
    });

    // Keep only last 50 events
    if (this.eventsLog.length > 50) {
      this.eventsLog.shift();
    }
  }
}
