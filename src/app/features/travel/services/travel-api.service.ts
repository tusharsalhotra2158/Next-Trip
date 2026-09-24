import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

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
  /** Approximate fare, in TransportOptions.currency (INR). */
  fareEstimate: number;
  seatsAvailable: number;
}

export interface BusOption {
  id: string;
  operator: string;
  departureTime: string;
  durationHours: number;
  busType: string;
  /** Approximate fare, in TransportOptions.currency (INR). */
  fareEstimate: number;
  seatsAvailable: number;
}

export interface TransportOptions {
  trains: TrainOption[];
  buses: BusOption[];
  disclaimer: string;
  currency: string;
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

export interface DestinationPhoto {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  width: number;
  height: number;
  color: string | null;
  photographer: string;
  photographerUrl: string | null;
  sourceUrl: string | null;
  provider: 'unsplash' | 'pexels';
}

export interface DestinationPhotos {
  source: 'unsplash' | 'pexels' | 'none';
  disclaimer: string;
  photos: DestinationPhoto[];
}

export interface DestinationVideo {
  id: string;
  title: string;
  channel: string;
  publishedAt: string | null;
  thumbUrl: string | null;
  url: string;
}

export interface DestinationVideos {
  source: 'youtube' | 'none';
  disclaimer: string;
  videos: DestinationVideo[];
}

export interface InstagramVideo {
  id: string;
  videoUrl: string;
  permalink: string;
  timestamp: string | null;
}

export interface DestinationInstagramVideos {
  source: 'instagram' | 'none';
  hashtag: string | null;
  disclaimer: string;
  videos: InstagramVideo[];
}

/** Where a value came from: OpenStreetMap's own tags, or an AI estimate. */
export type ExploreValueSource = 'osm' | 'estimate';

export interface ExploreTicket {
  source: ExploreValueSource;
  free: boolean;
  /** Raw OSM `charge` tag, e.g. "12 EUR/person" (only when source is 'osm'). */
  osmCharge?: string;
  /** Currency of `osmCharge`, when it could be parsed. */
  osmCurrency?: string | null;
  /** `osmCharge` converted to INR at the live rate; null if it couldn't be parsed/converted. */
  amountInr?: number | null;
  /** OSM says entry is paid but gives no amount. */
  paidPerOsm?: boolean;
  /** Estimated prices in INR; null when unknown. */
  indianAdult?: number | null;
  foreignAdult?: number | null;
  child?: number | null;
  notes?: string | null;
}

interface ExploreLocated {
  lat: number;
  lng: number;
  /** Straight-line distance from the destination centre. */
  distanceKm: number;
  osmUrl: string;
  mapsUrl: string;
}

export interface ExplorePlace extends ExploreLocated {
  name: string;
  category: string;
  description: string;
  ticket: ExploreTicket;
  hours: string | null;
  hoursSource: ExploreValueSource | null;
  suggestedDuration: string;
  bestTimeToVisit: string | null;
  website: string | null;
}

export interface ExploreTrek extends ExploreLocated {
  name: string;
  startPoint: string;
  trailLengthKm: number | null;
  difficulty: 'Easy' | 'Moderate' | 'Difficult';
  duration: string;
  bestSeason: string | null;
  description: string;
  /** Summit/trail elevation from OSM, when tagged. */
  elevationM: number | null;
}

export interface ExploreNearby extends ExploreLocated {
  name: string;
  description: string;
  bestFor: string;
  suggestedStay: string;
}

export interface DestinationExplore {
  source: 'gemini+osm' | 'none';
  places: ExplorePlace[];
  treks: ExploreTrek[];
  nearby: ExploreNearby[];
  /** Suggestions left out because OpenStreetMap couldn't confirm them. */
  droppedUnverified: number;
  /** When this result was looked up (ISO); null when no result. */
  generatedAt: string | null;
  /** Whether retrying can help (false when e.g. the server has no API key). */
  retryable: boolean;
  /** Set when a refresh failed and these are the previously saved results. */
  refreshFailed?: boolean;
  disclaimer: string;
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
  private auth = inject(AuthService);

