// Shared API types, ported from the Angular travel-api / planner-api services.

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
  details: Record<string, unknown>;
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

export interface ExploreLocated {
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

// ==================== PLANNER ====================

export type VehicleType = 'car' | 'bike' | 'bus' | 'train' | 'flight';

export interface WeatherOutlookDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
  precipitationMm: number;
  windSpeedMaxKmh: number;
}

export interface WeatherOutlook {
  source: 'forecast' | 'historical-estimate';
  days: WeatherOutlookDay[];
}

export interface ItineraryStop extends Location {
  visitMinutes: number;
}

export interface ItineraryDayPlan {
  dayNumber: number;
  stops: ItineraryStop[];
  estimatedMinutes: number;
  touristSiteCount: number;
  hiddenGemCount: number;
}

export interface ItinerarySuggestion {
  data: ItineraryDayPlan[];
  minDaysRequired: number;
  requestedDays: number;
  uncoveredCount: number;
  note: string;
}

export interface PackingList {
  common: string[];
  men: string[];
  women: string[];
  tripDays: number;
  avgMaxTempC: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string | null;
  publishedAt: string | null;
  source: string;
}

export interface DestinationNews {
  source: 'gnews' | 'mock';
  disclaimer: string;
  articles: NewsArticle[];
}

export interface BudgetEstimate {
  /** Display currency for every amount below (INR). */
  currency: string;
  /** Units of `currency` per 1 USD used for this estimate. */
  usdRate: number;
  rateDate: string | null;
  rateSource: 'frankfurter' | 'fallback';
  days: number;
  travelers: number;
  dailyBudgetPerPerson: number;
  breakdown: {
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
    misc: number;
  };
  transportNote: string;
  total: number;
  contingencyBuffer: number;
  recommendedCash: number;
  disclaimer: string;
}

// ==================== AUTH ====================

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
