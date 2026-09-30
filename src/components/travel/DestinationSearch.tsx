'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import HeroBanner from '@/components/HeroBanner';
import SearchAutocomplete from '@/components/travel/SearchAutocomplete';
import MapContainer from '@/components/travel/MapContainerClient';
import TripPlanner from '@/components/travel/TripPlanner';
import { travelApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  Destination,
  DestinationExplore,
  DestinationPhoto,
  DestinationVideo,
  InstagramVideo,
  Location,
  RoadConditions,
  TransportOptions,
  Trip,
  Weather,
} from '@/lib/types';
import type { MapLocation, TripRouteInfo } from './map-types';
import { BTN_PRIMARY, BTN_SECONDARY } from './search/buttons';
import ExploreSection from './search/ExploreSection';
import { formatDuration } from './search/format';
import LocationModal, { type SelectedLocation } from './search/LocationModal';
import { InstagramSection, PhotosSection, VideosSection } from './search/MediaSections';
import VehicleOptions from './search/VehicleOptions';

/** A destination location as shown on the map (description = category, falling back to type). */
type PageLocation = Location & { description: string };

const placeQuery = (d: Destination) => [d.name, d.country].filter(Boolean).join(', ');

export default function DestinationSearch() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [originPlace, setOriginPlace] = useState<Destination | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [locations, setLocations] = useState<PageLocation[]>([]);
  const [explore, setExploreState] = useState<DestinationExplore | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<Weather | null>(null);
  const [photos, setPhotos] = useState<DestinationPhoto[]>([]);
  const [photosDisclaimer, setPhotosDisclaimer] = useState('');
  const [videos, setVideos] = useState<DestinationVideo[]>([]);
  const [videosDisclaimer, setVideosDisclaimer] = useState('');
  const [instagramVideos, setInstagramVideos] = useState<InstagramVideo[]>([]);
  const [instagramHashtag, setInstagramHashtag] = useState('');
  const [instagramDisclaimer, setInstagramDisclaimer] = useState('');

  const [tripRouteInfo, setTripRouteInfo] = useState<TripRouteInfo | null>(null);
  const [transportOptions, setTransportOptions] = useState<TransportOptions | null>(null);
  const [roadConditions, setRoadConditions] = useState<RoadConditions | null>(null);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);

  // Latest values for async callbacks, plus request counters so a late response
  // for a destination / origin the user has already moved away from is ignored.
  const originRef = useRef<Destination | null>(null);
  const destinationRef = useRef<Destination | null>(null);
  const exploreRef = useRef<DestinationExplore | null>(null);
  const selectionReq = useRef(0);
  const exploreReq = useRef(0);
  const vehicleReq = useRef(0);

  const setExplore = useCallback((value: DestinationExplore | null) => {
    exploreRef.current = value;
    setExploreState(value);
  }, []);

  /** Drops any in-flight transport/road requests (their pairing is no longer current). */
  const invalidateVehicleRequests = useCallback(() => {
    vehicleReq.current++;
    setIsLoadingTransport(false);
  }, []);

  const { restaurantCount, attractionCount, gemCount } = useMemo(
    () => ({
      restaurantCount: locations.filter((l) => l.type === 'restaurant').length,
      attractionCount: locations.filter((l) => l.type === 'tourist_site' || l.type === 'attraction').length,
      gemCount: locations.filter((l) => l.type === 'hidden_gem').length,
    }),
    [locations],
  );

  // Stable map inputs: only rebuilt when the coordinates/names actually change,
  // so the map doesn't recompute its route on unrelated re-renders.
  const oLat = originPlace?.lat;
  const oLng = originPlace?.lng;
  const oName = originPlace?.name;
  const dLat = selectedDestination?.lat;
  const dLng = selectedDestination?.lng;
  const dName = selectedDestination?.name;
  const mapCenter = useMemo(
    () => (dLat !== undefined && dLng !== undefined ? { lat: dLat, lng: dLng } : undefined),
    [dLat, dLng],
  );
  const tripRoute = useMemo(
    () =>
      oLat !== undefined && oLng !== undefined && dLat !== undefined && dLng !== undefined
        ? {
            origin: { lat: oLat, lng: oLng, name: oName },
            destination: { lat: dLat, lng: dLng, name: dName },
          }
        : null,
    [oLat, oLng, oName, dLat, dLng, dName],
  );

  // ---------- Origin / route / vehicles ----------

  const onOriginSelected = useCallback(
    (place: Destination) => {
      originRef.current = place;
      setOriginPlace(place);
      // A new origin invalidates any previously computed route/vehicle details
      // for the old pairing until the map recomputes them.
      invalidateVehicleRequests();
      setTripRouteInfo(null);
      setTransportOptions(null);
      setRoadConditions(null);
    },
    [invalidateVehicleRequests],
  );

  const loadVehicleDetails = useCallback((info: TripRouteInfo | null) => {
    const origin = originRef.current;
    const destination = destinationRef.current;
    if (!origin || !destination) return;

    const req = ++vehicleReq.current;
    setIsLoadingTransport(true);
    travelApi.getTransportOptions(destination.id, undefined, info?.distanceKm).then(
      (res) => {
        if (req !== vehicleReq.current) return;
        setTransportOptions(res.data ?? null);
        setIsLoadingTransport(false);
      },
      (err) => {
        console.error('Error loading transport options:', err);
        if (req !== vehicleReq.current) return;
        setIsLoadingTransport(false);
      },
    );

    travelApi
      .getRoadConditions({
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng,
      })
      .then(
        (res) => {
          if (req !== vehicleReq.current) return;
          setRoadConditions(res.data ?? null);
        },
        (err) => console.error('Error loading road conditions:', err),
      );
  }, []);

  /** Fired by the map once it has a real (or straight-line fallback) distance/route for the current origin+destination pair. */
  const onTripRouteComputed = useCallback(
    (info: TripRouteInfo | null) => {
      setTripRouteInfo(info);
      loadVehicleDetails(info);
    },
    [loadVehicleDetails],
  );

  // ---------- Destination data ----------

  const loadExplore = useCallback(
    (destination: Destination, refresh = false) => {
      const req = ++exploreReq.current;
      // On refresh, keep showing the current results until the new ones arrive.
      if (!refresh) setExplore(null);
      setExploreLoading(true);
      setExploreError(false);
      travelApi.getDestinationExplore(destination.id, refresh).then(
        (response) => {
          if (req !== exploreReq.current) return;
          setExplore(response.data ?? null);
          setExploreLoading(false);
        },
        (err) => {
          console.error('Error loading explore data:', err);
          if (req !== exploreReq.current) return;
          setExploreLoading(false);
          // A failed refresh keeps the previous results visible; only a failed first load shows the error.
          if (!exploreRef.current) setExploreError(true);
        },
      );
    },
    [setExplore],
  );

  const selectDestination = useCallback(
    (destination: Destination) => {
      const req = ++selectionReq.current;
      const isCurrent = () => req === selectionReq.current;
      destinationRef.current = destination;
      invalidateVehicleRequests();
      setSelectedDestination(destination);
      setSelectedLocation(null);

      // Locations
      travelApi.getDestinationLocations(destination.id).then(
        (response) => {
          if (!isCurrent()) return;
          setLocations((response.data || []).map((loc) => ({ ...loc, description: loc.category || loc.type })));
        },
        (err) => console.error('Error loading locations:', err),
      );

      // Weather
      travelApi.getWeatherForecast(destination.id, 7).then(
        (response) => {
          if (!isCurrent()) return;
          setCurrentWeather((response.data as { current?: Weather } | undefined)?.current ?? null);
        },
        (err) => console.error('Error loading weather:', err),
      );

      // Photos
      setPhotos([]);
      travelApi.getDestinationPhotos(placeQuery(destination)).then(
        (response) => {
          if (!isCurrent()) return;
          setPhotos(response.data?.photos ?? []);
          setPhotosDisclaimer(response.data?.disclaimer ?? '');
        },
        (err) => console.error('Error loading photos:', err),
      );

      // Videos
      setVideos([]);
      travelApi.getDestinationVideos(placeQuery(destination)).then(
        (response) => {
          if (!isCurrent()) return;
          setVideos(response.data?.videos ?? []);
          setVideosDisclaimer(response.data?.disclaimer ?? '');
        },
        (err) => console.error('Error loading videos:', err),
      );

      // Instagram — hashtags are per place name only (#chandigarh), not "name, country".
      setInstagramVideos([]);
      travelApi.getDestinationInstagramVideos(destination.name).then(
        (response) => {
          if (!isCurrent()) return;
          setInstagramVideos(response.data?.videos ?? []);
          setInstagramHashtag(response.data?.hashtag ?? '');
          setInstagramDisclaimer(response.data?.disclaimer ?? '');
        },
        (err) => console.error('Error loading Instagram videos:', err),
      );

      loadExplore(destination);
    },
    [invalidateVehicleRequests, loadExplore],
  );

  /** "Try again" after a failed lookup — failures aren't cached server-side, so a normal request retries. */
  const retryExplore = () => {
    if (selectedDestination) loadExplore(selectedDestination);
  };

  /** "Refresh" loaded results — asks the server to skip its cache. */
  const refreshExplore = () => {
    if (selectedDestination && !exploreLoading) loadExplore(selectedDestination, true);
  };

  const clearSelection = () => {
    selectionReq.current++;
    exploreReq.current++;
    invalidateVehicleRequests();
    destinationRef.current = null;
    originRef.current = null;
    setSelectedDestination(null);
    setOriginPlace(null);
    setLocations([]);
    setExplore(null);
    setExploreLoading(false);
    setExploreError(false);
    setCurrentWeather(null);
    setPhotos([]);
    setVideos([]);
    setInstagramVideos([]);
    setSelectedLocation(null);
    setTripRouteInfo(null);
    setTransportOptions(null);
    setRoadConditions(null);
  };

  // ---------- Actions ----------

  const createTrip = () => {
    if (!selectedDestination) return;
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    // The API derives the trip owner from the auth token; no user id is sent.
    const tripData: Partial<Trip> = {
      name: `${selectedDestination.name} Trip`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      destinationId: selectedDestination.id,
      budget: 3000,
    };

    travelApi.createTrip(tripData).then(
      (response) => {
        if (response.data?.id) router.push(`/travel/trips/${encodeURIComponent(response.data.id)}`);
      },
      (err) => console.error('Error creating trip:', err),
    );
  };

  const viewDetails = () => {
    if (selectedDestination) router.push(`/travel/destinations/${encodeURIComponent(selectedDestination.id)}`);
  };

  const onLocationSelected = useCallback(
    (loc: MapLocation) => {
      setSelectedLocation(locations.find((l) => l.id === loc.id) ?? loc);
    },
    [locations],
  );

  const addToItinerary = () => {
    console.log('Adding to itinerary:', selectedLocation);
    setSelectedLocation(null);
  };

  const closeLocation = () => setSelectedLocation(null);

  return (
    <div className="box-border min-h-screen bg-cream p-6 font-sans">
      <div className="mx-auto max-w-[1600px]">
        <HeroBanner />
      </div>

      <div className="mx-auto box-border grid min-h-[calc(100vh-40px)] max-w-[1600px] grid-cols-[350px_1fr] gap-5 max-[1025px]:h-screen max-[1025px]:grid-cols-1 max-[1025px]:grid-rows-[auto_1fr] max-[769px]:gap-3 max-[769px]:p-3">
        <div className="max-h-[calc(100vh-60px)] overflow-y-auto rounded-[28px] bg-white p-7 shadow-travel max-[1025px]:max-h-[50vh] max-[769px]:rounded-lg">
          <div className="mb-6 text-center">
            <h1 className="m-0 text-[26px] leading-[1.2] font-bold text-ink">🌍 Plan Your Route</h1>
            <p className="mt-2 mb-0 text-sm text-ink-soft">
              Search a starting point and a destination — same search box, used both ways
            </p>
          </div>

          <div className="mb-2 flex flex-col gap-2">
            <SearchAutocomplete
              label="Starting point"
              placeholder="Search starting point..."
              onSuggestionSelected={onOriginSelected}
            />
            {originPlace && (
              <p className="-mt-1 mb-2 text-xs font-semibold text-forest">
                📍 {originPlace.name}, {originPlace.country}
              </p>
            )}

            <SearchAutocomplete
              label="Destination"
              placeholder="Search destination..."
              onSuggestionSelected={selectDestination}
            />
            {selectedDestination && (
              <p className="-mt-1 mb-2 text-xs font-semibold text-forest">
                📍 {selectedDestination.name}, {selectedDestination.country}
              </p>
            )}
          </div>

          {(!originPlace || !selectedDestination) && (
            <p className="m-0 mb-4 text-xs text-ink-soft">
              Select both a starting point and a destination to see the distance, route, weather, and vehicle options.
            </p>
          )}

          {tripRouteInfo && (
            <div className="mb-1 flex gap-4 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-ink">
              <span>
                {tripRouteInfo.approx ? '📏' : '🚗'} {tripRouteInfo.distanceKm} km
              </span>
              <span>⏱️ {formatDuration(tripRouteInfo.durationMin)}</span>
            </div>
          )}
          {tripRouteInfo?.note && <p className="mt-1.5 mb-4 text-[11px] text-ink-soft">{tripRouteInfo.note}</p>}

          {selectedDestination && (
            <div className="mt-5 rounded-[22px] bg-[linear-gradient(135deg,var(--travel-forest)_0%,var(--travel-forest-dark)_100%)] p-[22px] text-white">
              <div className="mb-3 flex items-start justify-between">
                <h2 className="m-0 text-[18px] leading-[1.2] font-medium">
                  {selectedDestination.name}, {selectedDestination.country}
                </h2>
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Clear selection"
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-white/20 text-[18px] text-white transition-all duration-200 ease-[ease] hover:bg-white/30"
                >
                  ✕
                </button>
              </div>
              <p className="m-0 mb-4 text-[13px] leading-normal opacity-90">{selectedDestination.description}</p>

              <div className="mb-4 flex gap-2">
                <button type="button" onClick={createTrip} className={BTN_PRIMARY}>
                  ✈️ Plan a Trip
                </button>
                <button type="button" onClick={viewDetails} className={BTN_SECONDARY}>
                  📖 View Details
                </button>
              </div>

              {currentWeather && (
                <div className="rounded-md bg-white/10 p-3 backdrop-blur-[10px]">
                  <h4 className="m-0 mb-2 text-[13px] leading-[1.2] font-medium">Current Weather</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">{currentWeather.icon}</span>
                    <div>
                      <p className="my-0.5 text-[18px] font-semibold">{currentWeather.temp}°C</p>
                      <p className="my-0.5 text-xs opacity-90">{currentWeather.condition}</p>
                      <p className="my-0.5 text-[11px] opacity-80">
                        Humidity: {currentWeather.humidity}% | Wind: {currentWeather.windSpeed} km/h
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {originPlace && selectedDestination && (
            <VehicleOptions loading={isLoadingTransport} transport={transportOptions} road={roadConditions} />
          )}
        </div>

        {originPlace && selectedDestination && (
          <div className="flex min-h-[500px] flex-col overflow-hidden rounded-[28px] bg-white shadow-travel max-[1025px]:h-full max-[1025px]:min-h-[400px] max-[769px]:rounded-lg">
            <div className="border-b border-cream-soft bg-cream px-[22px] py-[18px]">
              <h3 className="m-0 mb-2 text-base leading-[1.2] font-bold text-ink">
                {originPlace.name} → {selectedDestination.name}
              </h3>
              <div className="flex gap-4 text-[13px] text-ink-soft">
                {restaurantCount > 0 && <span className="flex items-center gap-1">🍽️ {restaurantCount} Restaurants</span>}
                {attractionCount > 0 && <span className="flex items-center gap-1">🏛️ {attractionCount} Attractions</span>}
                {gemCount > 0 && <span className="flex items-center gap-1">💎 {gemCount} Hidden Gems</span>}
              </div>
            </div>

            <div className="block min-h-[400px] flex-1">
              <MapContainer
                locations={locations}
                center={mapCenter}
                zoom={8}
                tripRoute={tripRoute}
                onLocationSelected={onLocationSelected}
                onTripRouteComputed={onTripRouteComputed}
              />
            </div>
          </div>
        )}
      </div>

      {selectedDestination && photos.length > 0 && (
        <PhotosSection destinationName={selectedDestination.name} photos={photos} disclaimer={photosDisclaimer} />
      )}

      {selectedDestination && videos.length > 0 && (
        <VideosSection destinationName={selectedDestination.name} videos={videos} disclaimer={videosDisclaimer} />
      )}

      {selectedDestination && instagramVideos.length > 0 && (
        <InstagramSection hashtag={instagramHashtag} videos={instagramVideos} disclaimer={instagramDisclaimer} />
      )}

      {selectedDestination && (exploreLoading || explore || exploreError) && (
        <ExploreSection
          destinationName={selectedDestination.name}
          explore={explore}
          loading={exploreLoading}
          error={exploreError}
          onRefresh={refreshExplore}
          onRetry={retryExplore}
        />
      )}

      {selectedDestination && (
        <div className="mx-auto max-w-[1600px]">
          <TripPlanner destination={selectedDestination} />
        </div>
      )}

      {selectedLocation && (
        <LocationModal location={selectedLocation} onClose={closeLocation} onAddToTrip={addToItinerary} />
      )}
    </div>
  );
}
