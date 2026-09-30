'use client';

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { plannerApi } from '@/lib/api';
import type {
  BudgetEstimate,
  Destination,
  DestinationNews,
  ItinerarySuggestion,
  PackingList,
  RoadConditions,
  TransportOptions,
  VehicleType,
  WeatherOutlook,
} from '@/lib/types';

type TabId = 'weather' | 'itinerary' | 'transport' | 'news' | 'packing' | 'route' | 'budget';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'weather', label: 'Weather & Vehicle', icon: '🌦️' },
  { id: 'itinerary', label: 'Itinerary', icon: '🗓️' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'packing', label: 'Packing', icon: '🎒' },
  { id: 'route', label: 'Route & Roads', icon: '🛣️' },
  { id: 'budget', label: 'Budget', icon: '💰' },
];

const TAB_IDS = TABS.map((t) => t.id);

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function tripDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// Default dates depend on "now", so they are read only on the client (the server
// snapshot is null) to avoid a hydration mismatch. The snapshot is a primitive
// string, so repeated reads within the same day are referentially stable.
function subscribeNoop(): () => void {
  return () => {};
}
function getDefaultDatesSnapshot(): string {
  const now = new Date();
  return [toDateInputValue(now), toDateInputValue(addDays(now, 7)), toDateInputValue(addDays(now, 10))].join('|');
}
function getDefaultDatesServerSnapshot(): string | null {
  return null;
}

