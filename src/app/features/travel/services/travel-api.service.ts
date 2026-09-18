import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Destination {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  thumbnailUrl?: string;
  googlePlaceId?: string;
  createdAt: Date;
}

export interface Location {
  id: string;
  destinationId: string;
  name: string;
  type: 'restaurant' | 'tourist_site' | 'attraction' | 'hidden_gem';
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  googlePlaceId?: string;
  category?: string;
  createdAt: Date;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  destinationId: string;
  status: 'draft' | 'active' | 'completed';
  budget: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  name: string;
  time: string;
  duration: string;
  location?: string;
  cost?: number;
  type: 'activity' | 'restaurant' | 'attraction';
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string;
  budgetAllocated: number;
  activities: Activity[];
  createdAt: Date;
}

export interface RouteOption {
  id: string;
  tripId: string;
  mode: 'flight' | 'bus' | 'train' | 'car';
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: string;
  details: Record<string, any>;
  createdAt: Date;
}

export interface TrainOption {
  id: string;
  operator: string;
  trainNumber: string;
  departureTime: string;
  durationHours: number;
  classOptions: string[];
  fareEstimateUsd: number;
  seatsAvailable: number;
}

export interface BusOption {
  id: string;
  operator: string;
  departureTime: string;
  durationHours: number;
  busType: string;
  fareEstimateUsd: number;
  seatsAvailable: number;
}

export interface TransportOptions {
  trains: TrainOption[];
  buses: BusOption[];
  disclaimer: string;
}

export interface RoadConditions {
  trafficLevel: 'light' | 'moderate' | 'heavy';
  note: string;
  disclaimer: string;
}

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast?: WeatherDay[];
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
  source?: string;
  disclaimer?: string | null;
}

export interface PlaceSuggestion {
  type: 'city' | 'state' | 'country';
  label: string;
  id: string | number;
  name: string;
  iso2?: string;
  iso3?: string;
  isoCode?: string;
  state_code?: string;
  stateCode?: string;
  country_code?: string;
  countryCode?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  flag?: string;
  phonecode?: string;
  currency?: string;
  /** Present only on AI (Gemini) search results. */
  country?: string;
  region?: string | null;
  description?: string | null;
  whyMatch?: string | null;
  /** Set client-side when this suggestion came from the "Ask AI" fallback within the search box. */
  aiSuggested?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TravelApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Cached data
  private destinationsCache = new BehaviorSubject<Destination[]>([]);
  private locationsCache = new BehaviorSubject<Location[]>([]);
  private tripsCache = new BehaviorSubject<Trip[]>([]);

  // Cache timestamps
  private cacheTimestamps: Record<string, number> = {};

  constructor() {}

  // ==================== DESTINATIONS ====================

  searchDestinations(query: string): Observable<ApiResponse<Destination[]>> {
    let params = new HttpParams();
    if (query) {
      params = params.set('q', query);
    }

    return this.http.get<ApiResponse<Destination[]>>(
      `${this.apiUrl}/destinations/search`,
      { params },
    );
  }

  getPopularDestinations(): Observable<ApiResponse<Destination[]>> {
    return this.http.get<ApiResponse<Destination[]>>(
      `${this.apiUrl}/destinations/popular`,
    );
  }

  getDestinationById(id: string): Observable<ApiResponse<Destination>> {
    return this.http.get<ApiResponse<Destination>>(
      `${this.apiUrl}/destinations/${id}`,
    );
  }

