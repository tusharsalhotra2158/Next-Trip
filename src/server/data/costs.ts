// Approximate, illustrative cost data for trip-budget estimates.
// These are rough planning figures (USD), NOT live prices — always labeled
// as "approximate" / "estimated" wherever surfaced to the user.

// Per-person daily budget covering accommodation + food + local activities + misc,
// mid-range travel style, in USD.
const DAILY_BUDGET_USD_BY_COUNTRY: Record<string, number> = {
  India: 40,
  France: 130,
  'United Kingdom': 140,
  Italy: 110,
  Japan: 120,
  Thailand: 45,
  Singapore: 110,
  'United Arab Emirates': 130,
  'United States': 150,
  Australia: 130,
  Spain: 100,
  Netherlands: 120,
  Indonesia: 40,
};
const DEFAULT_DAILY_BUDGET_USD = 90;

// Approximate fuel price per liter, in USD.
const FUEL_PRICE_USD_PER_LITER_BY_COUNTRY: Record<string, number> = {
  India: 1.05,
  France: 1.75,
  'United Kingdom': 1.65,
  Italy: 1.8,
  Japan: 1.3,
  Thailand: 0.95,
  Singapore: 1.9,
  'United Arab Emirates': 0.7,
  'United States': 0.95,
  Australia: 1.1,
  Spain: 1.55,
  Netherlands: 2.0,
  Indonesia: 0.7,
};
const DEFAULT_FUEL_PRICE_USD_PER_LITER = 1.2;

// Approximate fuel economy, km per liter.
const MILEAGE_KM_PER_LITER: Record<string, number> = {
  car: 14,
  bike: 35,
};

// Approximate per-km fare for public transport modes when no fuel cost applies.
const FARE_USD_PER_KM: Record<string, number> = {
  bus: 0.03,
  train: 0.05,
  flight: 0.12,
};

// Own-property lookups, so a query value like "constructor" can't pick up an
// Object.prototype member (plain `obj[key]` would in JS too).
const lookup = (table: Record<string, number>, key: string | undefined) =>
  key !== undefined && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

export function getDailyBudgetUsd(country: string): number {
  return lookup(DAILY_BUDGET_USD_BY_COUNTRY, country) ?? DEFAULT_DAILY_BUDGET_USD;
}

export function getFuelPriceUsdPerLiter(country: string): number {
  return lookup(FUEL_PRICE_USD_PER_LITER_BY_COUNTRY, country) ?? DEFAULT_FUEL_PRICE_USD_PER_LITER;
}

export function getMileageKmPerLiter(vehicleType: string | undefined): number | null {
  return lookup(MILEAGE_KM_PER_LITER, vehicleType) ?? null;
}

export function getFareUsdPerKm(vehicleType: string | undefined): number | null {
  return lookup(FARE_USD_PER_KM, vehicleType) ?? null;
}
