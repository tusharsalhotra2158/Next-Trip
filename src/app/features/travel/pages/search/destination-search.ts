import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TravelApiService, Destination, Location, TransportOptions, RoadConditions } from '../../services/travel-api.service';
import { MapContainerComponent, TripRouteInfo } from '../../components/map-container/map-container';
import { SearchAutocompleteComponent } from '../../components/search-autocomplete/search-autocomplete';
import { TripPlannerComponent } from '../../components/trip-planner/trip-planner';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-destination-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MapContainerComponent, SearchAutocompleteComponent, TripPlannerComponent],
  template: `
    <div class="destination-search-page">
    <div class="destination-search-container">
      <div class="search-section">
        <div class="search-header">
          <h1>🌍 Plan Your Route</h1>
          <p>Search a starting point and a destination — same search box, used both ways</p>
        </div>

        <div class="route-inputs">
          <app-search-autocomplete
            label="Starting point"
            placeholder="Search starting point..."
            (suggestionSelected)="onOriginSelected($event)"
          ></app-search-autocomplete>
          <p class="route-selected-chip" *ngIf="originPlace">📍 {{ originPlace.name }}, {{ originPlace.country }}</p>

          <app-search-autocomplete
            label="Destination"
            placeholder="Search destination..."
            (suggestionSelected)="onDestinationSelected($event)"
          ></app-search-autocomplete>
          <p class="route-selected-chip" *ngIf="selectedDestination">
            📍 {{ selectedDestination.name }}, {{ selectedDestination.country }}
          </p>
        </div>

        <p class="route-hint" *ngIf="!originPlace || !selectedDestination">
          Select both a starting point and a destination to see the distance, route, weather, and vehicle options.
        </p>

        <div class="route-summary" *ngIf="tripRouteInfo">
          <span class="route-summary-item">{{ tripRouteInfo.approx ? '📏' : '🚗' }} {{ tripRouteInfo.distanceKm }} km</span>
          <span class="route-summary-item">⏱️ {{ formatDuration(tripRouteInfo.durationMin) }}</span>
        </div>
        <p class="route-summary-note" *ngIf="tripRouteInfo?.note">{{ tripRouteInfo!.note }}</p>

        <div *ngIf="selectedDestination" class="selected-destination-info">
          <div class="info-header">
            <h2>{{ selectedDestination.name }}, {{ selectedDestination.country }}</h2>
            <button (click)="clearSelection()" class="btn-clear">✕</button>
          </div>
          <p class="info-description">{{ selectedDestination.description }}</p>

          <div class="action-buttons">
            <button (click)="createTrip()" class="btn btn-primary">
              ✈️ Plan a Trip
            </button>
            <button (click)="viewDetails()" class="btn btn-secondary">
              📖 View Details
            </button>
          </div>

          <div class="weather-section" *ngIf="currentWeather">
            <h4>Current Weather</h4>
            <div class="weather-info">
              <span class="weather-icon">{{ currentWeather.icon }}</span>
              <div class="weather-details">
                <p class="temp">{{ currentWeather.temp }}°C</p>
                <p class="condition">{{ currentWeather.condition }}</p>
                <p class="details">
                  Humidity: {{ currentWeather.humidity }}% | Wind: {{ currentWeather.windSpeed }} km/h
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="vehicle-section" *ngIf="originPlace && selectedDestination">
          <h4>🚆 Vehicle Options</h4>
          <p class="vehicle-loading" *ngIf="isLoadingTransport">Loading options…</p>

          <ng-container *ngIf="transportOptions as t">
            <div class="vehicle-group" *ngIf="t.trains.length">
              <h5>Trains</h5>
              <div class="vehicle-item" *ngFor="let train of t.trains">
                <span>{{ train.operator }} · {{ train.departureTime }}</span>
                <span>{{ train.durationHours }}h · \${{ train.fareEstimateUsd }}</span>
              </div>
            </div>
            <div class="vehicle-group" *ngIf="t.buses.length">
              <h5>Buses</h5>
              <div class="vehicle-item" *ngFor="let bus of t.buses">
                <span>{{ bus.operator }} · {{ bus.departureTime }}</span>
                <span>{{ bus.durationHours }}h · \${{ bus.fareEstimateUsd }}</span>
              </div>
            </div>
            <p class="vehicle-disclaimer">{{ t.disclaimer }}</p>
          </ng-container>

          <p class="road-conditions" *ngIf="roadConditions as rc">
            🛣️ Traffic: {{ rc.trafficLevel }} — {{ rc.note }}
          </p>
        </div>
      </div>

      <div class="map-section" *ngIf="originPlace && selectedDestination">
        <div class="map-header">
          <h3>{{ originPlace.name }} → {{ selectedDestination.name }}</h3>
          <div class="location-stats">
            <span *ngIf="restaurantCount > 0">🍽️ {{ restaurantCount }} Restaurants</span>
            <span *ngIf="attractionCount > 0">🏛️ {{ attractionCount }} Attractions</span>
            <span *ngIf="gemCount > 0">💎 {{ gemCount }} Hidden Gems</span>
          </div>
        </div>

        <app-map-container
          [locations]="locations"
          [center]="{ lat: selectedDestination.lat, lng: selectedDestination.lng }"
          [zoom]="8"
          [tripRoute]="{
            origin: { lat: originPlace.lat, lng: originPlace.lng, name: originPlace.name },
            destination: { lat: selectedDestination.lat, lng: selectedDestination.lng, name: selectedDestination.name }
          }"
          (locationSelected)="onLocationSelected($event)"
          (tripRouteComputed)="onTripRouteComputed($event)"
        ></app-map-container>
      </div>
    </div>

    <div class="highlights-section" *ngIf="selectedDestination && topHighlights.length">
      <div class="highlights-header">
        <h3>🌟 Highlights of {{ selectedDestination.name }}</h3>
        <p>Most visited and popular tourist places</p>
      </div>
      <div class="highlights-grid">
        <div class="highlight-card" *ngFor="let place of topHighlights" (click)="onLocationSelected(place)">
          <div class="highlight-icon">{{ highlightIcon(place.type) }}</div>
          <div class="highlight-body">
            <h4>{{ place.name }}</h4>
            <p class="highlight-type">{{ place.type | titlecase }}</p>
            <div class="highlight-meta">
              <span *ngIf="place.rating">⭐ {{ place.rating }}/5</span>
              <span *ngIf="place.reviewsCount">👥 {{ place.reviewsCount | number }} reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="planner-section" *ngIf="selectedDestination">
      <app-trip-planner [destination]="selectedDestination"></app-trip-planner>
    </div>

      <div *ngIf="selectedLocation" class="location-details-modal">
        <div class="modal-overlay" (click)="selectedLocation = null"></div>
        <div class="modal-content">
          <button (click)="selectedLocation = null" class="btn-close">✕</button>

          <h2>{{ selectedLocation.name }}</h2>
          <p class="type-badge">{{ selectedLocation.type | titlecase }}</p>

          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Rating</span>
              <span class="value">⭐ {{ selectedLocation.rating }}/5</span>
            </div>
            <div class="detail-item">
              <span class="label">Reviews</span>
              <span class="value">{{ selectedLocation.reviewsCount | number }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Category</span>
              <span class="value">{{ selectedLocation.category }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Coordinates</span>
              <span class="value">{{ selectedLocation.lat }}, {{ selectedLocation.lng }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button (click)="addToItinerary()" class="btn btn-primary">
              ➕ Add to Trip
            </button>
            <button (click)="selectedLocation = null" class="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .destination-search-page {
        min-height: 100vh;
        background: var(--travel-cream, #faf5ec);
        padding: 24px;
        box-sizing: border-box;
        font-family: 'Inter', sans-serif;
      }

      .planner-section {
        max-width: 1600px;
        margin: 0 auto;
      }

      .highlights-section {
        max-width: 1600px;
        margin: 24px auto 0;
        background: var(--travel-white, #fff);
        border-radius: 28px;
        padding: 28px;
        box-shadow: var(--travel-shadow, 0 20px 45px rgba(31, 77, 62, 0.12));
      }

      .highlights-header h3 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 700;
        color: var(--travel-ink, #1c2621);
      }

      .highlights-header p {
        margin: 0 0 22px 0;
        font-size: 13px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .highlights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      }

      .highlight-card {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: var(--travel-cream, #faf5ec);
        border: 2px solid transparent;
        border-radius: 18px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .highlight-card:hover {
        border-color: var(--travel-terracotta, #f2643c);
        background: var(--travel-white, #fff);
        box-shadow: 0 10px 24px rgba(31, 77, 62, 0.12);
        transform: translateY(-2px);
      }

      .highlight-icon {
        font-size: 28px;
        line-height: 1;
        flex-shrink: 0;
      }

      .highlight-body h4 {
        margin: 0 0 2px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--travel-ink, #1c2621);
      }

      .highlight-type {
        margin: 0 0 6px 0;
        font-size: 11px;
        font-weight: 600;
        color: var(--travel-terracotta, #f2643c);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .highlight-meta {
        display: flex;
        gap: 10px;
        font-size: 12px;
        color: var(--travel-ink-soft, #5c6a63);
      }
    `,
    `
      .destination-search-container {
        display: grid;
        grid-template-columns: 350px 1fr;
        gap: 20px;
        max-width: 1600px;
        margin: 0 auto;
        min-height: calc(100vh - 40px);
        box-sizing: border-box;
      }

      .search-section {
        background: var(--travel-white, #fff);
        border-radius: 28px;
        padding: 28px;
        overflow-y: auto;
        box-shadow: var(--travel-shadow, 0 20px 45px rgba(31, 77, 62, 0.12));
        max-height: calc(100vh - 60px);
      }

      .search-header {
        margin-bottom: 24px;
        text-align: center;
      }

      .search-header h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        color: var(--travel-ink, #1c2621);
      }

      .search-header p {
        margin: 8px 0 0 0;
        color: var(--travel-ink-soft, #5c6a63);
        font-size: 14px;
      }

      .search-box {
        position: relative;
        margin-bottom: 24px;
      }

      .search-input {
        width: 100%;
        padding: 12px 16px 12px 40px;
        border: 1.5px solid var(--travel-border, #e7ddc9);
        border-radius: 999px;
        font-size: 14px;
        transition: all 0.25s;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--travel-forest, #1f4d3e);
        box-shadow: 0 0 0 4px rgba(31, 77, 62, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--travel-ink-soft, #5c6a63);
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        color: var(--travel-forest, #1f4d3e);
        font-weight: 500;
      }

      .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid var(--travel-cream-soft, #f3ecdf);
        border-top-color: var(--travel-terracotta, #f2643c);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .no-results {
        text-align: center;
        padding: 32px 16px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .route-inputs {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 8px;
      }

      .route-selected-chip {
        margin: -4px 0 8px 0;
        font-size: 12px;
        color: var(--travel-forest, #1f4d3e);
        font-weight: 600;
      }

      .route-hint {
        margin: 0 0 16px 0;
        font-size: 12px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .route-summary {
        display: flex;
        gap: 16px;
        margin-bottom: 4px;
        padding: 12px 16px;
        background: var(--travel-cream, #faf5ec);
        border-radius: 16px;
        font-size: 14px;
        font-weight: 600;
        color: var(--travel-ink, #1c2621);
      }

      .route-summary-note {
        margin: 6px 0 16px 0;
        font-size: 11px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .vehicle-section {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }

      .vehicle-section h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
      }

      .vehicle-loading {
        margin: 0;
        font-size: 12px;
        opacity: 0.85;
      }

      .vehicle-group {
        margin-bottom: 10px;
      }

      .vehicle-group h5 {
        margin: 0 0 6px 0;
        font-size: 12px;
        opacity: 0.85;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .vehicle-item {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        margin-bottom: 4px;
      }

      .vehicle-disclaimer {
        margin: 8px 0 0 0;
        font-size: 11px;
        opacity: 0.75;
      }

      .road-conditions {
        margin: 10px 0 0 0;
        font-size: 12px;
        opacity: 0.9;
      }

      .results-section {
        margin-bottom: 24px;
      }

      .destinations-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
      }

      .destination-item {
        padding: 16px;
        border: 2px solid var(--travel-cream-soft, #f3ecdf);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .destination-item:hover {
        border-color: var(--travel-terracotta, #f2643c);
        background: var(--travel-cream, #faf5ec);
        box-shadow: 0 8px 20px rgba(31, 77, 62, 0.1);
      }

      .destination-item.selected {
        border-color: var(--travel-forest, #1f4d3e);
        background: var(--travel-cream, #faf5ec);
      }

      .destination-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .destination-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--travel-ink, #1c2621);
      }

      .country-badge {
        background: var(--travel-forest, #1f4d3e);
        color: white;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
      }

      .description {
        margin: 8px 0;
        font-size: 13px;
        color: var(--travel-ink-soft, #5c6a63);
        line-height: 1.4;
      }

      .location-count {
        font-size: 12px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .selected-destination-info {
        background: linear-gradient(135deg, var(--travel-forest, #1f4d3e) 0%, var(--travel-forest-dark, #163a2e) 100%);
        color: white;
        padding: 22px;
        border-radius: 22px;
        margin-top: 20px;
      }

      .info-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .info-header h2 {
        margin: 0;
        font-size: 18px;
      }

      .btn-clear {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s;
      }

      .btn-clear:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .info-description {
        margin: 0 0 16px 0;
        font-size: 13px;
        opacity: 0.9;
        line-height: 1.5;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .btn {
        flex: 1;
        padding: 11px 18px;
        border: none;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }

      .btn-primary {
        background: var(--travel-terracotta, #f2643c);
        color: white;
      }

      .btn-primary:hover {
        background: var(--travel-terracotta-dark, #d8502b);
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.35);
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .weather-section {
        background: rgba(255, 255, 255, 0.1);
        padding: 12px;
        border-radius: 6px;
        backdrop-filter: blur(10px);
      }

      .weather-section h4 {
        margin: 0 0 8px 0;
        font-size: 13px;
      }

      .weather-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .weather-icon {
        font-size: 32px;
      }

      .weather-details p {
        margin: 2px 0;
        font-size: 12px;
      }

      .weather-details .temp {
        font-size: 18px;
        font-weight: 600;
      }

      .weather-details .condition {
        opacity: 0.9;
      }

      .weather-details .details {
        opacity: 0.8;
        font-size: 11px;
      }

      .map-section {
        background: var(--travel-white, #fff);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: var(--travel-shadow, 0 20px 45px rgba(31, 77, 62, 0.12));
        display: flex;
        flex-direction: column;
        min-height: 500px;
      }

      .map-section app-map-container {
        flex: 1;
        min-height: 400px;
        display: block;
      }

      .map-header {
        padding: 18px 22px;
        border-bottom: 1px solid var(--travel-cream-soft, #f3ecdf);
        background: var(--travel-cream, #faf5ec);
      }

      .map-header h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--travel-ink, #1c2621);
      }

      .location-stats {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .location-stats span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .no-map {
        background: var(--travel-white, #fff);
        border-radius: 28px;
        padding: 40px 20px;
        text-align: center;
        color: var(--travel-ink-soft, #5c6a63);
      }

      .location-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }

      .modal-content {
        position: relative;
        background: var(--travel-white, #fff);
        border-radius: 24px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 24px 60px rgba(31, 77, 62, 0.3);
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .modal-content h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--travel-ink, #1c2621);
      }

      .type-badge {
        display: inline-block;
        background: var(--travel-forest, #1f4d3e);
        color: white;
        padding: 4px 14px;
        border-radius: 999px;
        font-size: 12px;
        margin-bottom: 20px;
      }

      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 24px 0;
      }

      .detail-item {
        padding: 14px;
        background: var(--travel-cream, #faf5ec);
        border-radius: 14px;
      }

      .detail-item .label {
        display: block;
        font-size: 12px;
        color: var(--travel-ink-soft, #5c6a63);
        margin-bottom: 4px;
      }

      .detail-item .value {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--travel-ink, #1c2621);
      }

      .modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      .btn-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
      }

      .btn-close:hover {
        color: #333;
      }

      @media (max-width: 1024px) {
        .destination-search-container {
          grid-template-columns: 1fr;
          height: 100vh;
          grid-template-rows: auto 1fr;
        }

        .search-section {
          max-height: 50vh;
          overflow-y: auto;
        }

        .map-section {
          height: 100%;
          min-height: 400px;
        }
      }

      @media (max-width: 768px) {
        .destination-search-container {
          padding: 12px;
          gap: 12px;
        }

        .search-section,
        .map-section {
          border-radius: 8px;
        }
      }
    `,
  ],
})
export class DestinationSearchComponent implements OnInit, OnDestroy {
  selectedDestination: Destination | null = null;
  originPlace: Destination | null = null;
  selectedLocation: any = null;
  locations: any[] = [];
  topHighlights: any[] = [];
  currentWeather: any = null;