// ---- Angular pipe equivalents ----

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN'` */
function formatINR(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : inrFormatter.format(value);
}

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `number: '1.2-2'` (default en-US locale) */
function formatRate(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : rateFormatter.format(value);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `date: 'EEE, MMM d'` — date-only ISO strings are read as local dates, like Angular's DatePipe. */
function formatDayLabel(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** `titlecase` */
function titleCase(value: string): string {
  return value.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function stopIcon(type: string): string {
  const icons: Record<string, string> = {
    restaurant: '🍽️',
    tourist_site: '🏛️',
    attraction: '🎪',
    hidden_gem: '💎',
  };
  return icons[type] || '📍';
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    restaurant: 'Restaurant',
    tourist_site: 'Tourist Site',
    attraction: 'Attraction',
    hidden_gem: 'Hidden Gem',
  };
  return labels[type] || type;
}

/** ngModel on a number input: empty → null, otherwise the numeric value. */
function parseNumberInput(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

// ---- Styles (Tailwind port of the component styles + Bootstrap reboot defaults) ----

const H4 = 'font-medium leading-[1.2] text-[calc(1.275rem+.3vw)] min-[1200px]:text-[1.5rem]';
const FIELD = 'flex flex-col gap-1 text-[12px] text-[#666] font-medium';
const INPUT = 'px-2.5 py-2 border border-[#ddd] rounded-md text-[14px]';
const LOADING = 'p-4 text-[#667eea] text-center text-[14px]';
const ERROR = 'text-[#c62828] text-[13px] mt-0 mb-4';
const NOTE = 'text-[12px] text-[#666] bg-[#f5f5fa] px-3 py-2 rounded-md mt-0 mb-3';
const TABLE = 'w-full border-collapse mb-5 text-[13px]';
const TH = 'text-left px-2.5 py-2 border-b border-[#f0f0f0] text-[#999] font-semibold text-[11px] uppercase';
const TD = 'text-left px-2.5 py-2 border-b border-[#f0f0f0]';
const BUDGET_ROW = 'flex justify-between px-3 py-2.5 text-[14px] border-b border-[#f5f5f5]';

const TRAFFIC_CLASSES: Record<RoadConditions['trafficLevel'], string> = {
  light: 'bg-[#eaf6ea] border-l-[#2e7d32]',
  moderate: 'bg-[#fff8e1] border-l-[#f9a825]',
  heavy: 'bg-[#fdecea] border-l-[#c62828]',
};

/**
 * Number input that fires `onCommit` on the native `change` event (blur / Enter /
 * spinner), matching Angular's `(change)` binding, while `onValue` tracks every edit
 * like `[(ngModel)]`.
 */
function NumberInput({
  value,
  min,
  placeholder,
  onValue,
  onCommit,
}: {
  value: number | null;
  min: number;
  placeholder?: string;
  onValue: (value: number | null) => void;
  onCommit: (value: number | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const handleCommit = useEffectEvent((raw: string) => onCommit(parseNumberInput(raw)));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const listener = () => handleCommit(el.value);
    el.addEventListener('change', listener);
    return () => el.removeEventListener('change', listener);
  }, []);

  return (
    <input
      ref={ref}
      type="number"
      min={min}
      placeholder={placeholder}
      className={INPUT}
      value={value ?? ''}
      onChange={(e) => onValue(parseNumberInput(e.target.value))}
    />
  );
}

interface LoadParams {
  destination: Destination;
  startDate: string;
  endDate: string;
  tripDays: number;
  itineraryDays: number;
  vehicleType: VehicleType;
  distanceKm: number | null;
  travelers: number;
  itinerarySuggestion: ItinerarySuggestion | null;
}

export default function TripPlanner({ destination }: { destination: Destination }) {
  const defaults = useSyncExternalStore(subscribeNoop, getDefaultDatesSnapshot, getDefaultDatesServerSnapshot);
  const [todayStr, defaultStart, defaultEnd] = defaults ? defaults.split('|') : ['', '', ''];
  const datesReady = defaults !== null;

  const [activeTab, setActiveTab] = useState<TabId>('weather');

  const [startDateInput, setStartDateInput] = useState<string | null>(null);
  const [endDateInput, setEndDateInput] = useState<string | null>(null);
  const startDate = startDateInput ?? defaultStart;
  const endDate = endDateInput ?? defaultEnd;
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [travelers, setTravelers] = useState<number | null>(2);
  // undefined = follow the trip length (Angular resets itineraryDays to tripDays()
  // on destination and date changes); a number/null is the user's own edit.
  const [itineraryDaysInput, setItineraryDaysInput] = useState<number | null | undefined>(undefined);

  const tripDays = tripDaysBetween(startDate, endDate);
  const itineraryDays = itineraryDaysInput === undefined ? tripDays : itineraryDaysInput;

  const [weatherOutlook, setWeatherOutlook] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [itinerarySuggestion, setItinerarySuggestion] = useState<ItinerarySuggestion | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);

  const [transportOptions, setTransportOptions] = useState<TransportOptions | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);

  const [news, setNews] = useState<DestinationNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingError, setPackingError] = useState<string | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [roadConditions, setRoadConditions] = useState<RoadConditions | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [budget, setBudget] = useState<BudgetEstimate | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const loadedTabs = useRef(new Set<TabId>());
  // Per-tab request counters: a response is applied only if no newer request for
  // that tab (or destination change) has happened since it was issued.
  const requestIds = useRef<Record<TabId, number>>(
    Object.fromEntries(TAB_IDS.map((id) => [id, 0])) as Record<TabId, number>,
  );

  // ---- Destination change (ngOnChanges) ----
  const destinationKey = `${destination.id}|${destination.name}|${destination.lat}|${destination.lng}`;
  const [prevDestinationKey, setPrevDestinationKey] = useState(destinationKey);
  if (prevDestinationKey !== destinationKey) {
    setPrevDestinationKey(destinationKey);
    setItineraryDaysInput(undefined);
    // Drop the previous destination's results so nothing stale is shown (or reused
    // by the route lookup, which starts from the first itinerary stop).
    setWeatherOutlook(null);
    setWeatherLoading(false);
    setWeatherError(null);
    setItinerarySuggestion(null);
    setItineraryLoading(false);
    setItineraryError(null);
    setTransportOptions(null);
    setTransportLoading(false);
    setTransportError(null);
    setNews(null);
    setNewsLoading(false);
    setNewsError(null);
    setPackingList(null);
    setPackingLoading(false);
    setPackingError(null);
    setRouteInfo(null);
    setRoadConditions(null);
    setRouteLoading(false);
    setRouteError(null);
    setBudget(null);
    setBudgetLoading(false);
    setBudgetError(null);
  }

  /** Loading on, error cleared — what each Angular loadX() does before its request. */
  function markLoading(tab: TabId) {
    switch (tab) {
      case 'weather':
        setWeatherLoading(true);
        setWeatherError(null);
        break;
      case 'itinerary':
        setItineraryLoading(true);
        setItineraryError(null);
        break;
      case 'transport':
        setTransportLoading(true);
        setTransportError(null);
        break;
      case 'news':
        setNewsLoading(true);
        setNewsError(null);
        break;
      case 'packing':
        setPackingLoading(true);
        setPackingError(null);
        break;
      case 'route':
        setRouteLoading(true);
        setRouteError(null);
        break;
      case 'budget':
        setBudgetLoading(true);
        setBudgetError(null);
        break;
    }
  }

  // The active tab is (re)loaded whenever the destination changes and once the
  // client-only default dates are available. Its loading state is set here, during
  // render, and the request itself is started by the effect below.
  const loadKey = `${destinationKey}|${datesReady}`;
  const [prevLoadKey, setPrevLoadKey] = useState<string | null>(null);
  if (datesReady && prevLoadKey !== loadKey) {
    setPrevLoadKey(loadKey);
    markLoading(activeTab);
  }

  const currentParams: LoadParams = {
    destination,
    startDate,
    endDate,
    tripDays,
    itineraryDays: itineraryDays ?? tripDays,
    vehicleType,
    distanceKm,
    travelers: travelers ?? 1,
    itinerarySuggestion,
  };

  function nextRequest(tab: TabId): () => boolean {
    const id = ++requestIds.current[tab];
    return () => requestIds.current[tab] === id;
  }

  function loadWeather(p: LoadParams) {
    const isCurrent = nextRequest('weather');
    plannerApi.getWeatherOutlook(p.destination.id, p.startDate, p.endDate).then(
      (res) => {
        if (!isCurrent()) return;
        setWeatherOutlook(res.data ?? null);
        setWeatherLoading(false);
        loadedTabs.current.add('weather');
      },
      (err) => {
        if (!isCurrent()) return;
        console.error('Weather outlook failed:', err);
        setWeatherError('Could not load weather right now. Please try again.');
        setWeatherLoading(false);
      },
    );
  }

  function loadItinerary(p: LoadParams) {
    const isCurrent = nextRequest('itinerary');
    plannerApi.getItinerarySuggestion(p.destination.id, p.itineraryDays).then(
      (res) => {
        if (!isCurrent()) return;
        setItinerarySuggestion(res);
        setItineraryLoading(false);
        loadedTabs.current.add('itinerary');
      },
      (err) => {
        if (!isCurrent()) return;
        console.error('Itinerary suggestion failed:', err);
        setItineraryError('Could not build an itinerary right now. Please try again.');
        setItineraryLoading(false);
      },
    );
  }

  function loadTransport(p: LoadParams) {
    const isCurrent = nextRequest('transport');
    plannerApi.getTransportOptions(p.destination.id, p.startDate).then(
      (res) => {
        if (!isCurrent()) return;
        setTransportOptions(res.data ?? null);
        setTransportLoading(false);
        loadedTabs.current.add('transport');
      },
      (err) => {
        if (!isCurrent()) return;
        console.error('Transport options failed:', err);
        setTransportError('Could not load transport options right now. Please try again.');
        setTransportLoading(false);
      },
    );
  }

  function loadNews(p: LoadParams) {
    const isCurrent = nextRequest('news');
    plannerApi.getNews(p.destination.name).then(
      (res) => {
        if (!isCurrent()) return;
        setNews(res.data ?? null);
        setNewsLoading(false);
        loadedTabs.current.add('news');
      },
      (err) => {
        if (!isCurrent()) return;
        console.error('News fetch failed:', err);
        setNewsError('Could not load news right now. Please try again.');
        setNewsLoading(false);
      },
    );
  }

  function loadPacking(p: LoadParams) {
    const isCurrent = nextRequest('packing');
    plannerApi.getPackingList(p.destination.id, p.startDate, p.endDate, p.tripDays).then(
      (res) => {
        if (!isCurrent()) return;
        setPackingList(res.data ?? null);
        setPackingLoading(false);
        loadedTabs.current.add('packing');
      },
      (err) => {
        if (!isCurrent()) return;
        console.error('Packing list failed:', err);
        setPackingError('Could not build a packing list right now. Please try again.');
        setPackingLoading(false);
      },
    );
  }

  async function loadRoute(p: LoadParams) {
    const isCurrent = nextRequest('route');

    try {
      // Use the first itinerary stop (falling back to the itinerary tab's
      // own fetch) as the destination point for a representative route.
      let firstStop = p.itinerarySuggestion?.data?.[0]?.stops?.[0];
      if (!firstStop) {
        const suggestion = await plannerApi
          .getItinerarySuggestion(p.destination.id, p.itineraryDays)
          .catch(() => null);
        if (!isCurrent()) return;
        firstStop = suggestion?.data?.[0]?.stops?.[0];
      }

      if (firstStop) {
        const url =
          `${OSRM_ROUTE_URL}/${p.destination.lng},${p.destination.lat};${firstStop.lng},${firstStop.lat}` +
          `?overview=false`;
        const response = await fetch(url);
        if (!isCurrent()) return;
        if (response.ok) {
          const data = await response.json();
          if (!isCurrent()) return;
          const route = data.routes?.[0];
          if (route) {
            setRouteInfo({
              distanceKm: Math.round((route.distance / 1000) * 10) / 10,
              durationMin: Math.round(route.duration / 60),
            });
          }
        }
      }

      plannerApi.getRoadConditions(p.destination.lat, p.destination.lng, p.startDate).then(
        (res) => {
          if (!isCurrent()) return;
          setRoadConditions(res.data ?? null);
          setRouteLoading(false);
          loadedTabs.current.add('route');
        },
        (err) => {
          if (!isCurrent()) return;
          console.error('Road conditions failed:', err);
          setRouteError('Could not load road conditions right now.');
          setRouteLoading(false);
        },
      );
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Route lookup failed:', error);
      setRouteError('Could not load route information right now.');
      setRouteLoading(false);
    }
  }

  function loadBudget(p: LoadParams) {
    const isCurrent = nextRequest('budget');
    plannerApi
      .getBudgetEstimate(p.destination.id, p.tripDays, p.travelers, p.vehicleType, p.distanceKm ?? undefined)
      .then(
        (res) => {
          if (!isCurrent()) return;
          setBudget(res.data ?? null);
          setBudgetLoading(false);
          loadedTabs.current.add('budget');
        },
        (err) => {
          if (!isCurrent()) return;
          console.error('Budget estimate failed:', err);
          setBudgetError('Could not calculate a budget right now. Please try again.');
          setBudgetLoading(false);
        },
      );
  }

  /** Starts the request for `tab` unless it is already loaded; returns whether it started. */
  function loadTab(tab: TabId, p: LoadParams): boolean {
    if (!p.destination || !datesReady || loadedTabs.current.has(tab)) return false;
    startTab(tab, p);
    return true;
  }

  function startTab(tab: TabId, p: LoadParams) {
    switch (tab) {
      case 'weather':
        loadWeather(p);
        break;
      case 'itinerary':
        loadItinerary(p);
        break;
      case 'transport':
        loadTransport(p);
        break;
      case 'news':
        loadNews(p);
        break;
      case 'packing':
        loadPacking(p);
        break;
      case 'route':
        void loadRoute(p);
        break;
      case 'budget':
        loadBudget(p);
        break;
    }
  }

  // On a new destination: forget which tabs are loaded and invalidate in-flight
  // requests (layout effect, so it happens before any response can land).
  useLayoutEffect(() => {
    loadedTabs.current.clear();
    for (const id of TAB_IDS) requestIds.current[id]++;
  }, [destinationKey]);

  const loadActiveTabOnChange = useEffectEvent(() => {
    loadTab(activeTab, currentParams);
  });

  useEffect(() => {
    loadActiveTabOnChange();
  }, [destinationKey, datesReady]);

  // ---- Event handlers ----

  function selectTab(tab: TabId) {
    setActiveTab(tab);
    if (loadTab(tab, currentParams)) markLoading(tab);
  }

  function onDatesChanged(nextStart: string, nextEnd: string) {
    setStartDateInput(nextStart);
    setEndDateInput(nextEnd);
    setItineraryDaysInput(undefined);
    const nextTripDays = tripDaysBetween(nextStart, nextEnd);
    loadedTabs.current.delete('weather');
    loadedTabs.current.delete('packing');
    const started = loadTab(activeTab, {
      ...currentParams,
      startDate: nextStart,
      endDate: nextEnd,
      tripDays: nextTripDays,
      itineraryDays: nextTripDays,
    });
    if (started) markLoading(activeTab);
  }

  function onBudgetInputChanged(overrides: Partial<LoadParams>) {
    loadedTabs.current.delete('budget');
    if (activeTab === 'budget' && loadTab('budget', { ...currentParams, ...overrides })) markLoading('budget');
  }

  function onItineraryDaysCommitted(value: number | null) {
    setItineraryDaysInput(value);
    reloadItinerary({ ...currentParams, itineraryDays: value ?? tripDays });
  }

  /** Angular's loadItinerary(): always refetches, regardless of loaded state. */
  function reloadItinerary(p: LoadParams) {
    if (!datesReady) return;
    markLoading('itinerary');
    loadItinerary(p);
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] overflow-hidden mt-5">
      <div className="flex flex-wrap border-b border-[#eee] bg-[#f9f9ff]">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex-auto min-w-30 px-2.5 py-3 border-0 border-b-[3px] border-solid bg-transparent cursor-pointer text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
                active
                  ? 'text-[#667eea] border-b-[#667eea] bg-white'
                  : 'text-[#666] border-b-transparent hover:bg-[#f0f0fa] hover:text-[#333]'
              }`}
              onClick={() => selectTab(tab.id)}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 max-h-150 overflow-y-auto">
        {/* ============ WEATHER & VEHICLE ============ */}
        {activeTab === 'weather' && (
          <section>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className={FIELD}>
                Start date
                <input
                  type="date"
                  className={INPUT}
                  value={startDate}
                  min={todayStr || undefined}
                  onChange={(e) => onDatesChanged(e.target.value, endDate)}
                />
              </label>
              <label className={FIELD}>
                End date
                <input
                  type="date"
                  className={INPUT}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => onDatesChanged(startDate, e.target.value)}
                />
              </label>
              <label className={FIELD}>
                Vehicle
                <select
                  className={INPUT}
                  value={vehicleType}
                  onChange={(e) => {
                    const next = e.target.value as VehicleType;
                    setVehicleType(next);
                    onBudgetInputChanged({ vehicleType: next });
                  }}
                >
                  <option value="car">🚗 Car</option>
                  <option value="bike">🏍️ Bike</option>
                  <option value="bus">🚌 Bus</option>
                  <option value="train">🚆 Train</option>
                  <option value="flight">✈️ Flight</option>
                </select>
              </label>
              <label className={FIELD}>
                Distance to destination (km, one-way)
                <NumberInput
                  min={0}
                  placeholder="e.g. 250"
                  value={distanceKm}
                  onValue={setDistanceKm}
                  onCommit={(value) => {
                    setDistanceKm(value);
                    onBudgetInputChanged({ distanceKm: value });
                  }}
                />
              </label>
              <label className={FIELD}>
                Travelers
                <NumberInput
                  min={1}
                  value={travelers}
                  onValue={setTravelers}
                  onCommit={(value) => {
                    setTravelers(value);
                    onBudgetInputChanged({ travelers: value ?? 1 });
                  }}
                />
              </label>
            </div>
            {datesReady && (
              <p className="text-[13px] text-[#555] mt-0 mb-3">
                Trip length: <strong>{tripDays} day(s)</strong>
              </p>
            )}

            {weatherLoading && <div className={LOADING}>Loading weather…</div>}
            {weatherError && <p className={ERROR}>{weatherError}</p>}

            {weatherOutlook && (
              <div>
                {weatherOutlook.source === 'historical-estimate' && (
                  <p className={NOTE}>
                    📅 These dates are beyond the live forecast window — showing typical conditions from the same
                    dates last year.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {weatherOutlook.days.map((day) => (
                    <div
                      key={day.date}
                      className="border border-[#eee] rounded-lg p-3 min-w-30 text-center flex-[1_1_120px]"
                    >
                      <div className="text-[12px] text-[#999] mb-1">{formatDayLabel(day.date)}</div>
                      <div className="text-[28px]">{day.icon}</div>
                      <div className="font-semibold text-[15px] my-1">
                        {day.tempMax}° / {day.tempMin}°C
                      </div>
                      <div className="text-[12px] text-[#555]">{day.condition}</div>
                      <div className="text-[11px] text-[#999] mt-1">
                        💧 {day.precipitationMm}mm · 💨 {day.windSpeedMaxKmh} km/h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============ ITINERARY ============ */}
        {activeTab === 'itinerary' && (
          <section>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className={FIELD}>
                Days to plan
                <NumberInput
                  min={1}
                  value={itineraryDays}
                  onValue={setItineraryDaysInput}
                  onCommit={onItineraryDaysCommitted}
                />
              </label>
              <button
                type="button"
                className="self-end px-4 py-2 border border-[#667eea] bg-white text-[#667eea] rounded-md cursor-pointer text-[13px] font-medium h-9.5 hover:bg-[#667eea] hover:text-white"
                onClick={() => reloadItinerary(currentParams)}
              >
                Recalculate
              </button>
            </div>

            {itineraryLoading && <div className={LOADING}>Building itinerary…</div>}
            {itineraryError && <p className={ERROR}>{itineraryError}</p>}

            {itinerarySuggestion && (
              <div>
                <p className={NOTE}>
                  📌 Recommended minimum: <strong>{itinerarySuggestion.minDaysRequired} day(s)</strong> to comfortably
                  cover the top spots. {itinerarySuggestion.note}
                </p>

                {itinerarySuggestion.data.map((day) => (
                  <div key={day.dayNumber} className="mb-5 border border-[#eee] rounded-lg px-4 py-3">
                    <h4 className={`${H4} mt-0 mb-2.5 text-[#667eea]`}>Day {day.dayNumber}</h4>
                    {day.stops.map((stop, i) => (
                      <div
                        key={`${stop.id}-${i}`}
                        className="flex gap-2.5 py-2 border-t border-[#f5f5f5] first-of-type:border-t-0"
                      >
                        <span className="text-[20px]">{stopIcon(stop.type)}</span>
                        <div>
                          <div className="font-medium text-[14px]">{stop.name}</div>
                          <div className="text-[12px] text-[#999]">
                            ⭐ {stop.rating}/5 · {stop.visitMinutes} min · {typeLabel(stop.type)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ TRANSPORT ============ */}
        {activeTab === 'transport' && (
          <section>
            {transportLoading && <div className={LOADING}>Loading transport options…</div>}
            {transportError && <p className={ERROR}>{transportError}</p>}

            {transportOptions && (
              <div>
                <p className={NOTE}>⚠️ {transportOptions.disclaimer}</p>

                <h4 className={`${H4} mt-0 mb-2`}>🚆 Trains</h4>
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th className={TH}>Operator</th>
                      <th className={TH}>No.</th>
                      <th className={TH}>Departs</th>
                      <th className={TH}>Duration</th>
                      <th className={TH}>Fare (approx.)</th>
                      <th className={TH}>Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportOptions.trains.map((train, i) => (
                      <tr key={train.id ?? i}>
                        <td className={TD}>{train.operator}</td>
                        <td className={TD}>{train.trainNumber}</td>
                        <td className={TD}>{train.departureTime}</td>
                        <td className={TD}>{train.durationHours}h</td>
                        <td className={TD}>{formatINR(train.fareEstimate)}</td>
                        <td className={TD}>{train.seatsAvailable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 className={`${H4} mt-0 mb-2`}>🚌 Buses</h4>
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th className={TH}>Operator</th>
                      <th className={TH}>Type</th>
                      <th className={TH}>Departs</th>
                      <th className={TH}>Duration</th>
                      <th className={TH}>Fare (approx.)</th>
                      <th className={TH}>Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportOptions.buses.map((bus, i) => (
                      <tr key={bus.id ?? i}>
                        <td className={TD}>{bus.operator}</td>
                        <td className={TD}>{bus.busType}</td>
                        <td className={TD}>{bus.departureTime}</td>
                        <td className={TD}>{bus.durationHours}h</td>
                        <td className={TD}>{formatINR(bus.fareEstimate)}</td>
                        <td className={TD}>{bus.seatsAvailable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============ NEWS ============ */}
        {activeTab === 'news' && (
          <section>
            {newsLoading && <div className={LOADING}>Loading news…</div>}
            {newsError && <p className={ERROR}>{newsError}</p>}

            {news && (
              <div>
                <p className={NOTE}>ℹ️ {news.disclaimer}</p>
                {news.articles.map((article, i) => (
                  <div key={`${article.url ?? article.title}-${i}`} className="border-b border-[#f0f0f0] py-3">
                    <h4 className="font-medium leading-[1.2] mt-0 mb-1 text-[14px]">
                      {article.url ? (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener"
                          className="text-[#0d6efd] underline hover:text-[#0a58ca]"
                        >
                          {article.title}
                        </a>
                      ) : (
                        <span>{article.title}</span>
                      )}
                    </h4>
                    <p className="mt-0 mb-1 text-[13px] text-[#555]">{article.description}</p>
                    <span className="text-[11px] text-[#999]">{article.source}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ PACKING ============ */}
        {activeTab === 'packing' && (
          <section>
            {packingLoading && <div className={LOADING}>Building packing list…</div>}
            {packingError && <p className={ERROR}>{packingError}</p>}

            {packingList && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
                {(
                  [
                    ['🧳 Common (everyone)', packingList.common],
                    ['👔 Men', packingList.men],
                    ['👗 Women', packingList.women],
                  ] as const
                ).map(([heading, items]) => (
                  <div key={heading}>
                    <h4 className={`${H4} mt-0 mb-2.5 text-[#667eea]`}>{heading}</h4>
                    <ul className="m-0 pl-4.5 text-[13px] text-[#444] leading-[1.8]">
                      {items.map((item, i) => (
                        <li key={`${item}-${i}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ ROUTE & ROADS ============ */}
        {activeTab === 'route' && (
          <section>
            {routeLoading && <div className={LOADING}>Checking route &amp; road conditions…</div>}
            {routeError && <p className={ERROR}>{routeError}</p>}

            {routeInfo && (
              <div>
                <div className="text-[15px] mb-4">
                  🚗 Approx. <strong>{routeInfo.distanceKm} km</strong> · <strong>{routeInfo.durationMin} min</strong>{' '}
                  to the first itinerary stop
                </div>
              </div>
            )}

            {roadConditions && (
              <div
                className={`p-3.5 rounded-lg border-l-4 border-solid border-l-[#999] ${
                  TRAFFIC_CLASSES[roadConditions.trafficLevel] ?? ''
                }`}
              >
                <strong>Traffic: {titleCase(roadConditions.trafficLevel)}</strong>
                <p className="mt-0 mb-4">{roadConditions.note}</p>
                <p className={NOTE}>⚠️ {roadConditions.disclaimer}</p>
              </div>
            )}
          </section>
        )}

        {/* ============ BUDGET ============ */}
        {activeTab === 'budget' && (
          <section>
            {budgetLoading && <div className={LOADING}>Calculating budget…</div>}
            {budgetError && <p className={ERROR}>{budgetError}</p>}

            {budget && (
              <div>
                <p className={NOTE}>⚠️ {budget.disclaimer}</p>
                <div className="flex flex-col gap-1">
                  <div className={BUDGET_ROW}>
                    <span>🏨 Accommodation</span>
                    <span>{formatINR(budget.breakdown.accommodation)}</span>
                  </div>
                  <div className={BUDGET_ROW}>
                    <span>🍽️ Food</span>
                    <span>{formatINR(budget.breakdown.food)}</span>
                  </div>
                  <div className={BUDGET_ROW}>
                    <span>🎟️ Activities</span>
                    <span>{formatINR(budget.breakdown.activities)}</span>
                  </div>
                  <div className={BUDGET_ROW}>
                    <span>⛽ Transport / Fuel</span>
                    <span>{formatINR(budget.breakdown.transport)}</span>
                  </div>
                  <div className={BUDGET_ROW}>
                    <span>🧾 Miscellaneous</span>
                    <span>{formatINR(budget.breakdown.misc)}</span>
                  </div>
                  <div className={`${BUDGET_ROW} font-semibold border-t-2 border-t-[#eee] mt-1.5`}>
                    <span>Total (estimated)</span>
                    <span>{formatINR(budget.total)}</span>
                  </div>
                  <div className={BUDGET_ROW}>
                    <span>+ 15% contingency</span>
                    <span>{formatINR(budget.contingencyBuffer)}</span>
                  </div>
                  <div className={`${BUDGET_ROW} bg-[#f0f4ff] rounded-md font-semibold text-[#667eea]`}>
                    <span>💵 Recommended cash to carry</span>
                    <span>{formatINR(budget.recommendedCash)}</span>
                  </div>
                </div>
                <p className={NOTE}>{budget.transportNote}</p>
                <p className={NOTE}>
                  Converted at ₹{formatRate(budget.usdRate)} per USD{' '}
                  {budget.rateSource === 'frankfurter' && budget.rateDate && (
                    <span>(ECB reference rate, {budget.rateDate})</span>
                  )}
                  {budget.rateSource === 'fallback' && <span>(approximate — live rate unavailable)</span>}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
