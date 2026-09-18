# Google Maps Integration - Quick Start Guide

## 📋 What's Been Set Up

✅ **GoogleMapsService** - Complete wrapper around Google Maps API
✅ **MapContainerComponent** - Ready-to-use map with markers, filters, and info windows
✅ **TravelApiService** - Connects to your backend API
✅ **Environment Configuration** - API key management

---

## 🚀 Quick Setup (5 minutes)

### 1. Get Your Google Maps API Key

```bash
# Option A: Web (Recommended)
# Go to: https://console.cloud.google.com/
# 1. Create a project
# 2. Enable these APIs:
#    - Maps JavaScript API
#    - Places API
#    - Directions API
#    - Geocoding API
# 3. Create an API Key (HTTP referrers)
# 4. Copy the key
```

### 2. Add API Key to Environment

Open `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api/v1',
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY_HERE', // ← Paste your key here
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 4,
  },
  // ... rest of config
};
```

---

## 📍 Using the Map Component

### Basic Map with Locations

```typescript
import { MapContainerComponent } from './features/travel/components/map-container/map-container';
import { Component } from '@angular/core';

@Component({
  selector: 'app-destination-map',
  standalone: true,
  imports: [MapContainerComponent],
  template: `
    <app-map-container
      [locations]="locations"
      [center]="{ lat: 48.8566, lng: 2.3522 }"
      [zoom]="12"
      (locationSelected)="handleLocationSelected($event)"
    ></app-map-container>
  `,
})
export class DestinationMapComponent {
  locations = [
    {
      id: '1',
      name: 'Eiffel Tower',
      lat: 48.8584,
      lng: 2.2945,
      type: 'tourist_site' as const,
      rating: 4.7,
      description: 'Iconic iron lattice tower',
    },
    {
      id: '2',
      name: 'Le Jules Verne',
      lat: 48.8585,
      lng: 2.2946,
      type: 'restaurant' as const,
      rating: 4.5,
      description: 'Michelin-starred restaurant',
    },
  ];

  handleLocationSelected(location: any) {
    console.log('Selected location:', location);
  }
}
```

---

## 🔍 Using the Google Maps Service Directly

### Search for Nearby Places

```typescript
import { GoogleMapsService } from './core/services/google-maps.service';
import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  template: `<div #mapElement></div>`
})
export class SearchComponent {
  @ViewChild('mapElement') mapElement!: ElementRef;

  constructor(private googleMapsService: GoogleMapsService) {}

  async searchRestaurants() {
    const map = await this.googleMapsService.initializeMap(
      this.mapElement.nativeElement,
      { center: { lat: 48.8566, lng: 2.3522 }, zoom: 13 }
    );

    const restaurants = await this.googleMapsService.searchNearby(
      map,
      { lat: 48.8566, lng: 2.3522 },
      'restaurant',
      5000 // 5km
    );

    console.log('Found restaurants:', restaurants);
  }
}
```

### Get Directions Between Two Points

```typescript
async getDirections() {
  const directions = await this.googleMapsService.getDirections(
    { lat: 48.8566, lng: 2.3522 }, // Paris
    { lat: 48.8584, lng: 2.2945 }, // Eiffel Tower
    'WALKING'
  );

  if (directions) {
    console.log('Route:', directions.routes[0]);
  }
}
```

### Autocomplete Address Search

```typescript
async searchAddress(input: string) {
  const predictions = await this.googleMapsService.autocompleteSearch(input);

  console.log('Suggestions:', predictions.map(p => p.description));

  // User clicks a suggestion, get details
  if (predictions.length > 0) {
    const place = await this.googleMapsService.getPlaceDetails(
      predictions[0].place_id
    );
    console.log('Place details:', place);
  }
}
```

---

## 🌐 Using the Travel API Service

### Get Destinations and Show on Map

```typescript
import { TravelApiService } from './features/travel/services/travel-api.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-destination-selector',
  template: `
    <div>
      <input
        #searchInput
        (keyup)="searchDestinations(searchInput.value)"
        placeholder="Search destinations..."
      />
      <ul>
        <li *ngFor="let dest of searchResults" (click)="selectDestination(dest)">
          {{ dest.name }}, {{ dest.country }}
        </li>
      </ul>

      <app-map-container
        *ngIf="selectedDestination"
        [locations]="locationList"
        [center]="mapCenter"
      ></app-map-container>
    </div>
  `,
})
export class DestinationSelectorComponent implements OnInit {
  searchResults: any[] = [];
  selectedDestination: any;
  locationList: any[] = [];
  mapCenter = { lat: 20, lng: 0 };

  constructor(private travelApi: TravelApiService) {}

