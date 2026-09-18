require('./load-env');
const express = require('express');
const cors = require('cors');
const { destinations, locationsByDestination, getOrCreateDestination } = require('./data/destinations');
const { searchPlaces, listCountries, listStates, listCities, geocodePlace } = require('./data/citySearch');
const { aiSearchPlaces } = require('./data/geminiSearch');
const { currentWeatherFor, forecastFor } = require('./data/weather');
const { getWeatherOutlook } = require('./data/openMeteo');
const { suggestMinDays, buildItinerary } = require('./data/itinerary');
const { mockTransportOptions, mockRoadConditions } = require('./data/transport');
const { buildPackingList } = require('./data/packing');
const { getDestinationNews } = require('./data/news');
const { buildBudgetEstimate } = require('./data/budget');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory stores for user-created data (reset on server restart).
const trips = new Map();
const itinerariesByTrip = new Map();
let tripCounter = 1;
let dayCounter = 1;

const ok = (data, extra = {}) => ({ success: true, data, ...extra });
const fail = (message, code = 404) => ({ success: false, error: message, message });

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

app.get('/api/v1/locations/autocomplete', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json(fail('q query param is required', 400));

  const { type, country, state, limit, locale } = req.query;
  const result = await searchPlaces({ q, type, country, state, limit, locale });
  res.json(ok(result.results, { source: result.source, disclaimer: result.disclaimer }));
});

// Natural-language place search via Gemini (see backend/src/data/geminiSearch.js).
// Separate from /locations/autocomplete: this handles free-form queries like
// "quiet beach towns in Kerala" that the offline structured search can't.
app.get('/api/v1/locations/ai-search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json(fail('q query param is required', 400));

  const { limit } = req.query;
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
app.get('/api/v1/locations/resolve', async (req, res) => {
  const name = (req.query.name || '').toString().trim();
  if (!name) return res.status(400).json(fail('name query param is required', 400));

  const countryCode = (req.query.countryCode || '').toString().trim();
  const country = (req.query.country || '').toString().trim();
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;

  if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
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

app.post('/api/v1/trips', (req, res) => {
  const id = `trip_${tripCounter++}`;
  const now = new Date().toISOString();
  const trip = {
    id,
    userId: req.body.userId || 'anonymous',
    name: req.body.name || 'Untitled Trip',
    startDate: req.body.startDate || now,
    endDate: req.body.endDate || now,
    destinationId: req.body.destinationId,
    status: 'draft',
    budget: req.body.budget ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  trips.set(id, trip);
  res.status(201).json(ok(trip));
});

app.get('/api/v1/users/:userId/trips', (req, res) => {
  const userTrips = Array.from(trips.values()).filter((t) => t.userId === req.params.userId);
  res.json(ok(userTrips, { count: userTrips.length }));
});

app.get('/api/v1/trips/:tripId', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) return res.status(404).json(fail('Trip not found'));
  res.json(ok(trip));
});

app.put('/api/v1/trips/:tripId', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) return res.status(404).json(fail('Trip not found'));
  Object.assign(trip, req.body, { updatedAt: new Date().toISOString() });
  res.json(ok(trip));
});

app.delete('/api/v1/trips/:tripId', (req, res) => {
  const existed = trips.delete(req.params.tripId);
  itinerariesByTrip.delete(req.params.tripId);
  if (!existed) return res.status(404).json(fail('Trip not found'));
  res.json(ok(null, { message: 'Trip deleted' }));
});

// ==================== ITINERARIES ====================

app.post('/api/v1/trips/:tripId/itineraries/generate', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) return res.status(404).json(fail('Trip not found'));

  const days = Number(req.body.days) || 3;
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

app.get('/api/v1/trips/:tripId/itineraries', (req, res) => {
  const itinerary = itinerariesByTrip.get(req.params.tripId) || [];
  res.json(ok(itinerary, { count: itinerary.length }));
});

app.put('/api/v1/itineraries/:dayId', (req, res) => {
  for (const days of itinerariesByTrip.values()) {
    const day = days.find((d) => d.id === req.params.dayId);
    if (day) {
      Object.assign(day, req.body);
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
  const days = Number(req.query.days) || 7;
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
  const requestedDays = Math.max(1, Number(req.query.days) || minDaysRequired);
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

app.get('/api/v1/destinations/:id/transport', (req, res) => {
  const destination = destinations.find((d) => d.id === req.params.id);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const date = req.query.date || new Date().toISOString().split('T')[0];
  const distanceKm = req.query.distanceKm !== undefined ? Number(req.query.distanceKm) : undefined;
  res.json(ok(mockTransportOptions(destination.id, date, distanceKm)));
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
  const days = Number(req.query.days) || 3;

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

app.get('/api/v1/news', async (req, res) => {
  const query = (req.query.q || '').toString().trim();
  if (!query) return res.status(400).json(fail('q query param is required', 400));

  const news = await getDestinationNews(query);
  res.json(ok(news));
});

// ==================== BUDGET ====================

app.get('/api/v1/budget-estimate', (req, res) => {
  const destination = destinations.find((d) => d.id === req.query.destinationId);
  if (!destination) return res.status(404).json(fail('Destination not found'));

  const days = Math.max(1, Number(req.query.days) || 1);
  const travelers = Math.max(1, Number(req.query.travelers) || 1);
  const vehicleType = req.query.vehicleType;
  const distanceKm = req.query.distanceKm ? Number(req.query.distanceKm) : undefined;

  const estimate = buildBudgetEstimate({
    country: destination.country,
    days,
    travelers,
    vehicleType,
    distanceKm,
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

app.listen(PORT, () => {
  console.log(`guide-me-api listening on http://localhost:${PORT}/api/v1`);
});
