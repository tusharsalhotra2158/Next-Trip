require('./load-env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { destinations, locationsByDestination, getOrCreateDestination } = require('./data/destinations');
const { searchPlaces, listCountries, listStates, listCities, geocodePlace } = require('./data/citySearch');
const { aiSearchPlaces } = require('./data/geminiSearch');
const { currentWeatherFor, forecastFor } = require('./data/weather');
const { getWeatherOutlook } = require('./data/openMeteo');
const { suggestMinDays, buildItinerary } = require('./data/itinerary');
const { mockTransportOptions, mockRoadConditions } = require('./data/transport');
const { buildPackingList } = require('./data/packing');
const { getDestinationNews } = require('./data/news');
const { getDestinationPhotos } = require('./data/photos');
const { getDestinationVideos } = require('./data/youtube');
const { getDestinationInstagramVideos } = require('./data/instagram');
const { getDestinationExplore } = require('./data/explore');
const { buildBudgetEstimate } = require('./data/budget');
const { getDisplayFx } = require('./data/fx');
const { signup, login, authenticate } = require('./data/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Comma-separated list of allowed browser origins, e.g. "http://localhost:4200,https://app.example.com".
// Defaults to the Angular dev server so local development keeps working out of the box.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(',').map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl, server-to-server) which send no Origin header.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));

// General limiter for the whole API, plus a stricter one for routes that
// proxy to metered/paid third-party APIs (Gemini, GNews, Unsplash/Pexels, YouTube, Instagram) to bound cost/quota
// exposure from a single abusive client.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again shortly.' },
});

// In-memory stores for user-created data (reset on server restart).
const trips = new Map();
const itinerariesByTrip = new Map();
let tripCounter = 1;
let dayCounter = 1;

const ok = (data, extra = {}) => ({ success: true, data, ...extra });
const fail = (message, code = 404) => ({ success: false, error: message, message });

// Clamp a request-supplied number into [min, max], falling back to `def` when
// missing/invalid. Used anywhere a client-controlled count (days, limit, …)
// would otherwise drive an unbounded loop or array allocation.
const clampInt = (value, def, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

// Trip/itinerary endpoints require a verified session (see `authenticate` in
// backend/src/data/auth.js, which sets req.userId from a signed JWT — never
// from a client-supplied header) and require req.userId to match the trip's
// owner, so one user can't read/modify/delete another user's trip just by
// guessing its sequential id.
function requireTripOwner(req, res, next) {
  const trip = trips.get(req.params.tripId);
  if (!trip) return res.status(404).json(fail('Trip not found'));

  if (req.userId !== trip.userId) {
    return res.status(403).json(fail('You do not have access to this trip', 403));
  }

  req.trip = trip;
  next();
}

// ==================== AUTH ====================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later.' },
});

app.post('/api/v1/auth/signup', authLimiter, async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const user = await signup({ firstName, lastName, email, password });
    res.status(201).json(ok({ user }, { message: 'Account created successfully. Please login.' }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await login({ email, password });
    res.json(ok({ user, token }, { message: 'Login successful' }));
  } catch (error) {
    next(error);
  }
});

// ==================== DESTINATIONS ====================

app.get('/api/v1/destinations/search', (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const results = q
    ? destinations.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      )
    : destinations;

  res.json(ok(results, { count: results.length }));
});

app.get('/api/v1/destinations/popular', (req, res) => {
  const popular = destinations.slice(0, 8);
  res.json(ok(popular, { count: popular.length }));
});

app.get('/api/v1/destinations/:id', (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));
  res.json(ok(destination));
});

app.get('/api/v1/destinations/:id/locations', (req, res) => {
  const locations = locationsByDestination.get(req.params.id) || [];
  const { type } = req.query;
  const filtered = type ? locations.filter((l) => l.type === type) : locations;
  res.json(ok(filtered, { count: filtered.length }));
});

app.get('/api/v1/destinations/:id/restaurants', (req, res) => {
  const locations = (locationsByDestination.get(req.params.id) || []).filter(
    (l) => l.type === 'restaurant',
  );
  res.json(ok(locations, { count: locations.length }));
});

app.get('/api/v1/destinations/:id/attractions', (req, res) => {
  const locations = (locationsByDestination.get(req.params.id) || []).filter(
    (l) => l.type === 'tourist_site' || l.type === 'attraction',
  );
  res.json(ok(locations, { count: locations.length }));
});

