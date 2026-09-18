import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GoogleMapsApiService } from './google-maps-api.service';
import { DirectionsRequest, RouteSummary, RouteSegment, RouteStep, TravelMode } from '../models/directions.models';
import { LatLng } from '../models/map.models';

@Injectable({
  providedIn: 'root',
})
export class DirectionsService {
  private directionsService: google.maps.DirectionsService | null = null;

  constructor(private googleMapsApi: GoogleMapsApiService) {}

  /**
   * Initialize directions service
   */
  private async initializeDirectionsService(): Promise<void> {
    if (this.directionsService) return;

    await this.googleMapsApi.loadGoogleMapsApi();
    const google = this.googleMapsApi.getGoogle();
    this.directionsService = new google.maps.DirectionsService();
  }

  /**
   * Get directions between origin and destination
   */
  getDirections(request: DirectionsRequest): Observable<RouteSummary> {
    return from(this.performDirectionsRequest(request)).pipe(
      catchError((error) => {
        console.error('Directions request failed:', error);
        return throwError(() => new Error('Failed to get directions'));
      })
    );
  }

  /**
   * Perform directions request
   */
  private async performDirectionsRequest(request: DirectionsRequest): Promise<RouteSummary> {
    await this.initializeDirectionsService();

    if (!this.directionsService) {
      throw new Error('Directions Service not initialized');
    }

    const google = this.googleMapsApi.getGoogle();

    return new Promise((resolve, reject) => {
      const directionsRequest: google.maps.DirectionsRequest = {
        origin: this.parseLocation(request.origin),
        destination: this.parseLocation(request.destination),
        travelMode: google.maps.TravelMode[request.travelMode],
        waypoints: request.waypoints?.map((wp) => ({
          location: this.parseLocation(wp),
          stopover: true,
        })),
        optimizeWaypoints: request.optimizeWaypoints ?? false,
        unitSystem: request.unitSystem ? google.maps.UnitSystem[request.unitSystem] : undefined,
        avoidHighways: request.avoidHighways ?? false,
        avoidTolls: request.avoidTolls ?? false,
        avoidFerries: request.avoidFerries ?? false,
        region: request.region,
        transitOptions: request.transitOptions,
      };

      this.directionsService!.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const routeSummary = this.parseDirectionsResult(result, status);
          resolve(routeSummary);
        } else {
          reject(new Error(`Directions request failed with status: ${status}`));
        }
      });
    });
  }

  /**
   * Parse location from string or LatLng
   */
  private parseLocation(location: string | LatLng): string | google.maps.LatLng {
    if (typeof location === 'string') {
      return location;
    }
    const google = this.googleMapsApi.getGoogle();
    return new google.maps.LatLng(location.lat, location.lng);
  }

  /**
   * Parse directions result
   */
  private parseDirectionsResult(
    result: google.maps.DirectionsResult,
    status: google.maps.DirectionsStatusString
  ): RouteSummary {
    const routes = result.routes.map((route, index) => {
      const leg = route.legs[0]; // Using first leg as main route

      return {
        distance: {
          value: leg.distance?.value || 0,
          text: leg.distance?.text || '',
        },
        duration: {
          value: leg.duration?.value || 0,
          text: leg.duration?.text || '',
        },
        durationInTraffic: leg.duration_in_traffic
          ? {
              value: leg.duration_in_traffic.value,
              text: leg.duration_in_traffic.text,
            }
          : undefined,
        startLocation: this.latLngToObject(leg.start_location),
        endLocation: this.latLngToObject(leg.end_location),
        instructions: leg.steps.map((step) => step.instructions).join(' → '),
        polyline: route.overview_polyline,
        steps: leg.steps.map((step) => this.parseStep(step)),
      } as RouteSegment;
    });

    const google = this.googleMapsApi.getGoogle();

    return {
      routes,
      bounds: result.routes[0]?.bounds || new google.maps.LatLngBounds(),
      copyrights: result.routes.flatMap((route) => route.copyrights),
      warnings: result.routes[0]?.warnings || [],
      status,
    };
  }

  /**
   * Parse a single step
   */
  private parseStep(step: google.maps.DirectionsStep): RouteStep {
    return {
      distance: {
        value: step.distance?.value || 0,
        text: step.distance?.text || '',
      },
      duration: {
        value: step.duration?.value || 0,
        text: step.duration?.text || '',
      },
      endLocation: this.latLngToObject(step.end_location),
      instructions: step.instructions,
      polyline: step.polyline?.points,
      startLocation: this.latLngToObject(step.start_location),
      travelMode: step.travel_mode as TravelMode,
    };
  }

  /**
   * Convert LatLng to object
   */
  private latLngToObject(latLng: google.maps.LatLng): LatLng {
    return {
      lat: latLng.lat(),
      lng: latLng.lng(),
    };
  }
}
