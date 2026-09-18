# Advanced Google Maps Component for Angular

A production-ready, feature-rich Google Maps component for Angular with full TypeScript support, comprehensive error handling, and extensive geolocation, directions, and place search integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Setup](#setup)
- [Architecture](#architecture)
- [Services](#services)
- [Models](#models)
- [Component Usage](#component-usage)
- [Advanced Examples](#advanced-examples)
- [Configuration](#configuration)
- [Performance](#performance)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Features

### Core Features
- ✅ Standalone Angular component with `ChangeDetectionStrategy.OnPush`
- ✅ Strict TypeScript typing throughout
- ✅ Dynamic Google Maps API loading
- ✅ Responsive design with light/dark mode support
- ✅ Full geolocation support (browser geolocation API)

### Maps Features
- ✅ Map initialization with customizable options
- ✅ Multi-marker support with custom icons and animations
- ✅ Marker clustering (with MarkerClusterer)
- ✅ Info windows for markers
- ✅ Polyline drawing with multiple styles
- ✅ Circle and polygon drawing
- ✅ Map viewport state tracking
- ✅ Fit bounds to markers
- ✅ Dark/Light theme switching

### Place Search
- ✅ Places Autocomplete with debouncing
- ✅ Place details retrieval
- ✅ Nearby places search
- ✅ Session token for billing optimization
- ✅ Support for component restrictions and place types

### Directions & Routing
- ✅ Multiple travel modes (Driving, Walking, Bicycling, Transit)
- ✅ Waypoints support
- ✅ Route optimization
- ✅ Distance and duration calculation
- ✅ Traffic-aware routing
- ✅ Turn-by-turn directions
- ✅ Polyline rendering on map

### Geolocation & Geocoding
- ✅ High-accuracy geolocation
- ✅ Continuous location watching
- ✅ Forward geocoding (address → coordinates)
- ✅ Reverse geocoding (coordinates → address)
- ✅ Address component parsing
- ✅ Distance matrix calculations
- ✅ Distance calculation between points

### Utilities
- ✅ Coordinate formatting and parsing
- ✅ Polyline encoding/decoding (Google algorithm)
- ✅ Bearing and destination calculation
- ✅ Point-in-bounds checking
- ✅ Polyline simplification (Douglas-Peucker)
- ✅ Distance and duration formatting
- ✅ Color interpolation

## Installation

### Prerequisites
- Angular 21+ (tested with latest)
- TypeScript 5.9+
- Node.js 18+
- npm 10+

### Step 1: Add to Your Project

The maps module is already integrated in `src/app/shared/maps/`. No additional installation needed.

### Step 2: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Distance Matrix API
   - Geocoding API
4. Create an API key under Credentials
5. Restrict the key to:
   - HTTP referrers: `localhost:*`, your domain
   - APIs: Select the above APIs

### Step 3: Configure Environment

Add your API key to `src/environments/environment.ts`:

```typescript
export const environment = {
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 10,
    language: 'en',
    region: 'US',
    enableAutocomplete: true,
    enableDirections: true,
    enableGeolocation: true,
  },
};
```

## Setup

### Import in Your Component

```typescript
import { AdvancedMapComponent } from '@shared/maps';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, AdvancedMapComponent],
  template: `
    <app-advanced-map
      [center]="{ lat: 40.7128, lng: -74.006 }"
      [zoom]="12"
      [markers]="markers"
      [showCurrentLocation]="true"
      [enableDirections]="() => true"
      [enableAutocomplete]="() => true"
      (placeChanged)="onPlaceChanged($event)"
      (routeCalculated)="onRouteCalculated($event)"
    ></app-advanced-map>
  `,
})
export class MyComponent implements OnInit {
  markers: MarkerData[] = [];

  constructor(private geocodingService: GeocodingService) {}

  ngOnInit() {
    this.initializeMarkers();
  }

  private initializeMarkers() {
    // Add markers logic
  }

  onPlaceChanged(place: PlaceDetails) {
    console.log('Place selected:', place);
  }

  onRouteCalculated(summary: RouteSummary) {
    console.log('Route calculated:', summary);
  }
}
```

## Architecture

### Folder Structure

```
src/app/shared/maps/
├── models/                 # TypeScript interfaces and models
│   ├── index.ts
│   ├── map.models.ts       # Map configuration and viewport
│   ├── marker.models.ts    # Marker and info window models
│   ├── directions.models.ts# Routing and directions
│   ├── place.models.ts     # Place search and details
│   └── location.models.ts  # Geolocation and geocoding
├── services/               # Angular services
│   ├── index.ts
│   ├── google-maps-api.service.ts    # API loader
│   ├── google-maps.service.ts        # Core map operations
│   ├── geocoding.service.ts          # Geocoding operations
│   ├── directions.service.ts         # Directions/routing
│   ├── places.service.ts             # Places search
│   └── location.service.ts           # Geolocation
├── components/             # Angular components
│   ├── index.ts
│   └── advanced-map.component.ts     # Main map component
├── utils/                  # Utility functions
│   └── map.utils.ts        # Helper functions
├── examples/               # Usage examples
│   └── advanced-map-example.component.ts
├── index.ts               # Barrel exports
└── README.md             # This file
```

### Service Layer Architecture

```
┌─────────────────────────────────────┐
│    AdvancedMapComponent             │
│  (UI Layer - Change Detection)      │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┬─────────────┬──────────────┐
    │                     │             │              │
┌───▼────────┐  ┌────────▼──┐  ┌──────▼────┐  ┌─────▼─────┐
│GoogleMaps  │  │Directions │  │Places     │  │Geocoding  │
│Service     │  │Service    │  │Service    │  │Service    │
└───┬────────┘  └────────┬──┘  └──────┬────┘  └─────┬─────┘
    │                    │             │             │
    └────────────────────┴─────────────┴─────────────┘
                         │
              ┌──────────▼───────────┐
              │GoogleMapsApiService  │
              │ (Lazy Loader)        │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │  Google Maps JS API  │
              │  (CDN)               │
              └──────────────────────┘
```

## Services

### GoogleMapsApiService

Manages dynamic loading of the Google Maps JavaScript API.

```typescript
import { GoogleMapsApiService } from '@shared/maps';

constructor(private apiService: GoogleMapsApiService) {}

async initialize() {
  await this.apiService.loadGoogleMapsApi();
  const google = this.apiService.getGoogle();
}
```

### GoogleMapsService

Core map operations: initialization, markers, polylines, circles.

```typescript
import { GoogleMapsService } from '@shared/maps';

constructor(private mapsService: GoogleMapsService) {}

async setupMap() {
  const map = await this.mapsService.initializeMap(element, {
    center: { lat: 20, lng: 0 },
    zoom: 10,
  });

  // Add marker
  this.mapsService.addMarker({
    id: 'marker1',
    position: { lat: 20, lng: 0 },
    title: 'My Location',
  });

  // Draw polyline
  this.mapsService.drawPolyline('route1', [
    { lat: 20, lng: 0 },
    { lat: 21, lng: 1 },
  ]);
}
```

### DirectionsService

Calculate routes and directions between locations.

```typescript
import { DirectionsService, DirectionsRequest, TravelMode } from '@shared/maps';

constructor(private directionsService: DirectionsService) {}

calculateRoute() {
  const request: DirectionsRequest = {
    origin: { lat: 40.7128, lng: -74.006 },
    destination: { lat: 40.7580, lng: -73.9855 },
    travelMode: TravelMode.WALKING,
    waypoints: [{ lat: 40.7489, lng: -73.9680 }],
  };

  this.directionsService.getDirections(request).subscribe(
    (summary) => {
      console.log('Route:', summary);
      console.log('Distance:', summary.routes[0].distance.text);
      console.log('Duration:', summary.routes[0].duration.text);
    }
  );
}
```

### PlacesService

Search for places and get detailed information.

```typescript
import { PlacesService, PlaceSearchRequest } from '@shared/maps';

constructor(private placesService: PlacesService) {}

searchPlaces(query: string) {
  const request: PlaceSearchRequest = { input: query };

  this.placesService.getAutocompletePredictions(request).subscribe(
    (predictions) => {
      console.log('Predictions:', predictions);

      // Get details for first prediction
      this.placesService.getPlaceDetails(predictions[0].placeId).subscribe(
        (details) => {
          console.log('Place details:', details);
          console.log('Name:', details.name);
          console.log('Rating:', details.rating);
        }
      );
    }
  );
}
```

### GeocodingService

Convert addresses to coordinates and vice versa.

```typescript
import { GeocodingService, ForwardGeocodeRequest } from '@shared/maps';

constructor(private geocodingService: GeocodingService) {}

geocodeAddress() {
  const request: ForwardGeocodeRequest = {
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
  };

  this.geocodingService.forwardGeocode(request).subscribe(
    (results) => {
      console.log('Location:', results[0].location);
    }
  );
}

reverseGeocode() {
  const request: ReverseGeocodeRequest = {
    location: { lat: 40.7128, lng: -74.006 },
  };

  this.geocodingService.reverseGeocode(request).subscribe(
    (results) => {
      console.log('Address:', results[0].formattedAddress);
    }
  );
}
```

### LocationService

Browser geolocation and distance calculations.

```typescript
import { LocationService } from '@shared/maps';

constructor(private locationService: LocationService) {}

getCurrentLocation() {
  this.locationService.getCurrentLocation().then(
    (position) => {
      console.log('Latitude:', position.latitude);
      console.log('Longitude:', position.longitude);
      console.log('Accuracy:', position.accuracy);
    }
  ).catch(
    (error) => {
      console.error('Geolocation failed:', error);
    }
  );
}

watchLocation() {
  this.locationService.watchLocation().subscribe(
    (position) => {
      console.log('Location updated:', position);
    }
  );
}

calculateDistance() {
  const distance = this.locationService.calculateDistance(
    { lat: 40.7128, lng: -74.006 },
    { lat: 40.7580, lng: -73.9855 }
  );
  console.log('Distance:', distance, 'km');
}
```

## Models

All types are strictly defined for type safety:

### LatLng
```typescript
interface LatLng {
  lat: number;
  lng: number;
}
```

### MarkerData
```typescript
interface MarkerData {
  id: string;
  position: LatLng;
  title?: string;
  label?: string;
  icon?: string | google.maps.Icon;
  draggable?: boolean;
  visible?: boolean;
  infoContent?: string;
  customData?: Record<string, any>;
}
```

### PlaceDetails
```typescript
interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  rating?: number;
  reviews?: PlaceReview[];
  photos?: PlacePhoto[];
  website?: string;
  openingHours?: OpeningHours;
}
```

### DirectionsRequest
```typescript
interface DirectionsRequest {
  origin: string | LatLng;
  destination: string | LatLng;
  travelMode: TravelMode;
  waypoints?: Array<string | LatLng>;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
}
```

See `src/app/shared/maps/models/` for complete type definitions.

## Component Usage

### Basic Usage

```typescript
<app-advanced-map
  [center]="{ lat: 40.7128, lng: -74.006 }"
  [zoom]="12"
></app-advanced-map>
```

### With Markers

```typescript
export class MyComponent {
  markers: MarkerData[] = [
    {
      id: '1',
      position: { lat: 40.7128, lng: -74.006 },
      title: 'New York',
      icon: { url: 'assets/marker.png' },
    },
    {
      id: '2',
      position: { lat: 40.7580, lng: -73.9855 },
      title: 'Times Square',
    },
  ];
}
```

```html
<app-advanced-map
  [markers]="markers"
  (markerClicked)="onMarkerClicked($event)"
></app-advanced-map>
```

### With Geolocation

```html
<app-advanced-map
  [showCurrentLocation]="true"
  (locationDetected)="onLocationDetected($event)"
></app-advanced-map>
```

### With Place Search

```html
<app-advanced-map
  [enableAutocomplete]="() => true"
  (placeChanged)="onPlaceChanged($event)"
></app-advanced-map>
```

### With Directions

```html
<app-advanced-map
  [enableDirections]="() => true"
  (routeCalculated)="onRouteCalculated($event)"
></app-advanced-map>
```

### Dark Mode

```html
<app-advanced-map
  [theme]="'dark'"
></app-advanced-map>
```

## Advanced Examples

See `src/app/shared/maps/examples/advanced-map-example.component.ts` for a complete working example.

### Full Example with All Features

```typescript
import { AdvancedMapComponent, MarkerData, PlaceDetails, RouteSummary } from '@shared/maps';

@Component({
  selector: 'app-travel-map',
  standalone: true,
  imports: [CommonModule, AdvancedMapComponent],
  template: `
    <div class="travel-map">
      <app-advanced-map
        [center]="mapCenter"
        [zoom]="12"
        [markers]="markers"
        [showCurrentLocation]="true"
        [enableDirections]="() => true"
        [enableAutocomplete]="() => true"
        [theme]="isDarkMode ? 'dark' : 'default'"
        (mapClicked)="onMapClicked($event)"
        (markerClicked)="onMarkerClicked($event)"
        (placeChanged)="onPlaceChanged($event)"
        (routeCalculated)="onRouteCalculated($event)"
        (locationDetected)="onLocationDetected($event)"
      ></app-advanced-map>
    </div>
  `,
  styles: [`
    .travel-map {
      width: 100%;
      height: 600px;
    }
  `],
})
export class TravelMapComponent {
  mapCenter: LatLng = { lat: 40.7128, lng: -74.006 };
  markers: MarkerData[] = [];
  isDarkMode = false;

  onMapClicked(location: LatLng) {
    console.log('Map clicked:', location);
    // Add marker at click location
    this.markers.push({
      id: `marker_${Date.now()}`,
      position: location,
      title: 'New Marker',
    });
  }

  onMarkerClicked(marker: MarkerData) {
    console.log('Marker clicked:', marker);
  }

  onPlaceChanged(place: PlaceDetails) {
    console.log('Place selected:', place.name);
    this.mapCenter = place.location;
  }

  onRouteCalculated(summary: RouteSummary) {
    console.log('Route distance:', summary.routes[0].distance.text);
  }

  onLocationDetected(position: GeolocationPosition) {
    console.log('User location:', position.latitude, position.longitude);
  }
}
```

## Configuration

### Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  googleMaps: {
    // Your Google Maps API Key
    apiKey: 'YOUR_API_KEY',

    // Default map center
    defaultCenter: { lat: 20, lng: 0 },

    // Default zoom level
    defaultZoom: 10,

    // Language for UI
    language: 'en',

    // Region bias for searches
    region: 'US',

    // Feature flags
    enableAutocomplete: true,
    enableDirections: true,
    enableGeolocation: true,
    clusterMarkers: true,

    // Marker clustering options
    markerClusterOptions: {
      gridSize: 50,
      maxZoom: 15,
      minimumClusterSize: 3,
    },
  },
};
```

### Map Options

```typescript
const mapOptions: MapOptions = {
  center: { lat: 20, lng: 0 },
  zoom: 10,
  mapTypeId: MapTypeId.ROADMAP,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  gestureHandling: 'cooperative',
  styles: [], // Custom map styles
};

<app-advanced-map [mapOptions]="mapOptions"></app-advanced-map>
```

## Performance

### Optimizations Implemented

1. **ChangeDetectionStrategy.OnPush**: Component uses OnPush for optimal change detection
2. **Signal-based State**: Uses Angular signals for reactive state management
3. **Debounced Search**: Place autocomplete is debounced (300ms)
4. **Session Tokens**: Places autocomplete uses session tokens for billing optimization
5. **Lazy Loading**: Google Maps API is loaded dynamically
6. **Memory Management**: Proper cleanup in ngOnDestroy
7. **Unsubscribe**: All subscriptions use takeUntil pattern

### Performance Tips

1. Use `ChangeDetectionStrategy.OnPush` in parent components
2. Limit number of markers on map (1000+)
3. Use marker clustering for large datasets
4. Debounce user input for searches
5. Optimize map refresh cycles
6. Avoid unnecessary marker updates

```typescript
// Good - minimal marker updates
const markers = this.markerData.slice(0, 100);

// Bad - updating all markers every change detection cycle
@Input() set allMarkers(markers: MarkerData[]) {
  // This runs too often
}
```

## Testing

### Unit Tests Example

```typescript
import { TestBed } from '@angular/core/testing';
import { GoogleMapsService } from '@shared/maps';

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleMapsService);
  });

  it('should add marker', () => {
    // Test marker addition
  });

  it('should calculate distance', () => {
    // Test distance calculation
  });
});
```

### Component Tests Example

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdvancedMapComponent } from '@shared/maps';

describe('AdvancedMapComponent', () => {
  let component: AdvancedMapComponent;
  let fixture: ComponentFixture<AdvancedMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedMapComponent);
    component = fixture.componentInstance;
  });

  it('should load map', () => {
    expect(component).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Google Maps API not loaded"

**Solution**: Ensure API key is set in environment configuration and the script has loaded.

```typescript
// Check if API is loaded
const isLoaded = this.apiService.isGoogleMapsLoaded();
```

#### 2. Geolocation permission denied

**Solution**: Request HTTPS connection and inform user to allow location access.

```typescript
this.locationService.getCurrentLocation().catch(error => {
  if (error.code === 'PERMISSION_DENIED') {
    // Show permission request UI
  }
});
```

#### 3. Map not visible

**Solution**: Ensure container has height and width.

```css
.map-container {
  width: 100%;
  height: 600px; /* Must have explicit height */
}
```

#### 4. Markers not showing

**Solution**: Ensure API key has Marker features enabled and markers have valid positions.

```typescript
// Validate marker data
const isValid = marker.position.lat >= -90 &&
                marker.position.lat <= 90 &&
                marker.position.lng >= -180 &&
                marker.position.lng <= 180;
```

#### 5. Search autocomplete not working

**Solution**: Enable Places API in Google Cloud Console.

```typescript
// Check Places API is enabled
const hasPlacesAPI = !!google.maps.places;
```

## License

This component library is part of the Ek Tha Trip travel application.

## Support

For issues and feature requests, contact the development team or visit the project repository.

---

**Last Updated**: 2026-07-27
**Version**: 1.0.0
**Angular Version**: 21+
**TypeScript Version**: 5.9+
