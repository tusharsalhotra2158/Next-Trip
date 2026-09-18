import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GoogleMapsApiService } from './google-maps-api.service';
import {
  PlaceSearchRequest,
  PlacePrediction,
  PlaceDetails,
  PlaceSearchResult,
  PlaceAutocompleteOptions,
} from '../models/place.models';
import { LatLng } from '../models/map.models';

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
  private selectedPlace$ = new BehaviorSubject<PlaceDetails | null>(null);

  constructor(private googleMapsApi: GoogleMapsApiService) {}

  /**
   * Initialize Places service
   */
  private async initializePlacesService(): Promise<void> {
    if (this.autocompleteService && this.placesService) return;

    await this.googleMapsApi.loadGoogleMapsApi();
    const google = this.googleMapsApi.getGoogle();

    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.placesService = new google.maps.places.PlacesService(
      document.createElement('div')
    );

    // Create session token for autocomplete to billing optimization
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  /**
   * Get place autocomplete predictions
   */
  getAutocompletePredictions(request: PlaceSearchRequest): Observable<PlacePrediction[]> {
    return from(this.performAutocompleteSearch(request)).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      catchError((error) => {
        console.error('Autocomplete search failed:', error);
        return throwError(() => new Error('Autocomplete search failed'));
      })
    );
  }

  /**
   * Get detailed place information
   */
  getPlaceDetails(placeId: string): Observable<PlaceDetails> {
    return from(this.performPlaceDetailsRequest(placeId)).pipe(
      catchError((error) => {
        console.error('Place details request failed:', error);
        return throwError(() => new Error('Failed to get place details'));
      })
    );
  }

  /**
   * Perform place search nearby
   */
  searchNearby(
    location: LatLng,
    placeType: string,
    radius: number = 5000
  ): Observable<PlaceSearchResult[]> {
    return from(this.performNearbySearch(location, placeType, radius)).pipe(
      catchError((error) => {
        console.error('Nearby search failed:', error);
        return throwError(() => new Error('Nearby search failed'));
      })
    );
  }

  /**
   * Perform autocomplete search
   */
  private async performAutocompleteSearch(request: PlaceSearchRequest): Promise<PlacePrediction[]> {
    await this.initializePlacesService();

    if (!this.autocompleteService) {
      throw new Error('Autocomplete Service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.autocompleteService!.getPlacePredictions(
        {
          input: request.input,
          bounds: request.bounds,
          componentRestrictions: request.componentRestrictions as google.maps.places.ComponentRestrictions | undefined,
          language: request.language,
          offset: request.offset,
          types: request.types,
          sessionToken: this.sessionToken ?? undefined,
        },
        (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatusString) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const parsedPredictions = predictions.map((pred) =>
              this.parsePrediction(pred)
            );
            resolve(parsedPredictions);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Autocomplete search failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Perform place details request
   */
  private async performPlaceDetailsRequest(placeId: string): Promise<PlaceDetails> {
    await this.initializePlacesService();

    if (!this.placesService) {
      throw new Error('Places Service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.placesService!.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'reviews',
            'photos',
            'website',
            'formatted_phone_number',
            'international_phone_number',
            'opening_hours',
            'business_status',
            'url',
            'vicinity',
            'types',
          ],
          sessionToken: this.sessionToken ?? undefined,
        },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatusString) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const placeDetails = this.parsePlace(place);
            this.selectedPlace$.next(placeDetails);
            this.createNewSessionToken();
            resolve(placeDetails);
          } else {
            reject(new Error(`Place details request failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Perform nearby search
   */
  private async performNearbySearch(
    location: LatLng,
    placeType: string,
    radius: number
  ): Promise<PlaceSearchResult[]> {
    await this.initializePlacesService();

    if (!this.placesService) {
      throw new Error('Places Service not initialized');
    }

    const google = this.googleMapsApi.getGoogle();

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(document.createElement('div'));

      service.nearbySearch(
        {
          location: new google.maps.LatLng(location.lat, location.lng),
          radius,
          type: placeType,
        },
        (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatusString
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const parsedResults = results.map((result) => this.parseSearchResult(result));
            resolve(parsedResults);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Nearby search failed with status: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Parse prediction from API
   */
  private parsePrediction(prediction: google.maps.places.AutocompletePrediction): PlacePrediction {
    return {
      description: prediction.description,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text,
      placeId: prediction.place_id,
      types: prediction.types,
      terms: prediction.terms?.map((term) => ({
        value: term.value,
        offset: term.offset,
      })),
      matchedSubstrings: prediction.matched_substrings?.map((match) => ({
        offset: match.offset,
        length: match.length,
      })),
    };
  }

  /**
   * Parse place details from API
   */
  private parsePlace(place: google.maps.places.PlaceResult): PlaceDetails {
    return {
      placeId: place.place_id || '',
      name: place.name || '',
      address: place.formatted_address || '',
      formattedAddress: place.formatted_address || '',
      location: place.geometry?.location
        ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }
        : { lat: 0, lng: 0 },
      types: place.types || [],
      rating: place.rating,
      reviews: place.reviews?.map((review) => ({
        author: review.author_name,
        authorUrl: review.author_url,
        language: review.language,
        profilePhotoUrl: review.profile_photo_url,
        rating: review.rating,
        relativeTimeDescription: review.relative_time_description,
        text: review.text,
        time: review.time,
      })),
      photos: place.photos?.map((photo) => ({
        height: photo.height,
        html_attributions: photo.html_attributions,
        url: photo.getUrl(),
        width: photo.width,
      })),
      website: place.website,
      internationalPhoneNumber: place.international_phone_number,
      phoneNumber: place.formatted_phone_number,
      openingHours: place.opening_hours
        ? {
            weekdayText: place.opening_hours.weekday_text,
            isOpen: place.opening_hours.isOpen?.(),
            periods: place.opening_hours.periods?.map((period) => ({
              open: period.open,
              close: period.close,
            })),
          }
        : undefined,
      businessStatus: place.business_status as
        | 'OPERATIONAL'
        | 'CLOSED_TEMPORARILY'
        | 'CLOSED_PERMANENTLY'
        | undefined,
      url: place.url,
      vicinity: place.vicinity,
      googleMapsUrl: place.url,
    };
  }

  /**
   * Parse search result from API
   */
  private parseSearchResult(result: google.maps.places.PlaceResult): PlaceSearchResult {
    return {
      placeId: result.place_id || '',
      name: result.name || '',
      formattedAddress: result.formatted_address || '',
      geometry: {
        location: result.geometry?.location
          ? {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            }
          : { lat: 0, lng: 0 },
        viewport: result.geometry?.viewport
          ? {
              northeast: {
                lat: result.geometry.viewport.getNorthEast().lat(),
                lng: result.geometry.viewport.getNorthEast().lng(),
              },
              southwest: {
                lat: result.geometry.viewport.getSouthWest().lat(),
                lng: result.geometry.viewport.getSouthWest().lng(),
              },
            }
          : undefined,
      },
      icon: result.icon,
      photos: result.photos?.map((photo) => ({
        height: photo.height,
        html_attributions: photo.html_attributions,
        url: photo.getUrl(),
        width: photo.width,
      })),
      types: result.types || [],
      businessStatus: result.business_status,
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
    };
  }

  /**
   * Get currently selected place
   */
  getSelectedPlace(): Observable<PlaceDetails | null> {
    return this.selectedPlace$.asObservable();
  }

  /**
   * Create new session token for autocomplete billing optimization
   */
  private createNewSessionToken(): void {
    const google = this.googleMapsApi.getGoogle();
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  /**
   * Create autocomplete input binding
   */
  createAutocompleteBinding(inputElement: HTMLInputElement, options?: PlaceAutocompleteOptions): void {
    if (!inputElement) return;

    const google = this.googleMapsApi.getGoogle();
    const autocomplete = new google.maps.places.Autocomplete(inputElement, options || {});

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.place_id) {
        this.getPlaceDetails(place.place_id).subscribe();
      }
    });
  }
}
