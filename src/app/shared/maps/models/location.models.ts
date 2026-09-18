import { LatLng } from './map.models';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  timestamp: number;
}

export interface GeocodeResult {
  address: string;
  formattedAddress: string;
  location: LatLng;
  types: string[];
  addressComponents: AddressComponent[];
  geometry: {
    location: LatLng;
    bounds?: {
      northeast: LatLng;
      southwest: LatLng;
    };
    locationType: string;
    viewport: {
      northeast: LatLng;
      southwest: LatLng;
    };
  };
  placeId: string;
  partialMatch?: boolean;
  plusCode?: {
    globalCode: string;
    compoundCode?: string;
  };
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface ReverseGeocodeRequest {
  location: LatLng;
  language?: string;
  region?: string;
}

export interface ForwardGeocodeRequest {
  address: string;
  bounds?: google.maps.LatLngBounds;
  componentRestrictions?: Record<string, string>;
  region?: string;
  language?: string;
}

export type GeocodeStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

export interface DistanceMatrixRequest {
  origins: Array<string | LatLng>;
  destinations: Array<string | LatLng>;
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
  unitSystem?: 'METRIC' | 'IMPERIAL';
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  transitOptions?: google.maps.TransitOptions;
}

export interface DistanceMatrixElement {
  distance: {
    value: number;
    text: string;
  };
  duration: {
    value: number;
    text: string;
  };
  durationInTraffic?: {
    value: number;
    text: string;
  };
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_ROUTE_LENGTH_EXCEEDED';
}