  ngOnInit() {
    // Load popular destinations on init
    this.travelApi.getPopularDestinations().subscribe(response => {
      this.searchResults = response.data || [];
    });
  }

  searchDestinations(query: string) {
    if (!query.trim()) {
      this.travelApi.getPopularDestinations().subscribe(response => {
        this.searchResults = response.data || [];
      });
      return;
    }

    this.travelApi.searchDestinations(query).subscribe(response => {
      this.searchResults = response.data || [];
    });
  }

  selectDestination(destination: any) {
    this.selectedDestination = destination;
    this.mapCenter = { lat: destination.lat, lng: destination.lng };

    // Load all locations for this destination
    this.travelApi
      .getDestinationLocations(destination.id)
      .subscribe(response => {
        this.locationList = (response.data || []).map((loc: any) => ({
          ...loc,
          description: `${loc.category} - Rating: ${loc.rating}⭐`,
        }));
      });
  }
}
```

### Create a Trip and Get Routes

```typescript
async planTrip() {
  // 1. Create a trip
  const trip$ = this.travelApi.createTrip({
    userId: 'user_123',
    name: 'Paris Adventure',
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-02-20'),
    destinationId: 'dest_paris',
    budget: 3000,
  });

  trip$.subscribe(async (response) => {
    const tripId = response.data?.id;

    // 2. Generate itinerary
    const itinerary$ = this.travelApi.generateItinerary(
      tripId!,
      5, // 5 days
      ['museums', 'restaurants', 'shopping']
    );

    itinerary$.subscribe(itineraryResponse => {
      console.log('Itinerary:', itineraryResponse.data);
    });

    // 3. Get flight options
    const flights$ = this.travelApi.searchRoutes(
      tripId!,
      'flight',
      '2024-02-15'
    );

    flights$.subscribe(flightResponse => {
      console.log('Flight options:', flightResponse.data);
      console.log('Cheapest:', flightResponse.summary?.cheapest);
      console.log('Fastest:', flightResponse.summary?.fastest);
    });
  });
}
```

### Get Weather Forecast

```typescript
getWeatherForecast(destinationId: string) {
  this.travelApi
    .getWeatherForecast(destinationId, 7) // 7-day forecast
    .subscribe(response => {
      console.log('Current weather:', response.data.current);
      console.log('Forecast:', response.data.forecast);

      // Display weather in your component
      this.weather = response.data;
    });
}
```

---

## 📊 Full Example: Complete Map Page

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapContainerComponent } from './components/map-container/map-container';
import { TravelApiService } from './services/travel-api.service';

@Component({
  selector: 'app-travel-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MapContainerComponent],
  template: `
    <div class="travel-map-container">
      <div class="sidebar">
        <h2>Explore Destinations</h2>

        <input
          type="text"
          [(ngModel)]="searchQuery"
          (keyup)="searchDestinations()"
          placeholder="Search cities..."
          class="search-input"
        />

        <div class="results">
          <div
            *ngFor="let dest of destinations"
            (click)="selectDestination(dest)"
            class="destination-card"
            [class.selected]="selectedDestination?.id === dest.id"
          >
            <h4>{{ dest.name }}</h4>
            <p>{{ dest.country }}</p>
            <small>{{ dest.description }}</small>
          </div>
        </div>

        <div *ngIf="selectedDestination" class="destination-details">
          <h3>{{ selectedDestination.name }}</h3>
          <p>{{ selectedDestination.description }}</p>
          <button (click)="planTrip()">Plan Trip</button>
        </div>
      </div>

      <div class="map-wrapper">
        <app-map-container
          *ngIf="selectedDestination"
          [locations]="locations"
          [center]="{ lat: selectedDestination.lat, lng: selectedDestination.lng }"
          [zoom]="12"
          (locationSelected)="onLocationSelected($event)"
        ></app-map-container>
      </div>

      <div *ngIf="selectedLocation" class="location-panel">
        <h3>{{ selectedLocation.name }}</h3>
        <p class="type">{{ selectedLocation.type }}</p>
        <p class="rating">{{ selectedLocation.rating }}⭐</p>
        <p>{{ selectedLocation.description }}</p>
        <button (click)="addToItinerary()">Add to Trip</button>
      </div>
    </div>
  `,
  styles: [
    `
      .travel-map-container {
        display: grid;
        grid-template-columns: 300px 1fr 250px;
        gap: 16px;
        height: 100vh;
        padding: 16px;
      }

      .sidebar,
      .location-panel {
        background: white;
        border-radius: 8px;
        padding: 16px;
        overflow-y: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .map-wrapper {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .search-input {
        width: 100%;
        padding: 10px;
        margin-bottom: 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .destination-card {
        padding: 12px;
        margin-bottom: 8px;
        border: 2px solid #eee;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .destination-card:hover {
        border-color: #007bff;
        background: #f8f9ff;
      }

      .destination-card.selected {
        border-color: #007bff;
        background: #e7f1ff;
      }

      .destination-card h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
      }

      .destination-card p {
        margin: 0;
        font-size: 12px;
        color: #666;
      }

      .destination-card small {
        display: block;
        margin-top: 4px;
        font-size: 11px;
        color: #999;
      }

      .destination-details {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #eee;
      }

      .destination-details h3 {
        margin: 0 0 8px 0;
      }

      .destination-details button {
        width: 100%;
        padding: 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 12px;
      }

      .location-panel h3 {
        margin: 0 0 8px 0;
      }

      .location-panel .type {
        font-size: 12px;
        color: #666;
        margin: 4px 0;
        text-transform: capitalize;
      }

      .location-panel .rating {
        font-size: 14px;
        font-weight: 600;
        margin: 4px 0;
      }

      @media (max-width: 1200px) {
        .travel-map-container {
          grid-template-columns: 1fr;
        }

        .sidebar,
        .location-panel {
          display: none;
        }
      }
    `,
  ],
})
export class TravelMapComponent implements OnInit {
  searchQuery = '';
  destinations: any[] = [];
  selectedDestination: any;
  locations: any[] = [];
  selectedLocation: any;

  constructor(private travelApi: TravelApiService) {}

  ngOnInit() {
    this.loadPopularDestinations();
  }

  loadPopularDestinations() {
    this.travelApi.getPopularDestinations().subscribe(response => {
      this.destinations = response.data || [];
    });
  }

  searchDestinations() {
    if (!this.searchQuery.trim()) {
      this.loadPopularDestinations();
      return;
    }

    this.travelApi.searchDestinations(this.searchQuery).subscribe(response => {
      this.destinations = response.data || [];
    });
  }

  selectDestination(destination: any) {
    this.selectedDestination = destination;
    this.selectedLocation = null;
    this.loadDestinationLocations();
  }

  loadDestinationLocations() {
    this.travelApi
      .getDestinationLocations(this.selectedDestination.id)
      .subscribe(response => {
        this.locations = (response.data || []).map((loc: any) => ({
          ...loc,
          description: `${loc.category} • ${loc.reviewsCount} reviews`,
        }));
      });
  }

  onLocationSelected(location: any) {
    this.selectedLocation = location;
  }

  planTrip() {
    // Navigate to trip planning page or open modal
    console.log('Planning trip to:', this.selectedDestination.name);
  }

  addToItinerary() {
    console.log('Adding to itinerary:', this.selectedLocation.name);
  }
}
```

---

## ✅ Checklist

- [ ] Google Maps API Key obtained
- [ ] API Key added to `src/environments/environment.ts`
- [ ] All required APIs enabled in Google Cloud Console
- [ ] Domain whitelisted in API key restrictions
- [ ] Server running: `npm run serve:ssr:guide-me`
- [ ] Test map component loads without errors
- [ ] Browser console shows no API errors

---

## 🧪 Testing

### Test the Service:
```bash
# In browser console:
# 1. Check health
fetch('http://localhost:4000/api/v1/health')
  .then(r => r.json())
  .then(d => console.log(d))

# 2. Get popular destinations
fetch('http://localhost:4000/api/v1/destinations/popular')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Test the Component:
1. Create a component that uses `MapContainerComponent`
2. Verify map renders
3. Verify markers appear
4. Click markers to show info
5. Toggle filters to hide/show location types

---

## 📚 Next Steps

1. ✅ Get Google Maps API Key
2. ✅ Add to environment configuration
3. 🔄 **Build destination search page**
4. 🔄 Build itinerary generator
5. 🔄 Build trip details page
6. 🔄 Build route/transportation comparison page

---

## 🆘 Troubleshooting

**Map not showing?**
- Check API key in environment
- Check browser console for errors
- Verify Google Maps API is enabled in Cloud Console

**Markers not appearing?**
- Check locations array has valid data
- Verify lat/lng are numbers
- Check console for JavaScript errors

**Autocomplete not working?**
- Verify Places API is enabled
- Check API key restrictions include Places API

**Can't find restaurants?**
- Verify searchNearby is called with correct coordinates
- Check the type parameter matches actual place types

---

## 📖 Documentation

- [Full API Documentation](./API_DOCUMENTATION.md)
- [Google Maps Setup Guide](./GOOGLE_MAPS_SETUP.md)
- [Service Methods Reference](./src/app/core/services/google-maps.service.ts)
