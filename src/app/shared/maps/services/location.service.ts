import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { GeolocationPosition, GeolocationError } from '../models/location.models';
import { LatLng } from '../models/map.models';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private currentLocation$ = new BehaviorSubject<GeolocationPosition | null>(null);
  private locationError$ = new BehaviorSubject<GeolocationError | null>(null);
  private isWatching = false;
  private watchId: number | null = null;

  constructor() {
    this.checkGeolocationSupport();
  }

  /**
   * Check if geolocation is supported
   */
  isGeolocationSupported(): boolean {
    return !!navigator.geolocation;
  }

  /**
   * Get current user location (one-time)
   */
  getCurrentLocation(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        const error: GeolocationError = {
          code: 'UNKNOWN',
          message: 'Geolocation is not supported by your browser',
          timestamp: Date.now(),
        };
        this.locationError$.next(error);
        reject(error);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.currentLocation$.next(geoPosition);
          resolve(geoPosition);
        },
        (error) => {
          const geoError = this.mapGeolocationError(error);
          this.locationError$.next(geoError);
          reject(geoError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Watch user location (continuous updates)
   */
  watchLocation(options?: PositionOptions): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      if (!this.isGeolocationSupported()) {
        const error: GeolocationError = {
          code: 'UNKNOWN',
          message: 'Geolocation is not supported by your browser',
          timestamp: Date.now(),
        };
        this.locationError$.next(error);
        observer.error(error);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      };

      if (this.isWatching) {
        observer.error(new Error('Already watching location'));
        return;
      }

      this.isWatching = true;

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.currentLocation$.next(geoPosition);
          observer.next(geoPosition);
        },
        (error) => {
          const geoError = this.mapGeolocationError(error);
          this.locationError$.next(geoError);
          observer.error(geoError);
        },
        defaultOptions
      );

      return () => {
        this.stopWatchingLocation();
      };
    });
  }

  /**
   * Stop watching location
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * Get current location as Observable
   */
  getCurrentLocationAsObservable(): Observable<GeolocationPosition | null> {
    return this.currentLocation$.asObservable();
  }

  /**
   * Get location errors as Observable
   */
  getLocationErrors(): Observable<GeolocationError | null> {
    return this.locationError$.asObservable();
  }

  /**
   * Get current location value synchronously
   */
  getCurrentLocationValue(): GeolocationPosition | null {
    return this.currentLocation$.value;
  }

  /**
   * Get current location as LatLng
   */
  getCurrentLocationAsLatLng(): LatLng | null {
    const location = this.currentLocation$.value;
    if (!location) return null;

    return {
      lat: location.latitude,
      lng: location.longitude,
    };
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(from: LatLng, to: LatLng): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Check if user is within a radius of a location
   */
  isWithinRadius(userLocation: LatLng, targetLocation: LatLng, radiusKm: number): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation);
    return distance <= radiusKm;
  }

  /**
   * Map geolocation error to our error model
   */
  private mapGeolocationError(error: GeolocationPositionError): GeolocationError {
    let code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN' =
      'UNKNOWN';
    let message = 'An unknown error occurred';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        code = 'PERMISSION_DENIED';
        message = 'Permission to access location was denied';
        break;
      case error.POSITION_UNAVAILABLE:
        code = 'POSITION_UNAVAILABLE';
        message = 'Position information is unavailable';
        break;
      case error.TIMEOUT:
        code = 'TIMEOUT';
        message = 'The request to get user location timed out';
        break;
    }

    return {
      code,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * Check geolocation support and log warning if not available
   */
  private checkGeolocationSupport(): void {
    if (!this.isGeolocationSupported()) {
      console.warn('Geolocation is not supported by this browser');
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopWatchingLocation();
  }
}