  // Attaches the signed session token so the backend's `authenticate`
  // middleware can verify who's calling (see backend/src/data/auth.js) —
  // trip/itinerary endpoints derive the owner from this token, not from
  // anything the client claims directly.
  private ownerHeaders(): HttpHeaders {
    const token = this.auth.getAuthToken() || '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

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

  /** Popular places with ticket details, nearby treks and getaways — verified real places (see backend data/explore.js). */
  getDestinationExplore(destinationId: string, refresh = false): Observable<ApiResponse<DestinationExplore>> {
    // refresh=1 asks the server to skip its 7-day cache (it throttles this per destination).
    const params = refresh ? new HttpParams().set('refresh', '1') : undefined;
    return this.http.get<ApiResponse<DestinationExplore>>(`${this.apiUrl}/destinations/${destinationId}/explore`, { params });
  }

  getHiddenGems(destinationId: string): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(
      `${this.apiUrl}/destinations/${destinationId}/hidden-gems`,
    );
  }

  /** Landscape photos of a place (Unsplash, falling back to Pexels), proxied by the backend so API keys stay server-side. */
  getDestinationPhotos(query: string, limit = 8): Observable<ApiResponse<DestinationPhotos>> {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<ApiResponse<DestinationPhotos>>(`${this.apiUrl}/photos`, { params });
  }

  /** Travel videos about a place from YouTube, proxied by the backend so the API key stays server-side. */
  getDestinationVideos(query: string, limit = 6): Observable<ApiResponse<DestinationVideos>> {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<ApiResponse<DestinationVideos>>(`${this.apiUrl}/videos`, { params });
  }

  /** Top public Instagram videos for the place's hashtag (e.g. #chandigarh), proxied by the backend. */
  getDestinationInstagramVideos(placeName: string, limit = 6): Observable<ApiResponse<DestinationInstagramVideos>> {
    const params = new HttpParams().set('q', placeName).set('limit', limit);
    return this.http.get<ApiResponse<DestinationInstagramVideos>>(`${this.apiUrl}/instagram/videos`, { params });
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
    // userId is not sent — the backend derives the owner from the verified
    // session token (see ownerHeaders()) rather than trusting a client value.
    return this.http.post<ApiResponse<Trip>>(
      `${this.apiUrl}/trips`,
      tripData,
      { headers: this.ownerHeaders() },
    );
  }

  getUserTrips(userId: string): Observable<ApiResponse<Trip[]>> {
    return this.http.get<ApiResponse<Trip[]>>(
      `${this.apiUrl}/users/${userId}/trips`,
      { headers: this.ownerHeaders() },
    );
  }

  getTripById(tripId: string): Observable<ApiResponse<Trip>> {
    return this.http.get<ApiResponse<Trip>>(
      `${this.apiUrl}/trips/${tripId}`,
      { headers: this.ownerHeaders() },
    );
  }

  updateTrip(
    tripId: string,
    updates: Partial<Trip>,
  ): Observable<ApiResponse<Trip>> {
    return this.http.put<ApiResponse<Trip>>(
      `${this.apiUrl}/trips/${tripId}`,
      updates,
      { headers: this.ownerHeaders() },
    );
  }

  deleteTrip(tripId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/trips/${tripId}`,
      { headers: this.ownerHeaders() },
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
      { headers: this.ownerHeaders() },
    );
  }

  getTripItinerary(tripId: string): Observable<ApiResponse<ItineraryDay[]>> {
    return this.http.get<ApiResponse<ItineraryDay[]>>(
      `${this.apiUrl}/trips/${tripId}/itineraries`,
      { headers: this.ownerHeaders() },
    );
  }

  updateItineraryDay(
    dayId: string,
    updates: Partial<ItineraryDay>,
  ): Observable<ApiResponse<ItineraryDay>> {
    return this.http.put<ApiResponse<ItineraryDay>>(
      `${this.apiUrl}/itineraries/${dayId}`,
      updates,
      { headers: this.ownerHeaders() },
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
