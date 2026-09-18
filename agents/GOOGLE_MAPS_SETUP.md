# Google Maps API Integration Setup Guide

## Overview

This travel app uses Google Maps API for location mapping, place search, autocomplete, and routing. Follow this guide to set up your API keys.

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Enter project name: `travel-app` (or your preferred name)
4. Click **Create**
5. Wait for project creation to complete

---

## Step 2: Enable Required APIs

In your Google Cloud Project, enable the following APIs:

### Required APIs:
1. **Maps JavaScript API** - For map rendering
2. **Places API** - For location search and details
3. **Directions API** - For route directions
4. **Distance Matrix API** - For distance calculations
5. **Geocoding API** - For address lookups

### How to enable:
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for each API and click **Enable**

---

## Step 3: Create an API Key

### For Web Application:
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy your API Key

### Restrict Your API Key:
1. Click on your API key
2. Under **Application restrictions**, select **HTTP referrers (web sites)**
3. Add your domain(s):
   ```
   localhost:*
   localhost:4000
   localhost:4200
   yourdomain.com/*
   ```
4. Under **API restrictions**, select **Restrict key**
5. Select all the APIs you enabled above
6. Click **Save**

---

## Step 4: Add API Key to Environment Configuration

Open `src/environments/environment.ts` and add your API key:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api/v1',

  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY_HERE', // ← Add your key here
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 4,
  },
  // ... rest of config
};
```

For production, also update `src/environments/environment.prod.ts` (create it if it doesn't exist):

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com/api/v1',

  googleMaps: {
    apiKey: 'YOUR_PRODUCTION_API_KEY',
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 4,
  },
  // ... rest of config
};
```

---

## Step 5: Alternative - Using Environment Variables (Recommended for Production)

Instead of hardcoding the API key, use environment variables:

### Create `.env.local` in your project root:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Update your environment file to read from environment:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api/v1',

  googleMaps: {
    apiKey: import.meta.env['NG_APP_GOOGLE_MAPS_API_KEY'] || '',
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 4,
  },
};
```

### Build/Run with environment variable:
```bash
NG_APP_GOOGLE_MAPS_API_KEY=your_api_key npm run serve:ssr:guide-me
```

---

## Step 6: Using the Google Maps Service

The app provides a `GoogleMapsService` in `src/app/core/services/google-maps.service.ts` with utility methods:

### Initialize a Map:
```typescript
import { GoogleMapsService } from './core/services/google-maps.service';

constructor(private googleMapsService: GoogleMapsService) {}

async initMap() {
  const map = await this.googleMapsService.initializeMap(
    mapElement,
    {
      center: { lat: 48.8566, lng: 2.3522 }, // Paris
      zoom: 12
    }
  );
}
```

### Add Markers:
```typescript
const marker = await this.googleMapsService.addMarker(
  map,
  { lat: 48.8584, lng: 2.2945 },
  'Eiffel Tower',
  { icon: '🗼' }
);
```

### Search Nearby Places:
```typescript
const restaurants = await this.googleMapsService.searchNearby(
  map,
  { lat: 48.8566, lng: 2.3522 },
  'restaurant',
  5000 // 5km radius
);
```

### Get Directions:
```typescript
const directions = await this.googleMapsService.getDirections(
  { lat: 48.8566, lng: 2.3522 }, // Paris
  { lat: 48.8584, lng: 2.2945 }, // Eiffel Tower
  'WALKING'
);
```

### Autocomplete Search:
```typescript
const predictions = await this.googleMapsService.autocompleteSearch('Paris');
```

---

## Step 7: Use the Map Container Component

The app provides a pre-built `MapContainerComponent` for displaying maps:

```typescript
import { MapContainerComponent } from './features/travel/components/map-container/map-container';

@Component({
  template: `
    <app-map-container
      [locations]="restaurantLocations"
      [center]="{ lat: 48.8566, lng: 2.3522 }"
      [zoom]="12"
      (locationSelected)="onLocationSelected($event)"
    ></app-map-container>
  `,
})
export class MyComponent {
  restaurantLocations = [
    {
      id: 'rest_1',
      name: 'Le Jules Verne',
      lat: 48.8584,
      lng: 2.2945,
      type: 'restaurant' as const,
      rating: 4.5,
      description: 'Michelin-starred restaurant in the Eiffel Tower',
    },
    // ... more locations
  ];

