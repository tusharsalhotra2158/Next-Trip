// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { getOrCreateDestination } from '@/server/data/destinations';
import { geocodePlace } from '@/server/data/citySearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resolve a picked search result (city name + country) into a full
// destination with real coordinates, creating one on the fly if it's not
// already in the seed data.
//
// When the caller already knows the coordinates (e.g. a city picked from the
// offline country-state-city dataset, which carries lat/lng on every
// result), pass `lat`/`lng` to skip the external geocoding call entirely —
// it's unnecessary round-trip that can fail (network/rate-limit) for data we
// already have locally.
export const GET = handle(
  async (req) => {
    const query = queryOf(req);
    const name = (query('name') || '').toString().trim();
    if (!name) return json(fail('name query param is required', 400), 400);

    const countryCode = (query('countryCode') || '').toString().trim();
    const country = (query('country') || '').toString().trim();
    const rawLat = query('lat');
    const rawLng = query('lng');
    const lat = rawLat !== undefined ? Number(rawLat) : null;
    const lng = rawLng !== undefined ? Number(rawLng) : null;
    const validLat = lat !== null && !Number.isNaN(lat) && lat >= -90 && lat <= 90;
    const validLng = lng !== null && !Number.isNaN(lng) && lng >= -180 && lng <= 180;

    if (validLat && validLng) {
      const destination = getOrCreateDestination({ name, country: country || countryCode, lat: lat!, lng: lng! });
      return json(ok(destination));
    }

    try {
      const geo = await geocodePlace({ name, countryCode });
      if (!geo) return json(fail(`Could not locate "${name}"`, 404), 404);

      const destination = getOrCreateDestination({
        name: geo.resolvedName || name,
        country: country || geo.country || countryCode,
        lat: geo.lat,
        lng: geo.lng,
      });
      return json(ok(destination));
    } catch (error) {
      console.error('Location resolve failed:', (error as Error).message);
      return json(fail('Could not resolve this location right now. Please try again.', 502), 502);
    }
  },
  { limiters: [externalApiLimiter] },
);