  getDestinationLocations(
    destinationId: string,
    type?: string,
  ): Observable<ApiResponse<Location[]>> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<ApiResponse<Location[]>>(
      `${this.apiUrl}/destinations/${destinationId}/locations`,
      { params },
    );
  }

  getRestaurants(destinationId: string): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(
      `${this.apiUrl}/destinations/${destinationId}/restaurants`,
    );
  }

  getAttractions(destinationId: string): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(
      `${this.apiUrl}/destinations/${destinationId}/attractions`,
    );
  }

  getHiddenGems(destinationId: string): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(
      `${this.apiUrl}/destinations/${destinationId}/hidden-gems`,
    );
  }

  // ==================== LOCATION SEARCH (city / state / country) ====================

  searchPlaces(
    query: string,
    opts: { type?: 'city' | 'state' | 'country'; country?: string; state?: string; limit?: number } = {},
  ): Observable<ApiResponse<PlaceSuggestion[]>> {
    let params = new HttpParams().set('q', query);
    if (opts.type) params = params.set('type', opts.type);
    if (opts.country) params = params.set('country', opts.country);
    if (opts.state) params = params.set('state', opts.state);
    if (opts.limit) params = params.set('limit', opts.limit.toString());

    return this.http.get<ApiResponse<PlaceSuggestion[]>>(`${this.apiUrl}/locations/autocomplete`, { params });
  }

  /** All countries, optionally filtered by name/ISO code for a searchable dropdown. */
  getCountries(q?: string): Observable<ApiResponse<PlaceSuggestion[]>> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<ApiResponse<PlaceSuggestion[]>>(`${this.apiUrl}/locations/countries`, { params });
  }

  /** States/provinces of a country, optionally filtered by name for a searchable dropdown. */
  getStates(countryCode: string, q?: string): Observable<ApiResponse<PlaceSuggestion[]>> {
    let params = new HttpParams().set('country', countryCode);
    if (q) params = params.set('q', q);
    return this.http.get<ApiResponse<PlaceSuggestion[]>>(`${this.apiUrl}/locations/states`, { params });
  }

  /** Cities of a country (optionally scoped to a state), filtered by name for search-as-you-type. */
  getCities(
    countryCode: string,
    opts: { state?: string; q?: string; limit?: number } = {},
  ): Observable<ApiResponse<PlaceSuggestion[]>> {
    let params = new HttpParams().set('country', countryCode);
    if (opts.state) params = params.set('state', opts.state);
    if (opts.q) params = params.set('q', opts.q);
    if (opts.limit) params = params.set('limit', opts.limit.toString());
    return this.http.get<ApiResponse<PlaceSuggestion[]>>(`${this.apiUrl}/locations/cities`, { params });
  }

  /** Natural-language place search via Gemini (e.g. "quiet beach towns in Kerala"). */
  aiSearchPlaces(q: string, limit?: number): Observable<ApiResponse<PlaceSuggestion[]>> {
    let params = new HttpParams().set('q', q);
    if (limit) params = params.set('limit', limit);

    return this.http.get<ApiResponse<PlaceSuggestion[]>>(`${this.apiUrl}/locations/ai-search`, { params });
  }

  resolvePlace(
    name: string,
    countryCode?: string,
    country?: string,
    coords?: { lat: number; lng: number } | null,
  ): Observable<ApiResponse<Destination>> {
    let params = new HttpParams().set('name', name);
    if (countryCode) params = params.set('countryCode', countryCode);
    if (country) params = params.set('country', country);
    // Skip the server's external geocoding round-trip when we already have
    // coordinates (e.g. from the offline country-state-city dataset).
    if (coords) params = params.set('lat', coords.lat).set('lng', coords.lng);

    return this.http.get<ApiResponse<Destination>>(`${this.apiUrl}/locations/resolve`, { params });
  }

  // ==================== TRIPS ====================

  createTrip(tripData: Partial<Trip>): Observable<ApiResponse<Trip>> {
    return this.http.post<ApiResponse<Trip>>(
      `${this.apiUrl}/trips`,
      tripData,
    );
  }

  getUserTrips(userId: string): Observable<ApiResponse<Trip[]>> {
    return this.http.get<ApiResponse<Trip[]>>(
      `${this.apiUrl}/users/${userId}/trips`,
    );
  }

  getTripById(tripId: string): Observable<ApiResponse<Trip>> {
    return this.http.get<ApiResponse<Trip>>(
      `${this.apiUrl}/trips/${tripId}`,
    );
  }

  updateTrip(
    tripId: string,
    updates: Partial<Trip>,
  ): Observable<ApiResponse<Trip>> {
    return this.http.put<ApiResponse<Trip>>(
      `${this.apiUrl}/trips/${tripId}`,
      updates,
    );
  }

  deleteTrip(tripId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/trips/${tripId}`,
    );
  }

  // ==================== ITINERARIES ====================

  generateItinerary(
    tripId: string,
    days: number,
    interests?: string[],
  ): Observable<ApiResponse<ItineraryDay[]>> {
    return this.http.post<ApiResponse<ItineraryDay[]>>(
      `${this.apiUrl}/trips/${tripId}/itineraries/generate`,
      { tripId, days, interests },
    );
  }

  getTripItinerary(tripId: string): Observable<ApiResponse<ItineraryDay[]>> {
    return this.http.get<ApiResponse<ItineraryDay[]>>(
      `${this.apiUrl}/trips/${tripId}/itineraries`,
    );
  }

  updateItineraryDay(
    dayId: string,
    updates: Partial<ItineraryDay>,
  ): Observable<ApiResponse<ItineraryDay>> {
    return this.http.put<ApiResponse<ItineraryDay>>(
      `${this.apiUrl}/itineraries/${dayId}`,
      updates,
    );
  }

  // ==================== ROUTES (Transportation) ====================

  searchRoutes(
    tripId: string,
    mode: 'flight' | 'bus' | 'train' | 'car',
    date: string,
  ): Observable<ApiResponse<RouteOption[]>> {
    let params = new HttpParams();
    params = params.set('tripId', tripId);
    params = params.set('mode', mode);
    params = params.set('date', date);

    return this.http.get<ApiResponse<RouteOption[]>>(
      `${this.apiUrl}/routes/search`,
      { params },
    );
  }

  getFlightOptions(date: string): Observable<ApiResponse<RouteOption[]>> {
    let params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<RouteOption[]>>(
      `${this.apiUrl}/routes/flights`,
      { params },
    );
  }

  getBusOptions(date: string): Observable<ApiResponse<RouteOption[]>> {
    let params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<RouteOption[]>>(
      `${this.apiUrl}/routes/buses`,
      { params },
    );
  }

  getTrainOptions(date: string): Observable<ApiResponse<RouteOption[]>> {
    let params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<RouteOption[]>>(
      `${this.apiUrl}/routes/trains`,
      { params },
    );
  }

  getCarOptions(date: string): Observable<ApiResponse<RouteOption[]>> {
    let params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<RouteOption[]>>(
      `${this.apiUrl}/routes/cars`,
      { params },
    );
  }

  /** Mock train/bus options for a destination, scaled to a real route distance when provided. */
  getTransportOptions(
    destinationId: string,
    date?: string,
    distanceKm?: number,
  ): Observable<ApiResponse<TransportOptions>> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (distanceKm != null) params = params.set('distanceKm', distanceKm);

    return this.http.get<ApiResponse<TransportOptions>>(
      `${this.apiUrl}/destinations/${destinationId}/transport`,
      { params },
    );
  }

  /** Mock road/traffic estimate for an origin -> destination pair. */
  getRoadConditions(params: {
    originLat?: number;
    originLng?: number;
    destLat: number;
    destLng: number;
    date?: string;
  }): Observable<ApiResponse<RoadConditions>> {
    let httpParams = new HttpParams().set('destLat', params.destLat).set('destLng', params.destLng);
    if (params.originLat != null) httpParams = httpParams.set('originLat', params.originLat);
    if (params.originLng != null) httpParams = httpParams.set('originLng', params.originLng);
    if (params.date) httpParams = httpParams.set('date', params.date);

    return this.http.get<ApiResponse<RoadConditions>>(`${this.apiUrl}/routes/road-conditions`, {
      params: httpParams,
    });
  }

  // ==================== WEATHER ====================

  getCurrentWeather(
    destinationId: string,
  ): Observable<ApiResponse<Weather>> {
    return this.http.get<ApiResponse<Weather>>(
      `${this.apiUrl}/weather/current/${destinationId}`,
    );
  }

  getWeatherForecast(
    destinationId: string,
    days?: number,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (days) {
      params = params.set('days', days.toString());
    }

    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/weather/forecast/${destinationId}`,
      { params },
    );
  }

  getBulkWeather(
    destinationIds: string[],
  ): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(
      `${this.apiUrl}/weather/bulk`,
      { destinationIds },
    );
  }

  // ==================== HEALTH ====================

  checkHealth(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/health`,
    );
  }

  // ==================== CACHING UTILITIES ====================

  isCacheValid(cacheKey: string, ttl: number): boolean {
    const timestamp = this.cacheTimestamps[cacheKey];
    if (!timestamp) return false;

    return Date.now() - timestamp < ttl;
  }

  setCacheTimestamp(cacheKey: string): void {
    this.cacheTimestamps[cacheKey] = Date.now();
  }

  clearCache(): void {
    this.destinationsCache.next([]);
    this.locationsCache.next([]);
    this.tripsCache.next([]);
    this.cacheTimestamps = {};
  }
}