// Real popular places (with ticket details), nearby treks and nearby getaways,
// suggested by Gemini and verified against OpenStreetMap (see data/explore.js).
// `?refresh=1` bypasses the 7-day cache (throttled to once per 5 min per destination).
app.get('/api/v1/destinations/:id/explore', externalApiLimiter, async (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));
  const refresh = req.query.refresh === '1';
  res.json(ok(await getDestinationExplore(destination, { refresh })));
});

app.get('/api/v1/destinations/:id/hidden-gems', (req, res) => {
  const locations = (locationsByDestination.get(req.params.id) || []).filter(
    (l) => l.type === 'hidden_gem',
  );
  res.json(ok(locations, { count: locations.length }));
});

// ==================== LOCATION SEARCH (city / state / country) ====================
// Backed by the offline `country-state-city` dataset; see
// backend/src/data/citySearch.js.

// Cascading dropdown endpoints: countries -> states (per country) -> cities
// (per country + optional state), each with an optional `q` search filter.

app.get('/api/v1/locations/countries', (req, res) => {
  const { q, limit } = req.query;
  const result = listCountries({ q, limit });
  res.json(ok(result.results, { count: result.results.length }));
});

app.get('/api/v1/locations/states', (req, res) => {
  const { country, q, limit } = req.query;
  if (!country) return res.status(400).json(fail('country query param is required', 400));
  const result = listStates({ country, q, limit });
  res.json(ok(result.results, { count: result.results.length }));
});

app.get('/api/v1/locations/cities', (req, res) => {
  const { country, state, q, limit } = req.query;
  if (!country) return res.status(400).json(fail('country query param is required', 400));
  const result = listCities({ country, state, q, limit });
  res.json(ok(result.results, { count: result.results.length, total: result.total }));
});

app.get('/api/v1/locations/autocomplete', externalApiLimiter, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json(fail('q query param is required', 400));

  const { type, country, state, locale } = req.query;
  const limit = clampInt(req.query.limit, 10, 1, 25);
  const result = await searchPlaces({ q, type, country, state, limit, locale });
  res.json(ok(result.results, { source: result.source, disclaimer: result.disclaimer }));
});

// Natural-language place search via Gemini (see backend/src/data/geminiSearch.js).
// Separate from /locations/autocomplete: this handles free-form queries like
// "quiet beach towns in Kerala" that the offline structured search can't.
app.get('/api/v1/locations/ai-search', externalApiLimiter, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json(fail('q query param is required', 400));

  const limit = clampInt(req.query.limit, 6, 1, 10);
  const result = await aiSearchPlaces({ q, limit });
  res.json(ok(result.results, { source: result.source, disclaimer: result.disclaimer }));
});

// Resolve a picked search result (city name + country) into a full
// destination with real coordinates, creating one on the fly if it's not
// already in the seed data.
//
// When the caller already knows the coordinates (e.g. a city picked from the
// offline country-state-city dataset, which carries lat/lng on every
// result), pass `lat`/`lng` to skip the external geocoding call entirely —
// it's unnecessary round-trip that can fail (network/rate-limit) for data we
// already have locally, and was the cause of "picking an India city doesn't
// work" reports.
app.get('/api/v1/locations/resolve', externalApiLimiter, async (req, res) => {
  const name = (req.query.name || '').toString().trim();
  if (!name) return res.status(400).json(fail('name query param is required', 400));

  const countryCode = (req.query.countryCode || '').toString().trim();
  const country = (req.query.country || '').toString().trim();
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
  const validLat = lat !== null && !Number.isNaN(lat) && lat >= -90 && lat <= 90;
  const validLng = lng !== null && !Number.isNaN(lng) && lng >= -180 && lng <= 180;

  if (validLat && validLng) {
    const destination = getOrCreateDestination({ name, country: country || countryCode, lat, lng });
    return res.json(ok(destination));
  }

  try {
    const geo = await geocodePlace({ name, countryCode });
    if (!geo) return res.status(404).json(fail(`Could not locate "${name}"`, 404));

    const destination = getOrCreateDestination({
      name: geo.resolvedName || name,
      country: country || geo.country || countryCode,
      lat: geo.lat,
      lng: geo.lng,
    });
    res.json(ok(destination));
  } catch (error) {
    console.error('Location resolve failed:', error.message);
    res.status(502).json(fail('Could not resolve this location right now. Please try again.', 502));
  }
});

