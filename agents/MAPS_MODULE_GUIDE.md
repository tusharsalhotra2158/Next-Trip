# Google Maps Module - Quick Start Guide

## 🚀 Quick Start

### 1. Import the Component

```typescript
import { AdvancedMapComponent } from '@app/shared/maps';

@Component({
  selector: 'app-my-map',
  standalone: true,
  imports: [AdvancedMapComponent],
  template: `<app-advanced-map></app-advanced-map>`,
})
export class MyMapComponent {}
```

### 2. Basic Map

```html
<app-advanced-map
  [center]="{ lat: 40.7128, lng: -74.006 }"
  [zoom]="12"
></app-advanced-map>
```

### 3. With Markers

```typescript
export class MyMapComponent {
  markers: MarkerData[] = [
    {
      id: '1',
      position: { lat: 40.7128, lng: -74.006 },
      title: 'New York',
    },
  ];
}
```

```html
<app-advanced-map
  [markers]="markers"
  (markerClicked)="onMarkerClick($event)"
></app-advanced-map>
```

### 4. With Geolocation

```html
<app-advanced-map
  [showCurrentLocation]="true"
  (locationDetected)="onLocation($event)"
></app-advanced-map>
```

### 5. With Place Search

```html
<app-advanced-map
  [enableAutocomplete]="() => true"
  (placeChanged)="onPlace($event)"
></app-advanced-map>
```

### 6. With Directions

```html
<app-advanced-map
  [enableDirections]="() => true"
  (routeCalculated)="onRoute($event)"
></app-advanced-map>
```

## 🎯 Complete Example

```typescript
import {
  Component,
  OnInit,
} from '@angular/core';
import {
  AdvancedMapComponent,
  MarkerData,
  PlaceDetails,
  RouteSummary,
  GeolocationPosition,
  LatLng,
  DEFAULT_MARKER_ICONS,
} from '@app/shared/maps';

@Component({
  selector: 'app-travel-map',
  standalone: true,
  imports: [AdvancedMapComponent],
  template: `
    <div class="map-wrapper">
      <app-advanced-map
        [center]="center"
        [zoom]="zoom"
        [markers]="markers"
        [showCurrentLocation]="showLocation"
        [enableAutocomplete]="() => true"
        [enableDirections]="() => true"
        [theme]="theme"
        (mapClicked)="onMapClick($event)"
        (markerClicked)="onMarkerClick($event)"
        (placeChanged)="onPlaceChange($event)"
        (routeCalculated)="onRouteCalc($event)"
        (locationDetected)="onLocationDetect($event)"
      ></app-advanced-map>
    </div>
  `,
  styles: [`
    .map-wrapper {
      width: 100%;
      height: 600px;
    }
  `],
})
export class TravelMapComponent implements OnInit {
  center: LatLng = { lat: 40.7128, lng: -74.006 };
  zoom = 12;
  markers: MarkerData[] = [];
  showLocation = true;
  theme = 'default';

  ngOnInit() {
    // Add initial markers
    this.addMarker(
      { lat: 40.7128, lng: -74.006 },
      'New York',
      'blue'
    );
  }

  addMarker(position: LatLng, title: string, color: string = 'red') {
    this.markers.push({
      id: `marker_${Date.now()}`,
      position,
      title,
      icon: (DEFAULT_MARKER_ICONS as any)[color],
    });
  }

  onMapClick(location: LatLng) {
    console.log('Clicked:', location);
    this.addMarker(location, 'New Location');
  }

  onMarkerClick(marker: MarkerData) {
    console.log('Marker:', marker.title);
  }

  onPlaceChange(place: PlaceDetails) {
    console.log('Place:', place.name, place.rating);
    this.center = place.location;
  }

  onRouteCalc(route: RouteSummary) {
    const distance = route.routes[0].distance.text;
    const duration = route.routes[0].duration.text;
    console.log(`${distance} - ${duration}`);
  }

  onLocationDetect(position: GeolocationPosition) {
    console.log('Your location:', position.latitude, position.longitude);
  }
}
```

## 📦 Services

### GoogleMapsService
```typescript
import { GoogleMapsService } from '@app/shared/maps';

constructor(private maps: GoogleMapsService) {}

// Initialize map
await this.maps.initializeMap(element, options);

// Add marker
this.maps.addMarker(markerData);

// Draw polyline
this.maps.drawPolyline('route1', [
  { lat: 0, lng: 0 },
  { lat: 1, lng: 1 },
]);

// Fit bounds to markers
this.maps.fitBoundsToMarkers();
```

