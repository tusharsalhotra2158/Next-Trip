import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GoogleMapsApiService } from './google-maps-api.service';
import {
  ForwardGeocodeRequest,
  ReverseGeocodeRequest,
  GeocodeResult,
  GeocodeStatus,
  DistanceMatrixRequest,
  DistanceMatrixElement,
  AddressComponent,
} from '../models/location.models';
import { LatLng } from '../models/map.models';

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private geocoder: google.maps.Geocoder | null = null;
  private distanceMatrixService: google.maps.DistanceMatrixService | null = null;

  constructor(private googleMapsApi: GoogleMapsApiService) {}

  /**
   * Initialize geocoding service
   */
  private async initializeGeocoder(): Promise<void> {
    if (this.geocoder) return;

    await this.googleMapsApi.loadGoogleMapsApi();
    const google = this.googleMapsApi.getGoogle();
    this.geocoder = new google.maps.Geocoder();
  }

  /**
   * Initialize distance matrix service
   */
  private async initializeDistanceMatrixService(): Promise<void> {
    if (this.distanceMatrixService) return;

    await this.googleMapsApi.loadGoogleMapsApi();
    const google = this.googleMapsApi.getGoogle();
    this.distanceMatrixService = new google.maps.DistanceMatrixService();
  }

  /**
   * Forward geocode: Convert address to coordinates
   */
  forwardGeocode(request: ForwardGeocodeRequest): Observable<GeocodeResult[]> {
    return from(this.performForwardGeocode(request)).pipe(
      catchError((error) => {
        console.error('Forward geocoding failed:', error);
        return throwError(() => new Error('Geocoding failed'));
      })
    );
  }

  /**
   * Reverse geocode: Convert coordinates to address
   */
  reverseGeocode(request: ReverseGeocodeRequest): Observable<GeocodeResult[]> {
    return from(this.performReverseGeocode(request)).pipe(
      catchError((error) => {
        console.error('Reverse geocoding failed:', error);
        return throwError(() => new Error('Reverse geocoding failed'));
      })
    );
  }

  /**
   * Get distance matrix between origins and destinations
   */
  getDistanceMatrix(request: DistanceMatrixRequest): Observable<{
    origins: string[];
    destinations: string[];
    rows: Array<{ elements: DistanceMatrixElement[] }>;
    status: string;
  }> {
    return from(this.performDistanceMatrixRequest(request)).pipe(
      catchError((error) => {
        console.error('Distance matrix request failed:', error);
        return throwError(() => new Error('Distance matrix request failed'));
      })
    );
  }

  /**
   * Perform forward geocoding
   */
  private async performForwardGeocode(request: ForwardGeocodeRequest): Promise<GeocodeResult[]> {
    await this.initializeGeocoder();

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        {
          address: request.address,
          bounds: request.bounds,
          componentRestrictions: request.componentRestrictions,
          region: request.region,
          language: request.language,
        },
        (results, status) => {
          if (status === 'OK' && results) {
            const geocodeResults = this.parseGeocodeResults(results);
            resolve(geocodeResults);
          } else if (status === 'ZERO_RESULTS') {
            resolve([]);
          } else {
            reject(new Error(`Geocoding failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Perform reverse geocoding
   */
  private async performReverseGeocode(
    request: ReverseGeocodeRequest
  ): Promise<GeocodeResult[]> {
    await this.initializeGeocoder();

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const google = this.googleMapsApi.getGoogle();

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        {
          location: new google.maps.LatLng(request.location.lat, request.location.lng),
          language: request.language,
          region: request.region,
        },
        (results, status) => {
          if (status === 'OK' && results) {
            const geocodeResults = this.parseGeocodeResults(results);
            resolve(geocodeResults);
          } else if (status === 'ZERO_RESULTS') {
            resolve([]);
          } else {
            reject(new Error(`Reverse geocoding failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Perform distance matrix request
   */
  private async performDistanceMatrixRequest(
    request: DistanceMatrixRequest
  ): Promise<{
    origins: string[];
    destinations: string[];
    rows: Array<{ elements: DistanceMatrixElement[] }>;
    status: string;
  }> {
    await this.initializeDistanceMatrixService();

    if (!this.distanceMatrixService) {
      throw new Error('Distance Matrix Service not initialized');
    }

    const google = this.googleMapsApi.getGoogle();

    return new Promise((resolve, reject) => {
      this.distanceMatrixService!.getDistanceMatrix(
        {
          origins: request.origins.map((origin) =>
            typeof origin === 'string' ? origin : new google.maps.LatLng(origin.lat, origin.lng)
          ),
          destinations: request.destinations.map((destination) =>
            typeof destination === 'string'
              ? destination
              : new google.maps.LatLng(destination.lat, destination.lng)
          ),
          travelMode: google.maps.TravelMode[request.travelMode],
          unitSystem: request.unitSystem
            ? google.maps.UnitSystem[request.unitSystem]
            : undefined,
          avoidHighways: request.avoidHighways,
          avoidTolls: request.avoidTolls,
          avoidFerries: request.avoidFerries,
          transitOptions: request.transitOptions,
        },
        (response, status) => {
          if (status === 'OK' && response) {
            resolve(this.parseDistanceMatrixResponse(response, status));
          } else {
            reject(new Error(`Distance Matrix request failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Parse geocode results from Google API
   */
  private parseGeocodeResults(results: google.maps.GeocoderResult[]): GeocodeResult[] {
    return results.map((result) => this.parseGeocoderResult(result));
  }

  /**
   * Parse single geocoder result
   */
  private parseGeocoderResult(result: google.maps.GeocoderResult): GeocodeResult {
    const location = result.geometry.location;

    return {
      address: result.formatted_address,
      formattedAddress: result.formatted_address,
      location: {
        lat: location.lat(),
        lng: location.lng(),
      },
      types: result.types,
      addressComponents: this.parseAddressComponents(result.address_components),
      geometry: {
        location: {
          lat: location.lat(),
          lng: location.lng(),
        },
        bounds: result.geometry.bounds
          ? {
              northeast: {
                lat: result.geometry.bounds.getNorthEast().lat(),
                lng: result.geometry.bounds.getNorthEast().lng(),
              },
              southwest: {
                lat: result.geometry.bounds.getSouthWest().lat(),
                lng: result.geometry.bounds.getSouthWest().lng(),
              },
            }
          : undefined,
        locationType: result.geometry.location_type,
        viewport: {
          northeast: {
            lat: result.geometry.viewport.getNorthEast().lat(),
            lng: result.geometry.viewport.getNorthEast().lng(),
          },
          southwest: {
            lat: result.geometry.viewport.getSouthWest().lat(),
            lng: result.geometry.viewport.getSouthWest().lng(),
          },
        },
      },
      placeId: result.place_id,
      partialMatch: result.partial_match,
      plusCode: result.plus_code
        ? {
            globalCode: result.plus_code.global_code,
            compoundCode: result.plus_code.compound_code,
          }
        : undefined,
    };
  }

  /**
   * Parse address components
   */
  private parseAddressComponents(
    components: google.maps.GeocoderAddressComponent[]
  ): AddressComponent[] {
    return components.map((component) => ({
      longName: component.long_name,
      shortName: component.short_name,
      types: component.types,
    }));
  }

  /**
   * Parse distance matrix response
   */
  private parseDistanceMatrixResponse(
    response: google.maps.DistanceMatrixResponse,
    status: google.maps.DistanceMatrixStatusString
  ): {
    origins: string[];
    destinations: string[];
    rows: Array<{ elements: DistanceMatrixElement[] }>;
    status: string;
  } {
    return {
      origins: response.originAddresses,
      destinations: response.destinationAddresses,
      rows: response.rows.map((row) => ({
        elements: row.elements.map((element) => ({
          distance: {
            value: element.distance?.value || 0,
            text: element.distance?.text || '',
          },
          duration: {
            value: element.duration?.value || 0,
            text: element.duration?.text || '',
          },
          durationInTraffic: element.duration_in_traffic
            ? {
                value: element.duration_in_traffic.value,
                text: element.duration_in_traffic.text,
              }
            : undefined,
          status: element.status as
            | 'OK'
            | 'NOT_FOUND'
            | 'ZERO_RESULTS'
            | 'MAX_ROUTE_LENGTH_EXCEEDED',
        })),
      })),
      status,
    };
  }

  /**
   * Parse address string from components
   */
  parseAddressFromComponents(components: AddressComponent[]): {
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    country?: string;
  } {
    const result: any = {};

    components.forEach((component) => {
      if (component.types.includes('street_number')) {
        result.streetNumber = component.longName;
      }
      if (component.types.includes('route')) {
        result.route = component.longName;
      }
      if (component.types.includes('locality')) {
        result.locality = component.longName;
      }
      if (component.types.includes('administrative_area_level_1')) {
        result.administrativeArea = component.longName;
      }
      if (component.types.includes('postal_code')) {
        result.postalCode = component.longName;
      }
      if (component.types.includes('country')) {
        result.country = component.longName;
      }
    });

    return result;
  }
}