  tripRouteInfo: TripRouteInfo | null = null;
  transportOptions: TransportOptions | null = null;
  roadConditions: RoadConditions | null = null;
  isLoadingTransport = false;

  restaurantCount = 0;
  attractionCount = 0;
  gemCount = 0;

  private destroy$ = new Subject<void>();
  private locationCounts = new Map<string, number>();

  constructor(
    private travelApi: TravelApiService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Autocomplete component handles search
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  onOriginSelected(place: Destination) {
    this.originPlace = place;
    // A new origin invalidates any previously computed route/vehicle details
    // for the old pairing until the map recomputes them.
    this.tripRouteInfo = null;
    this.transportOptions = null;
    this.roadConditions = null;
  }

  onDestinationSelected(destination: Destination) {
    this.selectDestination(destination);
  }

  /** Fired by the map once it has a real (or straight-line fallback) distance/route for the current origin+destination pair. */
  onTripRouteComputed(info: TripRouteInfo | null) {
    this.tripRouteInfo = info;
    this.loadVehicleDetails();
  }

  private loadVehicleDetails() {
    if (!this.originPlace || !this.selectedDestination) return;

    this.isLoadingTransport = true;
    this.travelApi
      .getTransportOptions(this.selectedDestination.id, undefined, this.tripRouteInfo?.distanceKm)
      .subscribe({
        next: (res) => {
          this.transportOptions = res.data ?? null;
          this.isLoadingTransport = false;
        },
        error: (err) => {
          console.error('Error loading transport options:', err);
          this.isLoadingTransport = false;
        },
      });

    this.travelApi
      .getRoadConditions({
        originLat: this.originPlace.lat,
        originLng: this.originPlace.lng,
        destLat: this.selectedDestination.lat,
        destLng: this.selectedDestination.lng,
      })
      .subscribe({
        next: (res) => (this.roadConditions = res.data ?? null),
        error: (err) => console.error('Error loading road conditions:', err),
      });
  }

  formatDuration(min: number): string {
    const hours = Math.floor(min / 60);
    const minutes = Math.round(min % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  selectDestination(destination: Destination) {
    this.selectedDestination = destination;
    this.selectedLocation = null;
    this.loadDestinationData(destination.id);
  }

  loadDestinationData(destinationId: string) {
    // Load all locations
    this.travelApi.getDestinationLocations(destinationId).subscribe({
      next: (response) => {
        this.locations = (response.data || []).map((loc: any) => ({
          ...loc,
          description: loc.category || loc.type,
        }));
        this.calculateLocationStats();
        this.calculateTopHighlights();
      },
      error: (err) => console.error('Error loading locations:', err),
    });

    // Load weather
    this.travelApi.getWeatherForecast(destinationId, 7).subscribe({
      next: (response) => {
        this.currentWeather = response.data?.current;
      },
      error: (err) => console.error('Error loading weather:', err),
    });
  }

  calculateLocationStats() {
    this.restaurantCount = this.locations.filter((l) => l.type === 'restaurant').length;
    this.attractionCount = this.locations.filter(
      (l) => l.type === 'tourist_site' || l.type === 'attraction',
    ).length;
    this.gemCount = this.locations.filter((l) => l.type === 'hidden_gem').length;
  }

  /**
   * Most-visited/popular tourist places for the "Highlights" section — the
   * destination's attractions and hidden gems (restaurants excluded, since
   * "tourist places" means sights, not dining), ranked by review volume then
   * rating, capped to keep the section skimmable.
   */
  private calculateTopHighlights() {
    this.topHighlights = this.locations
      .filter((l) => l.type === 'tourist_site' || l.type === 'attraction' || l.type === 'hidden_gem')
      .slice()
      .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);
  }

  highlightIcon(type: string): string {
    return { tourist_site: '🏛️', attraction: '🎪', hidden_gem: '💎' }[type] || '📍';
  }

  getLocationCount(destinationId: string): number {
    if (!this.locationCounts.has(destinationId)) {
      this.locationCounts.set(destinationId, Math.floor(Math.random() * 20 + 10));
    }
    return this.locationCounts.get(destinationId) || 0;
  }

  clearSelection() {
    this.selectedDestination = null;
    this.originPlace = null;
    this.locations = [];
    this.topHighlights = [];
    this.currentWeather = null;
    this.selectedLocation = null;
    this.tripRouteInfo = null;
    this.transportOptions = null;
    this.roadConditions = null;
  }

  createTrip() {
    if (!this.selectedDestination) return;
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Create trip and navigate to itinerary. travelApi.createTrip() attaches
    // the current logged-in user's id server-side; no need to set it here.
    const tripData: any = {
      name: `${this.selectedDestination.name} Trip`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      destinationId: this.selectedDestination.id,
      budget: 3000,
    };

    this.travelApi.createTrip(tripData).subscribe({
      next: (response) => {
        if (response.data?.id) {
          this.router.navigate(['/travel/trips', response.data.id]);
        }
      },
      error: (err) => console.error('Error creating trip:', err),
    });
  }

  viewDetails() {
    // Navigate to destination details
    if (this.selectedDestination) {
      this.router.navigate(['/travel/destinations', this.selectedDestination.id]);
    }
  }

  onLocationSelected(location: any) {
    this.selectedLocation = location;
  }

  addToItinerary() {
    // TODO: Add location to current itinerary
    console.log('Adding to itinerary:', this.selectedLocation);
    this.selectedLocation = null;
  }
}