// ==================== TRIPS ====================

// Fields a client is allowed to set/update on a trip. Anything else
// (id, userId, createdAt, …) is server-controlled to prevent mass-assignment
// clients from reassigning ownership or corrupting bookkeeping fields.
const TRIP_WRITABLE_FIELDS = ['name', 'startDate', 'endDate', 'destinationId', 'status', 'budget'];
const pickWritable = (body, fields) =>
  fields.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

app.post('/api/v1/trips', authenticate, (req, res) => {
  const id = `trip_${tripCounter++}`;
  const now = new Date().toISOString();
  const trip = {
    id,
    userId: req.userId,
    ...pickWritable(req.body, TRIP_WRITABLE_FIELDS),
    name: req.body.name || 'Untitled Trip',
    startDate: req.body.startDate || now,
    endDate: req.body.endDate || now,
    status: 'draft',
    budget: req.body.budget ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  trips.set(id, trip);
  res.status(201).json(ok(trip));
});

// A user may only list their own trips: the verified session's userId must
// match the userId they're asking for (see requireTripOwner above).
app.get('/api/v1/users/:userId/trips', authenticate, (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json(fail('You do not have access to this user\'s trips', 403));
  }
  const userTrips = Array.from(trips.values()).filter((t) => t.userId === req.params.userId);
  res.json(ok(userTrips, { count: userTrips.length }));
});

app.get('/api/v1/trips/:tripId', authenticate, requireTripOwner, (req, res) => {
  res.json(ok(req.trip));
});

app.put('/api/v1/trips/:tripId', authenticate, requireTripOwner, (req, res) => {
  Object.assign(req.trip, pickWritable(req.body, TRIP_WRITABLE_FIELDS), { updatedAt: new Date().toISOString() });
  res.json(ok(req.trip));
});

app.delete('/api/v1/trips/:tripId', authenticate, requireTripOwner, (req, res) => {
  trips.delete(req.params.tripId);
  itinerariesByTrip.delete(req.params.tripId);
  res.json(ok(null, { message: 'Trip deleted' }));
});

// ==================== ITINERARIES ====================

app.post('/api/v1/trips/:tripId/itineraries/generate', authenticate, requireTripOwner, (req, res) => {
  const trip = req.trip;
  const days = clampInt(req.body.days, 3, 1, 30);
  const perDayBudget = trip.budget ? Math.round(trip.budget / days) : 0;

  const generatedDays = Array.from({ length: days }, (_, i) => ({
    id: `day_${dayCounter++}`,
    tripId: trip.id,
    dayNumber: i + 1,
    title: `Day ${i + 1}`,
    description: `Explore the highlights of ${trip.destinationId || 'your destination'}.`,
    budgetAllocated: perDayBudget,
    activities: [
      { id: `act_${i}_1`, name: 'Breakfast at a local cafe', time: '08:00', duration: '1h', type: 'restaurant' },
      { id: `act_${i}_2`, name: 'Guided sightseeing tour', time: '10:00', duration: '3h', type: 'attraction' },
      { id: `act_${i}_3`, name: 'Dinner and evening walk', time: '19:00', duration: '2h', type: 'activity' },
    ],
    createdAt: new Date().toISOString(),
  }));

  itinerariesByTrip.set(trip.id, generatedDays);
  res.json(ok(generatedDays, { count: generatedDays.length }));
});

app.get('/api/v1/trips/:tripId/itineraries', authenticate, requireTripOwner, (req, res) => {
  const itinerary = itinerariesByTrip.get(req.params.tripId) || [];
  res.json(ok(itinerary, { count: itinerary.length }));
});

const ITINERARY_DAY_WRITABLE_FIELDS = ['title', 'description', 'budgetAllocated', 'activities'];

app.put('/api/v1/itineraries/:dayId', authenticate, (req, res) => {
  for (const [tripId, days] of itinerariesByTrip.entries()) {
    const day = days.find((d) => d.id === req.params.dayId);
    if (day) {
      const trip = trips.get(tripId);
      if (!trip || req.userId !== trip.userId) {
        return res.status(403).json(fail('You do not have access to this itinerary day', 403));
      }
      Object.assign(day, pickWritable(req.body, ITINERARY_DAY_WRITABLE_FIELDS));
      return res.json(ok(day));
    }
  }
  res.status(404).json(fail('Itinerary day not found'));
});

