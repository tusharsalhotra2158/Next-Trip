'use client';

// Ported from src/app/features/travel/components/map-container/map-container.ts.
//
// Leaflet touches `window` as soon as its module is evaluated, so only its
// types are imported statically; the real module is loaded dynamically in the
// browser from the mount effect (the Angular component did the same in
// ngAfterViewInit). Pages should import MapContainerClient, which also skips SSR.

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type {
  MapLocation,
  RouteInfo,
  TripRouteEndpoints,
  TripRouteInfo,
  TripRoutePoint,
} from './map-types';
import styles from './MapContainer.module.css';

type LeafletModule = typeof Leaflet;

export interface MapContainerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Draws a route (real driving route via OSRM, falling back to a straight-line estimate) between two arbitrary points. */
  tripRoute?: TripRouteEndpoints | null;
  onLocationSelected?: (loc: MapLocation) => void;
  onTripRouteComputed?: (info: TripRouteInfo | null) => void;
}

// Free, no-API-key routing via the public OSRM demo server.
// Fine for light/demo use; swap for a self-hosted OSRM instance for production traffic.
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

const MARKER_COLORS: Record<string, string> = {
  restaurant: '#ff7043',
  tourist_site: '#5c6bc0',
  attraction: '#ab47bc',
  hidden_gem: '#26a69a',
};

const MARKER_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  tourist_site: '🏛️',
  attraction: '🎪',
  hidden_gem: '💎',
};

// Stable default so an omitted `locations` prop doesn't re-trigger the marker effect every render.
const NO_LOCATIONS: MapLocation[] = [];

interface LayerFilters {
  restaurants: boolean;
  attractions: boolean;
  hiddenGems: boolean;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: GeoJSON.GeometryObject;
}

async function loadLeaflet(): Promise<LeafletModule> {
  const mod = await import('leaflet');
  // Leaflet is a UMD bundle; depending on bundler interop the API is either
  // the namespace itself or its `default` export.
  return (mod as unknown as { default?: LeafletModule }).default ?? mod;
}