  onLocationSelected(location: MapLocation) {
    console.log('Selected:', location);
  }
}
```

---

## Available Google Maps Service Methods

### Map Management
- `initializeMap(element, options)` - Initialize a map instance
- `fitBoundsToMarkers(map, markers)` - Auto-zoom to fit all markers

### Markers & Info Windows
- `addMarker(map, position, title, options)` - Add a marker
- `addInfoWindow(marker, content)` - Add click-triggered info window

### Drawing
- `drawPolyline(map, path, options)` - Draw a route/path

### Directions & Distance
- `getDirections(origin, destination, mode)` - Get route directions
- `getDistanceMatrix(origins, destinations, mode)` - Get distances between multiple points

### Places Search
- `searchNearby(map, location, type, radius)` - Find nearby places
- `getPlaceDetails(placeId)` - Get detailed place information
- `autocompleteSearch(input, options)` - Autocomplete place names

### Geocoding
- `geocodeAddress(address)` - Convert address to coordinates
- `reverseGeocode(lat, lng)` - Convert coordinates to address

### Utilities
- `calculateDistance(pointA, pointB)` - Distance in meters using Haversine formula

---

## Pricing

Google Maps API pricing (as of 2024):

| API | Free Tier | Paid |
|-----|-----------|------|
| Maps JavaScript API | $7 per 1000 loads | Pay-as-you-go |
| Places API | Limited | $7-15 per 1000 requests |
| Directions API | $5 per 1000 requests | Pay-as-you-go |
| Distance Matrix API | $5 per 1000 requests | Pay-as-you-go |
| Geocoding API | $5 per 1000 requests | Pay-as-you-go |

**Free Monthly Credit:** Google provides a $200 free monthly credit (renewed monthly)

For cost estimation, use the [Google Maps Pricing Calculator](https://cloud.google.com/maps-platform/pricing/sheet)

---

## Common Issues & Solutions

### Issue: Maps not showing / blank
**Solution:**
- Check API key is valid and enabled in Google Cloud
- Verify domain is whitelisted in API key restrictions
- Check browser console for CORS errors
- Ensure `googleMaps.apiKey` is set in environment.ts

### Issue: "Unauthorized Map Object" error
**Solution:**
- API key is invalid or not enabled
- Using Google Maps JavaScript API v3 (deprecated)
- Ensure all required APIs are enabled in Google Cloud

### Issue: Autocomplete/Places not working
**Solution:**
- Places API not enabled in Google Cloud
- Try enabling "Places API (New)" instead of legacy "Places API"
- Check API key restrictions include Places API

### Issue: Directions/Distance Matrix not working
**Solution:**
- Directions API or Distance Matrix API not enabled
- Check API key has these services in restrictions

### Issue: CORS errors
**Solution:**
- Google Maps API is server-side, CORS shouldn't be an issue
- If using proxy, ensure it's configured correctly
- Check backend CORS headers are allowing the request

---

## Testing

### Test with cURL:
```bash
# Test the service (it will attempt to load the map)
curl http://localhost:4000/api/v1/health

# Test backend destinations
curl http://localhost:4000/api/v1/destinations/popular
```

### Test in Browser:
1. Run the app: `npm run serve:ssr:guide-me`
2. Navigate to a page with the map component
3. Open DevTools → Network tab
4. Look for `maps.googleapis.com` requests
5. Verify they return 200 status

---

## Next Steps

1. **Get API Key** - Follow Steps 1-3 above
2. **Add to Environment** - Follow Step 4
3. **Build Components** - Use MapContainerComponent or GoogleMapsService
4. **Test** - Run the dev server and verify map loads

---

## Additional Resources

- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Key Security Best Practices](https://developers.google.com/maps/api-key-best-practices)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)

---

## Support

If you encounter issues:
1. Check the [Google Maps API Status](https://status.cloud.google.com/)
2. Review [Google Maps Common Issues](https://developers.google.com/maps/documentation/javascript/error-messages)
3. Check the browser console for detailed error messages
