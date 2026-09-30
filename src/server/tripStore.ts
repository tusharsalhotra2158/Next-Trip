/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// In-memory stores for user-created trips and itineraries, plus the
// `requireTripOwner` check.
//
// Kept in the process-wide store (see ./store.ts): shared by every route
// module and survives dev hot reloads, but resets on server restart — and on
// every serverless cold start (Netlify). No database is in scope.

import { fail, json } from './http';
import { persistent } from './store';

export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  destinationId?: string;
  status: string;
  budget: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ItineraryDayRecord {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string;
  budgetAllocated: number;
  activities: unknown[];
  createdAt: string;
  [key: string]: unknown;
}

export const trips = persistent('trips.byId', () => new Map<string, Trip>());
export const itinerariesByTrip = persistent('trips.itineraries', () => new Map<string, ItineraryDayRecord[]>());
export const counters = persistent('trips.counters', () => ({ tripCounter: 1, dayCounter: 1 }));

// Fields a client is allowed to set/update on a trip. Anything else
// (id, userId, createdAt, …) is server-controlled to prevent mass-assignment
// clients from reassigning ownership or corrupting bookkeeping fields.
export const TRIP_WRITABLE_FIELDS = ['name', 'startDate', 'endDate', 'destinationId', 'status', 'budget'];
export const ITINERARY_DAY_WRITABLE_FIELDS = ['title', 'description', 'budgetAllocated', 'activities'];

export const pickWritable = (body: any, fields: string[]) =>
  fields.reduce<Record<string, unknown>>((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

// Trip/itinerary endpoints require a verified session (see `authenticate` in
// ./data/auth.ts, which derives userId from a signed JWT — never from a
// client-supplied header) and require that userId to match the trip's
// owner, so one user can't read/modify/delete another user's trip just by
// guessing its sequential id. Returns the trip, or an error Response.
export function requireTripOwner(userId: string, tripId: string): Trip | Response {
  const trip = trips.get(tripId);
  if (!trip) return json(fail('Trip not found'), 404);

  if (userId !== trip.userId) {
    return json(fail('You do not have access to this trip', 403), 403);
  }

  return trip;
}