function buildIcon(L: LeafletModule, type: string): Leaflet.DivIcon {
  const color = MARKER_COLORS[type] || '#757575';
  const emoji = MARKER_ICONS[type] || '📍';
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
        width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
        background: ${color}; transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;
      "><span style="transform: rotate(45deg); font-size: 15px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function buildEndpointIcon(L: LeafletModule, emoji: string, color: string): Leaflet.DivIcon {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
        width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
        background: ${color}; transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;
      "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function haversineKm(a: TripRoutePoint, b: TripRoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function formatDuration(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = Math.round(min % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function isShownBy(location: MapLocation, filters: LayerFilters): boolean {
  return (
    (location.type === 'restaurant' && filters.restaurants) ||
    (location.type === 'tourist_site' && filters.attractions) ||
    (location.type === 'attraction' && filters.attractions) ||
    (location.type === 'hidden_gem' && filters.hiddenGems)
  );
}

function tripRouteKey(route: TripRouteEndpoints | null | undefined): string {
  if (!route) return '';
  const { origin: o, destination: d } = route;
  return `${o.lat},${o.lng},${o.name ?? ''}|${d.lat},${d.lng},${d.name ?? ''}`;
}

async function fetchOsrmRoute(from: TripRoutePoint, to: TripRoutePoint, signal?: AbortSignal): Promise<OsrmRoute> {
  const url = `${OSRM_ROUTE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}` + `?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
  const data = (await response.json()) as { routes?: OsrmRoute[] };
  const route = data.routes?.[0];
  if (!route) throw new Error('No route found');
  return route;
}

export default function MapContainer({
  locations = NO_LOCATIONS,
  center,
  zoom,
  tripRoute = null,
  onLocationSelected,
  onTripRouteComputed,
}: MapContainerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef(new Map<string, Leaflet.Marker>());
  const routeLayerRef = useRef<Leaflet.GeoJSON | null>(null);
  // Request counters used to discard stale OSRM responses (directions / trip route).
  const reqIdsRef = useRef({ route: 0, trip: 0 });
  const tripRouteLayerRef = useRef<Leaflet.GeoJSON | Leaflet.Polyline | null>(null);
  const tripMarkersRef = useRef<Leaflet.Marker[]>([]);
  const tripAbortRef = useRef<AbortController | null>(null);
  const tripInitDoneRef = useRef(false);
  const appliedCenterRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  const [mapReady, setMapReady] = useState(false);

  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [tripRouteInfo, setTripRouteInfo] = useState<TripRouteInfo | null>(null);
  const [tripRouteError, setTripRouteError] = useState<string | null>(null);
  const [loadingTripRoute, setLoadingTripRoute] = useState(false);

  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showAttractions, setShowAttractions] = useState(true);
  const [showHiddenGems, setShowHiddenGems] = useState(true);

  // ---------- selected-marker directions ----------

  function clearRoute() {
    reqIdsRef.current.route++; // discard any directions request still in flight
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    setRouteInfo(null);
    setRouteError(null);
    setLoadingRoute(false);
  }

  /**
   * Draw a driving route from the destination's center to the selected marker,
   * using the free OSRM demo routing service (no API key required).
   */
  async function showDirectionsToSelected() {
    const destination = selectedMarker;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!destination || !map || !L || !center) return;

    clearRoute();
    const reqId = reqIdsRef.current.route;
    setLoadingRoute(true);
    setRouteError(null);

    try {
      const route = await fetchOsrmRoute(center, destination);
      if (reqId !== reqIdsRef.current.route || mapRef.current !== map) return;

      const layer = L.geoJSON(route.geometry, {
        style: { color: '#1976d2', weight: 4, opacity: 0.8 },
      }).addTo(map);
      routeLayerRef.current = layer;

      setRouteInfo({
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
      });

      map.fitBounds(layer.getBounds(), { padding: [50, 50] });
    } catch (error) {
      if (reqId !== reqIdsRef.current.route) return;
      console.error('Failed to fetch directions:', error);
      setRouteError('Could not load directions right now. Please try again.');
    } finally {
      if (reqId === reqIdsRef.current.route) setLoadingRoute(false);
    }
  }

  function zoomIn() {
    mapRef.current?.zoomIn();
  }

  function zoomOut() {
    mapRef.current?.zoomOut();
  }

  function closeMarkerInfo() {
    setSelectedMarker(null);
    clearRoute();
  }

  function handleViewDetails() {
    if (selectedMarker) {
      onLocationSelected?.(selectedMarker);
      closeMarkerInfo();
    }
  }

  // ---------- location markers ----------

  const refreshMarkers = useEffectEvent(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    clearRoute();

    for (const location of locations) {
      const marker = L.marker([location.lat, location.lng], { icon: buildIcon(L, location.type) }).addTo(map);
      marker.bindTooltip(location.name, { direction: 'top', offset: [0, -28] });
      marker.on('click', () => {
        clearRoute();
        setSelectedMarker(location);
      });
      markersRef.current.set(location.id, marker);
    }

    if (locations.length > 0) {
      const positions = Array.from(markersRef.current.values()).map((m) => m.getLatLng());
      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
      } else if (positions.length === 1) {
        map.setView(positions[0], 15);
      }
    }
  });

  function updateMarkers(filters: LayerFilters) {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker, id) => {
      const location = locations.find((l) => l.id === id);
      if (!location) return;
      if (isShownBy(location, filters)) {
        marker.addTo(map);
      } else {
        marker.remove();
      }
    });
  }

  const currentFilters = (): LayerFilters => ({
    restaurants: showRestaurants,
    attractions: showAttractions,
    hiddenGems: showHiddenGems,
  });

  // ---------- trip route (origin → destination) ----------

  function clearTripRoute() {
    tripAbortRef.current?.abort();
    tripAbortRef.current = null;
    tripMarkersRef.current.forEach((m) => m.remove());
    tripMarkersRef.current = [];
    tripRouteLayerRef.current?.remove();
    tripRouteLayerRef.current = null;
    setTripRouteInfo(null);
    setTripRouteError(null);
  }

  const emitTripRoute = useEffectEvent((info: TripRouteInfo | null) => {
    onTripRouteComputed?.(info);
  });

  /**
   * Draw a route between two arbitrary points (e.g. a searched starting
   * point and destination), independent of the location markers. Tries the
   * free OSRM demo routing service first for a real driving route; if that's
   * unreachable (network/rate-limit), falls back to a straight-line
   * (haversine) distance estimate so the feature still works offline.
   */
  const drawTripRoute = useEffectEvent(async () => {
    clearTripRoute();
    const reqId = ++reqIdsRef.current.trip;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !tripRoute) {
      setLoadingTripRoute(false);
      emitTripRoute(null);
      return;
    }

    const { origin, destination } = tripRoute;
    const bounds = L.latLngBounds([
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ]);

    const originMarker = L.marker([origin.lat, origin.lng], {
      icon: buildEndpointIcon(L, '🚩', '#43a047'),
    }).addTo(map);
    originMarker.bindTooltip(origin.name || 'Starting point', { direction: 'top', offset: [0, -30] });

    const destMarker = L.marker([destination.lat, destination.lng], {
      icon: buildEndpointIcon(L, '🏁', '#e53935'),
    }).addTo(map);
    destMarker.bindTooltip(destination.name || 'Destination', { direction: 'top', offset: [0, -30] });

    tripMarkersRef.current = [originMarker, destMarker];
    setLoadingTripRoute(true);

    const controller = new AbortController();
    tripAbortRef.current = controller;
    const isStale = () => reqId !== reqIdsRef.current.trip || mapRef.current !== map;

    try {
      const route = await fetchOsrmRoute(origin, destination, controller.signal);
      if (isStale()) return;

      const layer = L.geoJSON(route.geometry, {
        style: { color: '#1976d2', weight: 4, opacity: 0.85 },
      }).addTo(map);
      tripRouteLayerRef.current = layer;

      const info: TripRouteInfo = {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
      };
      setTripRouteInfo(info);
      emitTripRoute(info);
      map.fitBounds(layer.getBounds(), { padding: [60, 60] });
    } catch (error) {
      if (isStale()) return;
      console.error('Trip route lookup failed, falling back to straight-line distance:', error);

      tripRouteLayerRef.current = L.polyline(
        [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ],
        { color: '#9e9e9e', weight: 3, dashArray: '8 8' },
      ).addTo(map);

      const distanceKm = Math.round(haversineKm(origin, destination) * 10) / 10;
      const info: TripRouteInfo = {
        distanceKm,
        durationMin: Math.round((distanceKm / 50) * 60), // ~50 km/h assumed average for the estimate
        approx: true,
        note: 'Live routing is unavailable right now — showing straight-line distance instead.',
      };
      setTripRouteInfo(info);
      emitTripRoute(info);
      setTripRouteError(info.note ?? null);
      map.fitBounds(bounds, { padding: [60, 60] });
    } finally {
      if (reqId === reqIdsRef.current.trip) {
        setLoadingTripRoute(false);
        if (tripAbortRef.current === controller) tripAbortRef.current = null;
      }
    }
  });

  // ---------- map lifecycle ----------

  const createMap = useEffectEvent((L: LeafletModule, el: HTMLDivElement): Leaflet.Map => {
    const initialCenter = center ?? { lat: 20, lng: 0 };
    const map = L.map(el, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: zoom ?? 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    appliedCenterRef.current = center;
    tripInitDoneRef.current = false;
    return map;
  });

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    // `cancelled` guards React StrictMode's mount → unmount → mount: the first
    // mount's cleanup runs before Leaflet finishes loading, so only one map is created.
    let cancelled = false;
    let sizeTimer: ReturnType<typeof setTimeout> | undefined;

    loadLeaflet()
      .then((L) => {
        if (cancelled || mapRef.current) return;
        leafletRef.current = L;
        mapRef.current = createMap(L, el);
        // Leaflet sizes itself based on its container at creation time; the
        // container can still be mid-layout right after it is revealed.
        sizeTimer = setTimeout(() => mapRef.current?.invalidateSize(), 100);
        setMapReady(true);
      })
      .catch((error) => console.error('Failed to load the map library:', error));

    const markers = markersRef.current;
    const reqIds = reqIdsRef.current;
    return () => {
      cancelled = true;
      if (sizeTimer) clearTimeout(sizeTimer);
      reqIds.trip++;
      reqIds.route++;
      tripAbortRef.current?.abort();
      tripAbortRef.current = null;
      markers.clear();
      tripMarkersRef.current = [];
      tripRouteLayerRef.current = null;
      routeLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Rebuild markers whenever `locations` changes (and once the map is ready).
  useEffect(() => {
    if (!mapReady) return;
    refreshMarkers();
  }, [mapReady, locations]);

  // Re-center when the `center` input changes after the map was created with it.
  const centerLat = center?.lat;
  const centerLng = center?.lng;
  const recenter = useEffectEvent((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom ?? map.getZoom());
  });
  useEffect(() => {
    if (!mapReady || centerLat === undefined || centerLng === undefined) return;
    const prev = appliedCenterRef.current;
    if (prev && prev.lat === centerLat && prev.lng === centerLng) return;
    appliedCenterRef.current = { lat: centerLat, lng: centerLng };
    recenter(centerLat, centerLng);
  }, [mapReady, centerLat, centerLng]);

  // Draw the trip route initially (if set) and redraw whenever it changes.
  // Keyed on the endpoint values so a new-but-equal object doesn't refetch.
  const tripKey = tripRouteKey(tripRoute);
  useEffect(() => {
    if (!mapReady) return;
    if (!tripInitDoneRef.current) {
      tripInitDoneRef.current = true;
      if (!tripKey) return;
    }
    void drawTripRoute();
  }, [mapReady, tripKey]);

  // ---------- render ----------

  const btn =
    'flex-1 cursor-pointer rounded border px-3 py-2 text-sm leading-normal transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="relative h-full min-h-[500px] w-full">
      <div ref={mapElRef} className="relative h-full w-full overflow-hidden rounded-lg bg-[#e0e0e0]" />

      <div className="absolute top-5 right-5 z-[1000] rounded-lg bg-white p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <div className="mb-[15px] flex gap-2">
          <button type="button" onClick={zoomIn} title="Zoom in" className="h-9 w-9 flex-1 cursor-pointer rounded border border-[#ddd] bg-white p-0 text-[18px] leading-normal text-[#212529] transition-all duration-200 hover:bg-[#f0f0f0] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            +
          </button>
          <button type="button" onClick={zoomOut} title="Zoom out" className="h-9 w-9 flex-1 cursor-pointer rounded border border-[#ddd] bg-white p-0 text-[18px] leading-normal text-[#212529] transition-all duration-200 hover:bg-[#f0f0f0] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            −
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#eee] pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={showRestaurants}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowRestaurants(checked);
                updateMarkers({ ...currentFilters(), restaurants: checked });
              }}
            />
            Restaurants
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={showAttractions}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowAttractions(checked);
                updateMarkers({ ...currentFilters(), attractions: checked });
              }}
            />
            Attractions
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={showHiddenGems}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowHiddenGems(checked);
                updateMarkers({ ...currentFilters(), hiddenGems: checked });
              }}
            />
            Hidden Gems
          </label>
        </div>
      </div>

      {tripRoute && (loadingTripRoute || tripRouteInfo || tripRouteError) && (
        <div className="absolute top-5 left-5 z-[1000] max-w-[260px] rounded-lg bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {loadingTripRoute && <p className="m-0 text-[13px] text-[#667eea]">Calculating route…</p>}
          {!loadingTripRoute && tripRouteInfo && (
            <>
              <div className="flex gap-[14px] text-sm font-semibold text-[#333]">
                <span>
                  {tripRouteInfo.approx ? '📏' : '🚗'} {tripRouteInfo.distanceKm} km
                </span>
                <span>⏱️ {formatDuration(tripRouteInfo.durationMin)}</span>
              </div>
              {tripRouteInfo.note && <p className="mt-1.5 mb-0 text-[11px] text-[#999]">{tripRouteInfo.note}</p>}
            </>
          )}
        </div>
      )}

      {selectedMarker && (
        <div
          className={`absolute bottom-5 left-5 z-[1000] max-w-[300px] rounded-lg bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${styles.slideUp}`}
        >
          <div className="mb-2 flex items-start justify-between">
            <h4 className="m-0 text-base leading-[1.2] font-semibold">{selectedMarker.name}</h4>
            <button
              type="button"
              onClick={closeMarkerInfo}
              aria-label="Close"
              className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[20px] text-[#999] opacity-50 hover:text-[#333] hover:opacity-75"
            >
              ✕
            </button>
          </div>
          <p className="my-1 inline-block rounded bg-[#f0f0f0] px-2 py-1 text-xs text-[#666] capitalize">
            {selectedMarker.type}
          </p>
          {selectedMarker.rating ? <p className="my-1 text-sm font-medium">⭐ {selectedMarker.rating}/5</p> : null}
          <p className="my-2 text-[13px] leading-[1.4] text-[#555]">{selectedMarker.description}</p>

          {routeInfo && (
            <div className="my-2 rounded bg-[#eaf6ea] px-2.5 py-1.5 text-[13px] font-medium text-[#2e7d32]">
              🚗 {routeInfo.distanceKm} km · {routeInfo.durationMin} min
            </div>
          )}
          {routeError && <p className="my-2 text-xs text-[#c62828]">{routeError}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void showDirectionsToSelected()}
              className={`${btn} border-[#ddd] bg-white text-[#333] hover:bg-[#f0f0f0]`}
              disabled={loadingRoute}
            >
              {loadingRoute ? 'Loading route…' : '🧭 Directions'}
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className={`${btn} border-[#007bff] bg-[#007bff] text-white hover:border-[#0056b3] hover:bg-[#0056b3]`}
            >
              View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
