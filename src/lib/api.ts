// Browser-side client for the Travel API (src/app/api/v1/*).
// Ported from the Angular TravelApiService / PlannerApiService / AuthService:
// same endpoints and parameters, but Promise-based and same-origin.

import type {
  ApiResponse,
  AuthUser,
  BudgetEstimate,
  Destination,
  DestinationExplore,
  DestinationInstagramVideos,
  DestinationNews,
  DestinationPhotos,
  DestinationVideos,
  ItineraryDay,
  ItinerarySuggestion,
  Location,
  PackingList,
  PlaceSuggestion,
  RoadConditions,
  RouteOption,
  SignupData,
  TransportOptions,
  Trip,
  VehicleType,
  Weather,
  WeatherOutlook,
} from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';

/** Error thrown for non-2xx responses; `message` comes from the API body when present. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

/** The API's own `message` from an error body, if any (mirrors Angular's `err.error?.message`). */
function bodyMessage(err: unknown): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  return (err.body as { message?: string } | undefined)?.message;
}

function buildUrl(path: string, params?: Params): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const query = qs.toString();
  return `${API_BASE}${path}${query ? `?${query}` : ''}`;
}

async function request<T>(
  method: string,
  path: string,
  opts: { params?: Params; body?: unknown; auth?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth) {
    // Trip/itinerary endpoints derive the owner from this verified token,
    // not from anything the client claims directly.
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, opts.params), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const msg = (data as { message?: string; error?: string } | undefined);
    throw new ApiError(msg?.message || msg?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data as T;
}

const get = <T>(path: string, params?: Params, extra?: { auth?: boolean; signal?: AbortSignal }) =>
  request<T>('GET', path, { params, ...extra });

// ==================== AUTH (token storage) ====================

const isBrowser = () => typeof window !== 'undefined';

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeSession(user: AuthUser, token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const authApi = {
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    try {
      const res = await request<ApiResponse<{ user: AuthUser; token: string }>>('POST', '/auth/login', {
        body: { email, password },
      });
      return res.data!;
    } catch (err) {
      throw new Error(bodyMessage(err) || 'Invalid email or password');
    }
  },

  async signup(userData: SignupData): Promise<{ user: AuthUser }> {
    try {
      const res = await request<ApiResponse<{ user: AuthUser }>>('POST', '/auth/signup', { body: userData });
      return res.data!;
    } catch (err) {
      throw new Error(bodyMessage(err) || 'Signup failed. Please try again.');
    }
  },
};

// ==================== TRAVEL API ====================

export const travelApi = {
  // Destinations
  searchDestinations: (query: string) => get<ApiResponse<Destination[]>>('/destinations/search', { q: query }),
  getPopularDestinations: () => get<ApiResponse<Destination[]>>('/destinations/popular'),
  getDestinationById: (id: string) => get<ApiResponse<Destination>>(`/destinations/${encodeURIComponent(id)}`),
  getDestinationLocations: (destinationId: string, type?: string) =>
    get<ApiResponse<Location[]>>(`/destinations/${encodeURIComponent(destinationId)}/locations`, { type }),
  getRestaurants: (destinationId: string) =>
    get<ApiResponse<Location[]>>(`/destinations/${encodeURIComponent(destinationId)}/restaurants`),
  getAttractions: (destinationId: string) =>
    get<ApiResponse<Location[]>>(`/destinations/${encodeURIComponent(destinationId)}/attractions`),
  /** refresh=true asks the server to skip its 7-day cache (it throttles this per destination). */
  getDestinationExplore: (destinationId: string, refresh = false) =>
    get<ApiResponse<DestinationExplore>>(`/destinations/${encodeURIComponent(destinationId)}/explore`, {
      refresh: refresh ? '1' : undefined,
    }),
  getHiddenGems: (destinationId: string) =>
    get<ApiResponse<Location[]>>(`/destinations/${encodeURIComponent(destinationId)}/hidden-gems`),

  // Media (proxied so API keys stay server-side)
  getDestinationPhotos: (query: string, limit = 8) => get<ApiResponse<DestinationPhotos>>('/photos', { q: query, limit }),
  getDestinationVideos: (query: string, limit = 6) => get<ApiResponse<DestinationVideos>>('/videos', { q: query, limit }),
  getDestinationInstagramVideos: (placeName: string, limit = 6) =>
    get<ApiResponse<DestinationInstagramVideos>>('/instagram/videos', { q: placeName, limit }),

  // Location search
  searchPlaces: (
    query: string,
    opts: { type?: 'city' | 'state' | 'country'; country?: string; state?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) => get<ApiResponse<PlaceSuggestion[]>>('/locations/autocomplete', { q: query, ...opts }, { signal }),
  getCountries: (q?: string) => get<ApiResponse<PlaceSuggestion[]>>('/locations/countries', { q }),
  getStates: (countryCode: string, q?: string) =>
    get<ApiResponse<PlaceSuggestion[]>>('/locations/states', { country: countryCode, q }),
  getCities: (countryCode: string, opts: { state?: string; q?: string; limit?: number } = {}) =>
    get<ApiResponse<PlaceSuggestion[]>>('/locations/cities', { country: countryCode, ...opts }),
  aiSearchPlaces: (q: string, limit?: number, signal?: AbortSignal) =>
    get<ApiResponse<PlaceSuggestion[]>>('/locations/ai-search', { q, limit }, { signal }),
  resolvePlace: (
    name: string,
    countryCode?: string,
    country?: string,
    coords?: { lat: number; lng: number } | null,
  ) =>
    // Coordinates (when known) let the server skip its geocoding round-trip.
    get<ApiResponse<Destination>>('/locations/resolve', {
      name,
      countryCode,
      country,
      lat: coords?.lat,
      lng: coords?.lng,
    }),

  // Trips (owner comes from the auth token, never a client-sent userId)
  createTrip: (tripData: Partial<Trip>) => request<ApiResponse<Trip>>('POST', '/trips', { body: tripData, auth: true }),
  getUserTrips: (userId: string) =>
    get<ApiResponse<Trip[]>>(`/users/${encodeURIComponent(userId)}/trips`, undefined, { auth: true }),
  getTripById: (tripId: string) => get<ApiResponse<Trip>>(`/trips/${encodeURIComponent(tripId)}`, undefined, { auth: true }),

  // Itineraries
  generateItinerary: (tripId: string, days: number, interests?: string[]) =>
    request<ApiResponse<ItineraryDay[]>>('POST', `/trips/${encodeURIComponent(tripId)}/itineraries/generate`, {
      body: { tripId, days, interests },
      auth: true,
    }),
  getTripItinerary: (tripId: string) =>
    get<ApiResponse<ItineraryDay[]>>(`/trips/${encodeURIComponent(tripId)}/itineraries`, undefined, { auth: true }),

  // Routes (transportation)
  searchRoutes: (tripId: string, mode: 'flight' | 'bus' | 'train' | 'car', date: string) =>
    get<ApiResponse<RouteOption[]>>('/routes/search', { tripId, mode, date }),
  getFlightOptions: (date: string) => get<ApiResponse<RouteOption[]>>('/routes/flights', { date }),
  getBusOptions: (date: string) => get<ApiResponse<RouteOption[]>>('/routes/buses', { date }),
  getTrainOptions: (date: string) => get<ApiResponse<RouteOption[]>>('/routes/trains', { date }),
  getCarOptions: (date: string) => get<ApiResponse<RouteOption[]>>('/routes/cars', { date }),
  /** Mock train/bus options, scaled to a real route distance when provided. */
  getTransportOptions: (destinationId: string, date?: string, distanceKm?: number) =>
    get<ApiResponse<TransportOptions>>(`/destinations/${encodeURIComponent(destinationId)}/transport`, {
      date,
      distanceKm,
    }),
  /** Mock road/traffic estimate for an origin -> destination pair. */
  getRoadConditions: (params: { originLat?: number; originLng?: number; destLat: number; destLng: number; date?: string }) =>
    get<ApiResponse<RoadConditions>>('/routes/road-conditions', params),

  // Weather
  getCurrentWeather: (destinationId: string) =>
    get<ApiResponse<Weather>>(`/weather/current/${encodeURIComponent(destinationId)}`),
  getWeatherForecast: (destinationId: string, days?: number) =>
    get<ApiResponse<unknown>>(`/weather/forecast/${encodeURIComponent(destinationId)}`, { days }),
  getBulkWeather: (destinationIds: string[]) =>
    request<ApiResponse<unknown[]>>('POST', '/weather/bulk', { body: { destinationIds } }),

  checkHealth: () => get<ApiResponse<unknown>>('/health'),
};

// ==================== PLANNER API ====================

export const plannerApi = {
  getWeatherOutlook: (destinationId: string, startDate: string, endDate: string) =>
    get<ApiResponse<WeatherOutlook>>(`/destinations/${encodeURIComponent(destinationId)}/weather-outlook`, {
      startDate,
      endDate,
    }),
  // Note: this endpoint returns the suggestion object directly, not an ApiResponse envelope.
  getItinerarySuggestion: (destinationId: string, days: number) =>
    get<ItinerarySuggestion>(`/destinations/${encodeURIComponent(destinationId)}/itinerary-suggestion`, { days }),
  getTransportOptions: (destinationId: string, date: string) =>
    get<ApiResponse<TransportOptions>>(`/destinations/${encodeURIComponent(destinationId)}/transport`, { date }),
  getRoadConditions: (destLat: number, destLng: number, date: string) =>
    get<ApiResponse<RoadConditions>>('/routes/road-conditions', { destLat, destLng, date }),
  getPackingList: (destinationId: string, startDate: string, endDate: string, days: number) =>
    get<ApiResponse<PackingList>>(`/destinations/${encodeURIComponent(destinationId)}/packing-list`, {
      startDate,
      endDate,
      days,
    }),
  getNews: (query: string) => get<ApiResponse<DestinationNews>>('/news', { q: query }),
  getBudgetEstimate: (
    destinationId: string,
    days: number,
    travelers: number,
    vehicleType?: VehicleType,
    distanceKm?: number,
  ) =>
    get<ApiResponse<BudgetEstimate>>('/budget-estimate', {
      destinationId,
      days,
      travelers,
      vehicleType,
      distanceKm: distanceKm || undefined,
    }),
};
