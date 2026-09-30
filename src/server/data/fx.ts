// Currency conversion for money shown to the user. Cost baselines in
// costs.ts / transport.ts are authored in USD; this converts them to the
// display currency (INR) at a live rate from Frankfurter (free, no key,
// ECB reference rates — https://frankfurter.dev), cached for 12h. If the
// rate can't be fetched, falls back to USD_TO_INR_RATE from .env, or to
// DEFAULT_USD_TO_INR (approximate rate as of Sep 2026).

import { persistent } from '../store';

export interface DisplayFx {
  currency: string;
  usdRate: number;
  rateDate: string | null;
  rateSource: 'frankfurter' | 'fallback';
}

const DISPLAY_CURRENCY = 'INR';
const DEFAULT_USD_TO_INR = 95;
const FALLBACK_RATE = Number(process.env.USD_TO_INR_RATE) > 0 ? Number(process.env.USD_TO_INR_RATE) : DEFAULT_USD_TO_INR;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const state = persistent('fx.state', () => ({ cached: null as { at: number; fx: DisplayFx } | null }));

export async function getDisplayFx(): Promise<DisplayFx> {
  const cached = state.cached;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.fx;

  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${DISPLAY_CURRENCY}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Frankfurter request failed: ${response.status}`);

    const data = await response.json();
    const rate = Number(data.rates?.[DISPLAY_CURRENCY]);
    if (!(rate > 0)) throw new Error('Frankfurter returned no rate');

    const fx: DisplayFx = { currency: DISPLAY_CURRENCY, usdRate: rate, rateDate: data.date || null, rateSource: 'frankfurter' };
    state.cached = { at: Date.now(), fx };
    return fx;
  } catch (error) {
    console.error('FX rate fetch failed, using fallback rate:', (error as Error).message);
    // Not cached, so the next request retries the live rate.
    return { currency: DISPLAY_CURRENCY, usdRate: FALLBACK_RATE, rateDate: null, rateSource: 'fallback' };
  }
}

const otherRates = persistent('fx.otherRates', () => new Map<string, { at: number; rate: number }>()); // currency code → { at, rate }

/**
 * Units of the display currency (INR) per 1 unit of `currency`, e.g. for
 * converting a museum's "12 EUR" ticket price. Returns null if the rate
 * can't be fetched — callers should then show the original amount as-is
 * rather than guess (unlike USD, there's no configured fallback).
 */
export async function getRateToDisplay(currency: string | null | undefined): Promise<number | null> {
  const code = (currency || '').toUpperCase();
  if (code === DISPLAY_CURRENCY) return 1;
  if (!/^[A-Z]{3}$/.test(code)) return null;
  if (code === 'USD') return (await getDisplayFx()).usdRate;

  const cachedRate = otherRates.get(code);
  if (cachedRate && Date.now() - cachedRate.at < CACHE_TTL_MS) return cachedRate.rate;

  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${code}&to=${DISPLAY_CURRENCY}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Frankfurter request failed: ${response.status}`);
    const rate = Number((await response.json()).rates?.[DISPLAY_CURRENCY]);
    if (!(rate > 0)) throw new Error(`Frankfurter returned no ${code} rate`);
    otherRates.set(code, { at: Date.now(), rate });
    return rate;
  } catch (error) {
    console.error(`FX rate fetch for ${code} failed:`, (error as Error).message);
    return null;
  }
}

// Whole rupees — paise precision is meaningless for rough estimates.
export const convertUsd = (usd: number, fx: DisplayFx) => Math.round(usd * fx.usdRate);
