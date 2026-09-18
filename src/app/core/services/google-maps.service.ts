import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private scriptLoaded = false;
  private loadScript$ = this.loadGoogleMapsScript();

  constructor() {}

  private loadGoogleMapsScript() {
    if (this.scriptLoaded) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      if (window.google?.maps) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMaps.apiKey}&libraries=places,geometry,directions`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  async initializeMap(mapElement: HTMLElement, options: any = {}): Promise<any> {
    await this.loadScript$;

    const defaultOptions: any = {
      center: environment.googleMaps.defaultCenter,
      zoom: environment.googleMaps.defaultZoom,
      ...options,
    };

    return new window.google.maps.Map(mapElement, defaultOptions);
  }

  async addMarker(
    map: any,
    position: any,
    title: string,
    options?: any,
  ): Promise<any> {
    await this.loadScript$;

    return new window.google.maps.Marker({
      position,
      map,
      title,
      ...options,
    });
  }

  async addMarkerClusterer(map: any, markers: any[]): Promise<any> {
    await this.loadScript$;
    return markers;
  }

  async addInfoWindow(marker: any, content: string): Promise<any> {
    await this.loadScript$;

    const infoWindow = new window.google.maps.InfoWindow({
      content,
    });

    marker.addListener('click', () => {
      infoWindow.open(marker.getMap(), marker);
    });

    return infoWindow;
  }

  async drawPolyline(
    map: any,
    path: any[],
    options?: any,
  ): Promise<any> {
    await this.loadScript$;

    return new window.google.maps.Polyline({
      path,
      map,
      strokeColor: '#FF0000',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      ...options,
    });
  }

  async getDirections(
    origin: any,
    destination: any,
    mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' = 'DRIVING',
  ): Promise<any> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const service = new window.google.maps.DirectionsService();
      service.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode[mode],
        },
        (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  async getDistanceMatrix(
    origins: any[],
    destinations: any[],
    mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' = 'DRIVING',
  ): Promise<any> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins,
          destinations,
          travelMode: window.google.maps.TravelMode[mode],
        },
        (response: any, status: any) => {
          if (status === window.google.maps.DistanceMatrixStatus.OK) {
            resolve(response);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  async searchNearby(
    map: any,
    location: any,
    placeType: string,
    radius: number = 5000,
  ): Promise<any[]> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const service = new window.google.maps.places.PlacesService(map);
      const request = {
        location,
        radius,
        type: placeType,
      };

      service.nearbySearch(request, (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          resolve([]);
        }
      });
    });
  }

  async getPlaceDetails(placeId: string): Promise<any> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div'),
      );
      const request = {
        placeId,
        fields: [
          'name',
          'formatted_address',
          'geometry',
          'photos',
          'rating',
          'review',
          'website',
          'phone',
          'opening_hours',
        ],
      };

      service.getDetails(request, (place: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          resolve(null);
        }
      });
    });
  }

  async autocompleteSearch(input: string, options?: any): Promise<any[]> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'us' },
          ...options,
        },
        (predictions: any, status: any) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            resolve(predictions);
          } else {
            resolve([]);
          }
        },
      );
    });
  }

  calculateDistance(pointA: any, pointB: any): number {
    if (!window.google?.maps?.geometry) {
      return 0;
    }

    const latLngA = new window.google.maps.LatLng(pointA.lat, pointA.lng);
    const latLngB = new window.google.maps.LatLng(pointB.lat, pointB.lng);

    return window.google.maps.geometry.spherical.computeDistanceBetween(
      latLngA,
      latLngB,
    );
  }

  async fitBoundsToMarkers(map: any, markers: any[]): Promise<void> {
    await this.loadScript$;

    const bounds = new window.google.maps.LatLngBounds();

    markers.forEach((marker) => {
      bounds.extend(marker.getPosition());
    });

    map.fitBounds(bounds);
  }

  async reverseGeocode(lat: number, lng: number): Promise<any[]> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        (results: any, status: any) => {
          if (status === window.google.maps.GeocoderStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        },
      );
    });
  }

  async geocodeAddress(address: string): Promise<any[]> {
    await this.loadScript$;

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === window.google.maps.GeocoderStatus.OK && results) {
          resolve(results);
        } else {
          resolve([]);
        }
      });
    });
  }
}
