/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Country / state / city search backed by the offline `country-state-city`
// npm package (https://www.npmjs.com/package/country-state-city).
//
// Why offline instead of an external API: the previous implementation called
// countrystatecity.in's hosted API, but its `/search/autocomplete` endpoint
// requires a paid "professional" plan (a free-tier key gets HTTP 403), so
// every search silently fell back to a 5-city sample list. This package
// bundles the same country/state/city dataset as static JSON, so search
// works fully offline, with no key, no rate limits, and no paid tier.
//
// City records from the package already include lat/lng, so no extra
// geocoding call is needed for cities. `geocodePlace` (Open-Meteo) is kept
// only as a fallback for resolving a free-text place name that isn't an
// exact city match.

import { Country, State, City } from 'country-state-city';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

type LimitParam = string | number | undefined;

function norm(s: unknown) {
  return (s || '').toString().trim().toLowerCase();
}

function matches(name: string, q: string) {
  return !q || norm(name).includes(q);
}

/**
 * List/search countries.
 */
export function listCountries({ q, limit }: { q?: string; limit?: LimitParam } = {}) {
  const query = norm(q);
  const all = Country.getAllCountries();
  const filtered = query ? all.filter((c) => matches(c.name, query) || matches(c.isoCode, query)) : all;
  const results = filtered.slice(0, limit ? Number(limit) : filtered.length).map((c) => ({
    type: 'country',
    id: c.isoCode,
    name: c.name,
    label: c.name,
    isoCode: c.isoCode,
    iso2: c.isoCode,
    flag: c.flag,
    phonecode: c.phonecode,
    currency: c.currency,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
  return { source: 'country-state-city', disclaimer: null, results };
}

/**
 * List/search states within a country.
 */
export function listStates({ country, q, limit }: { country?: string; q?: string; limit?: LimitParam }) {
  if (!country) return { source: 'country-state-city', disclaimer: null, results: [] };
  const query = norm(q);
  const all = State.getStatesOfCountry(country) || [];
  const filtered = query ? all.filter((s) => matches(s.name, query) || matches(s.isoCode, query)) : all;
  const results = filtered.slice(0, limit ? Number(limit) : filtered.length).map((s) => ({
    type: 'state',
    id: `${s.countryCode}_${s.isoCode}`,
    name: s.name,
    label: s.name,
    isoCode: s.isoCode,
    state_code: s.isoCode,
    countryCode: s.countryCode,
    country_code: s.countryCode,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
  return { source: 'country-state-city', disclaimer: null, results };
}

/**
 * List/search cities within a country (optionally scoped to a state).
 */
export function listCities({ country, state, q, limit }: { country?: string; state?: string; q?: string; limit?: LimitParam }) {
  if (!country) return { source: 'country-state-city', disclaimer: null, results: [] };
  const query = norm(q);
  const all = state ? City.getCitiesOfState(country, state) : City.getCitiesOfCountry(country) || [];
  const filtered = (all || []).filter((c) => matches(c.name, query));
  const cap = limit ? Number(limit) : 50; // cities lists can be large (India alone has 4000+)

  const countryName = Country.getCountryByCode(country)?.name || country;
  const stateNameCache = new Map<string, string>();
  const stateName = (code: string) => {
    if (!code) return null;
    if (!stateNameCache.has(code)) {
      stateNameCache.set(code, State.getStateByCodeAndCountry(code, country)?.name || code);
    }
    return stateNameCache.get(code);
  };

  const results = filtered.slice(0, cap).map((c) => ({
    type: 'city',
    id: `${c.countryCode}_${c.stateCode}_${c.name}`,
    name: c.name,
    countryCode: c.countryCode,
    country_code: c.countryCode,
    stateCode: c.stateCode,
    state_code: c.stateCode,
    latitude: c.latitude ? Number(c.latitude) : null,
    longitude: c.longitude ? Number(c.longitude) : null,
    label: [c.name, stateName(c.stateCode), countryName].filter(Boolean).join(', '),
  }));
  return { source: 'country-state-city', disclaimer: null, results, total: filtered.length };
}

/**
 * Combined free-text search across countries, states, and cities, matching
 * the shape the previous CountryStateCity-API-backed `/locations/autocomplete`
 * endpoint returned, so existing callers (e.g. the search autocomplete) keep
 * working unchanged.
 *
 * @param params.q - search text
 * @param params.type - 'city' | 'state' | 'country'
 * @param params.country - ISO2 country code filter
 * @param params.state - state code filter
 */
export async function searchPlaces({
  q,
  type,
  country,
  state,
  limit,
}: {
  q: string;
  type?: string;
  country?: string;
  state?: string;
  limit?: LimitParam;
  locale?: string;
}): Promise<{ source: string; disclaimer: string | null; results: any[] }> {
  const cap = limit ? Number(limit) : 15;
  const query = norm(q);

  if (type === 'country') return { ...listCountries({ q, limit: cap }) };
  if (type === 'state') return { ...listStates({ country, q, limit: cap }) };
  if (type === 'city') return { ...listCities({ country, state, q, limit: cap }) };

  // No explicit type: search cities first (most common use case for this
  // app's destination search), falling back to countries if nothing matches
  // and no country/state scope was given.
  if (country) {
    const cities = listCities({ country, state, q, limit: cap });
    if (cities.results.length) return cities;
  }

  const countries = listCountries({ q, limit: cap });
  if (countries.results.length) return countries;

  // Broad fallback: scan cities across all countries (bounded, since this
  // can be expensive without a country filter).
  const results: any[] = [];
  for (const c of Country.getAllCountries()) {
    if (results.length >= cap) break;
    const cities = City.getCitiesOfCountry(c.isoCode) || [];
    for (const city of cities) {
      if (matches(city.name, query)) {
        results.push({
          type: 'city',
          id: `${city.countryCode}_${city.stateCode}_${city.name}`,
          name: city.name,
          countryCode: city.countryCode,
          country_code: city.countryCode,
          stateCode: city.stateCode,
          state_code: city.stateCode,
          latitude: city.latitude ? Number(city.latitude) : null,
          longitude: city.longitude ? Number(city.longitude) : null,
          label: `${city.name}, ${c.name}`,
        });
        if (results.length >= cap) break;
      }
    }
  }
  return { source: 'country-state-city', disclaimer: null, results };
}

/**
 * Resolve a place name to coordinates via Open-Meteo's free geocoding API.
 * Used as a fallback when a picked city has no lat/lng on record (rare, since
 * the offline dataset already includes coordinates for most cities).
 */
export async function geocodePlace({ name, countryCode }: { name: string; countryCode?: string }) {
  const params = new URLSearchParams({ name: name || '', count: '5', language: 'en', format: 'json' });
  const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Open-Meteo geocoding failed: ${response.status}`);

  const data = await response.json();
  const candidates: any[] = data.results || [];
  if (candidates.length === 0) return null;

  const match =
    (countryCode && candidates.find((c) => c.country_code?.toUpperCase() === countryCode.toUpperCase())) ||
    candidates[0];

  return {
    lat: match.latitude as number,
    lng: match.longitude as number,
    resolvedName: match.name as string | undefined,
    country: match.country as string | undefined,
    countryCode: match.country_code as string | undefined,
    admin1: match.admin1 as string | undefined,
  };
}
