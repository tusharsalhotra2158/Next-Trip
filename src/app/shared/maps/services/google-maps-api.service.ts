import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsApiService {
  private static readonly SCRIPT_ID = 'google-maps-script';
  private static readonly API_URL = 'https://maps.googleapis.com/maps/api/js';
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;

  constructor() {
    this.checkIfAlreadyLoaded();
  }

  /**
   * Load Google Maps API script dynamically
   * @returns Promise that resolves when Google Maps API is loaded
   */
  loadGoogleMapsApi(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      if (window.google?.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = GoogleMapsApiService.SCRIPT_ID;
      script.src = this.buildApiUrl();
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        this.loadPromise = null;
        resolve();
      };

      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Check if Google Maps API is already loaded
   */
  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps;
  }

  /**
   * Get the Google Maps API instance
   */
  getGoogle(): any {
    if (!window.google?.maps) {
      throw new Error('Google Maps API not loaded. Call loadGoogleMapsApi() first.');
    }
    return window.google;
  }

  /**
   * Build the Google Maps API URL with parameters
   */
  private buildApiUrl(): string {
    const params = new URLSearchParams();

    if (!environment.googleMaps?.apiKey) {
      console.warn('Google Maps API key not configured in environment');
    }

    params.append('key', environment.googleMaps?.apiKey || '');
    params.append('libraries', 'places,geometry,drawing,visualization');
    params.append('v', 'weekly');

    // Add language if configured
    if (environment.googleMaps?.language) {
      params.append('language', environment.googleMaps.language);
    }

    // Add region if configured
    if (environment.googleMaps?.region) {
      params.append('region', environment.googleMaps.region);
    }

    return `${GoogleMapsApiService.API_URL}?${params.toString()}`;
  }

  /**
   * Check if the script is already loaded in the DOM
   */
  private checkIfAlreadyLoaded(): void {
    if (window.google?.maps) {
      this.isLoaded = true;
    }

    const scriptElement = document.getElementById(GoogleMapsApiService.SCRIPT_ID);
    if (scriptElement && window.google?.maps) {
      this.isLoaded = true;
    }
  }

  /**
   * Unload Google Maps API (for cleanup in tests or special cases)
   */
  unloadGoogleMapsApi(): void {
    const script = document.getElementById(GoogleMapsApiService.SCRIPT_ID);
    if (script) {
      script.remove();
    }
    this.isLoaded = false;
    this.loadPromise = null;
  }
}