// ==================== ROUTES (Transportation) ====================

function mockRouteOptions(tripId, mode, date) {
  const basePrice = { flight: 250, bus: 40, train: 60, car: 90 }[mode] || 50;
  return Array.from({ length: 3 }, (_, i) => ({
    id: `route_${mode}_${i}`,
    tripId: tripId || 'unassigned',
    mode,
    departureTime: `${(8 + i * 4).toString().padStart(2, '0')}:00`,
    arrivalTime: `${(10 + i * 4).toString().padStart(2, '0')}:30`,
    price: basePrice + i * 25,
    duration: `${2 + i}h 30m`,
    details: { date, provider: `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Co. ${i + 1}` },
    createdAt: new Date().toISOString(),
  }));
}

app.get('/api/v1/routes/search', (req, res) => {
  const { tripId, mode, date } = req.query;
  res.json(ok(mockRouteOptions(tripId, mode || 'flight', date)));
});

app.get('/api/v1/routes/flights', (req, res) => res.json(ok(mockRouteOptions(null, 'flight', req.query.date))));
app.get('/api/v1/routes/buses', (req, res) => res.json(ok(mockRouteOptions(null, 'bus', req.query.date))));
app.get('/api/v1/routes/trains', (req, res) => res.json(ok(mockRouteOptions(null, 'train', req.query.date))));
app.get('/api/v1/routes/cars', (req, res) => res.json(ok(mockRouteOptions(null, 'car', req.query.date))));

// ==================== WEATHER ====================

app.get('/api/v1/weather/current/:destinationId', (req, res) => {
  res.json(ok(currentWeatherFor(req.params.destinationId)));
});

app.get('/api/v1/weather/forecast/:destinationId', (req, res) => {
  const days = clampInt(req.query.days, 7, 1, 30);
  res.json(ok(forecastFor(req.params.destinationId, days)));
});

app.post('/api/v1/weather/bulk', (req, res) => {
  const ids = Array.isArray(req.body.destinationIds) ? req.body.destinationIds : [];
  const results = ids.map((id) => ({ destinationId: id, ...currentWeatherFor(id) }));
  res.json(ok(results, { count: results.length }));
});

// Real, free, no-key weather outlook (Open-Meteo) for a specific date range,
// used by the trip planner's Weather & Vehicle tab.
app.get('/api/v1/destinations/:id/weather-outlook', async (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json(fail('startDate and endDate query params are required', 400));
  }

  try {
    const outlook = await getWeatherOutlook(
      destination.lat,
      destination.lng,
      new Date(startDate),
      new Date(endDate),
    );
    res.json(ok(outlook));
  } catch (error) {
    console.error('Weather outlook failed:', error.message);
    res.status(502).json(fail('Could not fetch live weather right now. Please try again.', 502));
  }
});

// ==================== ITINERARY SUGGESTIONS ====================

app.get('/api/v1/destinations/:id/itinerary-suggestion', (req, res) => {
  const locations = locationsByDestination.get(req.params.id);
  if (!locations) return res.status(404).json(fail('Destination not found'));

  const minDaysRequired = suggestMinDays(locations);
  const requestedDays = clampInt(req.query.days, minDaysRequired, 1, 30);
  const { plan, uncoveredCount } = buildItinerary(locations, requestedDays);

  res.json(
    ok(plan, {
      minDaysRequired,
      requestedDays,
      uncoveredCount,
      note:
        uncoveredCount > 0
          ? `${uncoveredCount} additional spot(s) didn't fit in ${requestedDays} day(s) — consider adding more days.`
          : 'All recommended spots fit within the selected days.',
    }),
  );
});

// ==================== TRANSPORT (mock) ====================

app.get('/api/v1/destinations/:id/transport', async (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const date = req.query.date || new Date().toISOString().split('T')[0];
  const distanceKm = req.query.distanceKm !== undefined ? Number(req.query.distanceKm) : undefined;
  const fx = await getDisplayFx();
  res.json(ok({ ...mockTransportOptions(destination.id, date, distanceKm, fx), currency: fx.currency }));
});

