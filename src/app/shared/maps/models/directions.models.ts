import { LatLng } from './map.models';

export enum TravelMode {
  DRIVING = 'DRIVING',
  WALKING = 'WALKING',
  BICYCLING = 'BICYCLING',
  TRANSIT = 'TRANSIT',
}

export enum UnitSystem {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL',
}

export interface DirectionsRequest {
  origin: string | LatLng;
  destination: string | LatLng;
  travelMode: TravelMode;
  waypoints?: Array<string | LatLng>;
  optimizeWaypoints?: boolean;
  unitSystem?: UnitSystem;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  region?: string;
  transitOptions?: google.maps.TransitOptions;
}

export interface RouteSegment {
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
  startLocation: LatLng;
  endLocation: LatLng;
  instructions: string;
  polyline?: string;
  steps?: RouteStep[];
}

export interface RouteStep {
  distance: {
    value: number;
    text: string;
  };
  duration: {
    value: number;
    text: string;
  };
  endLocation: LatLng;
  instructions: string;
  polyline?: string;
  startLocation: LatLng;
  travelMode: TravelMode;
}

export interface RouteSummary {
  routes: RouteSegment[];
  bounds: google.maps.LatLngBounds;
  copyrights: string[];
  warnings: string[];
  status: string;
}

export interface PolylineOptions {
  geodesic?: boolean;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  clickable?: boolean;
  draggable?: boolean;
  editable?: boolean;
  visible?: boolean;
  zIndex?: number;
  icons?: Array<{
    icon: google.maps.Symbol;
    offset: string;
    repeat: string;
  }>;
}

export const DEFAULT_POLYLINE_STYLES: Record<TravelMode, PolylineOptions> = {
  [TravelMode.DRIVING]: {
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 3,
  },
  [TravelMode.WALKING]: {
    strokeColor: '#0066FF',
    strokeOpacity: 0.8,
    strokeWeight: 3,
  },
  [TravelMode.BICYCLING]: {
    strokeColor: '#00AA00',
    strokeOpacity: 0.8,
    strokeWeight: 3,
  },
  [TravelMode.TRANSIT]: {
    strokeColor: '#FF6600',
    strokeOpacity: 0.8,
    strokeWeight: 3,
  },
};
