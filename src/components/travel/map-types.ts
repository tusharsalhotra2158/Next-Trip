// Map types shared by MapContainer and the search page (ported from map-container.ts).

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'tourist_site' | 'attraction' | 'hidden_gem';
  rating?: number;
  description?: string;
}

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

export interface TripRoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TripRouteEndpoints {
  origin: TripRoutePoint;
  destination: TripRoutePoint;
}

export interface TripRouteInfo extends RouteInfo {
  /** True when this is a straight-line (haversine) estimate, not a real driving route. */
  approx?: boolean;
  note?: string;
}