app.get('/api/v1/routes/road-conditions', (req, res) => {
  const { originId, originLat, originLng, destLat, destLng, date } = req.query;
  if (!destLat || !destLng) {
    return res.status(400).json(fail('destLat and destLng query params are required', 400));
  }

  const dateStr = date || new Date().toISOString().split('T')[0];
  const originKey = originLat && originLng ? `${originLat},${originLng}` : originId || 'origin';
  res.json(ok(mockRoadConditions(originKey, Number(destLat), Number(destLng), dateStr)));
});

// ==================== PACKING LIST ====================

app.get('/api/v1/destinations/:id/packing-list', async (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const { startDate, endDate } = req.query;
  const days = clampInt(req.query.days, 3, 1, 30);

  try {
    let weatherDays = [];
    if (startDate && endDate) {
      const outlook = await getWeatherOutlook(destination.lat, destination.lng, new Date(startDate), new Date(endDate));
      weatherDays = outlook.days;
    }
    res.json(ok(buildPackingList(weatherDays, days)));
  } catch (error) {
    console.error('Packing list weather lookup failed, using defaults:', error.message);
    res.json(ok(buildPackingList([], days)));
  }
});

// ==================== NEWS ====================

app.get('/api/v1/news', externalApiLimiter, async (req, res) => {
  const query = (req.query.q || '').toString().trim();
  if (!query) return res.status(400).json(fail('q query param is required', 400));

  const news = await getDestinationNews(query);
  res.json(ok(news));
});

// ==================== PHOTOS ====================

app.get('/api/v1/photos', externalApiLimiter, async (req, res) => {
  const query = (req.query.q || '').toString().trim().slice(0, 100);
  if (!query) return res.status(400).json(fail('q query param is required', 400));

  const limit = clampInt(req.query.limit, 8, 1, 20);
  const photos = await getDestinationPhotos(query, limit);
  res.json(ok(photos));
});

// ==================== VIDEOS (YouTube) ====================

app.get('/api/v1/videos', externalApiLimiter, async (req, res) => {
  const query = (req.query.q || '').toString().trim().slice(0, 100);
  if (!query) return res.status(400).json(fail('q query param is required', 400));

  const limit = clampInt(req.query.limit, 6, 1, 12);
  const videos = await getDestinationVideos(query, limit);
  res.json(ok(videos));
});

// ==================== INSTAGRAM (hashtag videos) ====================

// `q` is the destination name; it's turned into a hashtag (e.g. "New Delhi" → #newdelhi).
app.get('/api/v1/instagram/videos', externalApiLimiter, async (req, res) => {
  const query = (req.query.q || '').toString().trim().slice(0, 100);
  if (!query) return res.status(400).json(fail('q query param is required', 400));

  const limit = clampInt(req.query.limit, 6, 1, 12);
  const videos = await getDestinationInstagramVideos(query, limit);
  res.json(ok(videos));
});

// ==================== BUDGET ====================

app.get('/api/v1/budget-estimate', async (req, res) => {
  const destination = destinations.find((d) => d.id === req.query.destinationId);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const days = clampInt(req.query.days, 1, 1, 60);
  const travelers = clampInt(req.query.travelers, 1, 1, 20);
  const vehicleType = req.query.vehicleType;
  const distanceKm = req.query.distanceKm ? Number(req.query.distanceKm) : undefined;

  const estimate = buildBudgetEstimate({
    country: destination.country,
    days,
    travelers,
    vehicleType,
    distanceKm,
    fx: await getDisplayFx(),
  });

  res.json(ok(estimate));
});

// ==================== HEALTH ====================

app.get('/api/v1/health', (req, res) => {
  res.json(ok({ status: 'ok', destinations: destinations.length, uptimeSeconds: process.uptime() }));
});

app.use((req, res) => {
  res.status(404).json(fail(`Not found: ${req.method} ${req.path}`));
});

// Centralized error handler: never leak stack traces or raw error internals
// to the client, regardless of NODE_ENV.
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json(fail('Origin not allowed', 403));
  }
  console.error('Unhandled error:', err.stack || err.message);
  res.status(err.status || 500).json(fail('Internal server error', err.status || 500));
});

app.listen(PORT, () => {
  console.log(`guide-me-api listening on http://localhost:${PORT}/api/v1`);
});