### DirectionsService
```typescript
import { DirectionsService, DirectionsRequest, TravelMode } from '@app/shared/maps';

constructor(private directions: DirectionsService) {}

const request: DirectionsRequest = {
  origin: { lat: 40.7128, lng: -74.006 },
  destination: { lat: 40.7580, lng: -73.9855 },
  travelMode: TravelMode.WALKING,
};

this.directions.getDirections(request).subscribe(route => {
  console.log(route.routes[0].distance.text);
});
```

### PlacesService
```typescript
import { PlacesService } from '@app/shared/maps';

constructor(private places: PlacesService) {}

// Autocomplete
this.places.getAutocompletePredictions({ input: 'New York' }).subscribe(
  predictions => console.log(predictions)
);

// Details
this.places.getPlaceDetails(placeId).subscribe(
  details => console.log(details)
);

// Nearby search
this.places.searchNearby(
  { lat: 40.7128, lng: -74.006 },
  'restaurant',
  5000
).subscribe(results => console.log(results));
```

### GeocodingService
```typescript
import { GeocodingService } from '@app/shared/maps';

constructor(private geocoding: GeocodingService) {}

// Address to coordinates
this.geocoding.forwardGeocode({
  address: '1600 Amphitheatre Parkway'
}).subscribe(results => {
  console.log(results[0].location);
});

// Coordinates to address
this.geocoding.reverseGeocode({
  location: { lat: 40.7128, lng: -74.006 }
}).subscribe(results => {
  console.log(results[0].formattedAddress);
});
```

### LocationService
```typescript
import { LocationService } from '@app/shared/maps';

constructor(private location: LocationService) {}

// Get current location (one-time)
this.location.getCurrentLocation().then(
  position => console.log(position.latitude, position.longitude)
);

// Watch location (continuous)
this.location.watchLocation().subscribe(
  position => console.log('Updated:', position)
);

// Calculate distance
const km = this.location.calculateDistance(
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7580, lng: -73.9855 }
);
```

## 🎨 Customization

### Custom Marker Icons

```typescript
const marker: MarkerData = {
  id: '1',
  position: { lat: 0, lng: 0 },
  icon: {
    url: 'assets/custom-icon.png',
    scaledSize: { width: 40, height: 40 },
    origin: { x: 0, y: 0 },
    anchor: { x: 20, y: 20 },
  },
};
```

### Custom Map Styles

```typescript
const mapOptions: MapOptions = {
  styles: [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }],
    },
    // ... more styles
  ],
};

<app-advanced-map [mapOptions]="mapOptions"></app-advanced-map>
```

### Dark Mode

```html
<app-advanced-map [theme]="'dark'"></app-advanced-map>
```

## 🔧 Configuration

### Environment Setup

```typescript
// src/environments/environment.ts
export const environment = {
  googleMaps: {
    apiKey: 'YOUR_API_KEY',
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

### Get Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create new project
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Distance Matrix API
   - Geocoding API
4. Create API key
5. Restrict to your domain

## 📚 Available Models

All models are in `src/app/shared/maps/models/`:

- `LatLng` - Coordinate pair
- `MarkerData` - Marker configuration
- `MapOptions` - Map initialization options
- `PlaceDetails` - Place information
- `DirectionsRequest` - Route request
- `RouteSummary` - Route result
- `GeolocationPosition` - User location
- `GeocodeResult` - Geocoding result

## 🚨 Error Handling

```typescript
this.directions.getDirections(request).subscribe({
  next: (route) => console.log(route),
  error: (error) => {
    if (error.message.includes('ZERO_RESULTS')) {
      // No route found
    }
  },
});
```

## ⚡ Performance Tips

1. **Use OnPush Change Detection** in parent components
2. **Limit markers** - Use clustering for 1000+
3. **Debounce search** - Already done in component
4. **Lazy load API** - Automatic
5. **Clean up subscriptions** - Use takeUntil

## 📖 Full Documentation

See `src/app/shared/maps/README.md` for comprehensive documentation.

## 🔗 File Structure

```
src/app/shared/maps/
├── models/           # TypeScript interfaces
├── services/         # Angular services
├── components/       # Components
├── utils/            # Utility functions
├── examples/         # Usage examples
├── index.ts         # Barrel exports
└── README.md        # Full docs
```

## 🤝 Contributing

When extending this module:

1. Add models first
2. Create/update service
3. Update component if needed
4. Add tests
5. Update documentation

## 📞 Support

For issues, check the README.md troubleshooting section or contact the team.

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-27  
**Angular**: 21+  
**TypeScript**: 5.9+
