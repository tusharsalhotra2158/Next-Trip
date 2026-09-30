// Process-wide in-memory state for the Travel API (users, trips,
// itineraries, caches, rate-limit counters, …).
//
// Everything is attached to `globalThis` so that:
//   - it survives `next dev` hot reloads (module re-evaluation would
//     otherwise wipe every Map), and
//   - every Route Handler module in the process sees the same instance, even
//     if the bundler gives each route its own copy of this file.
//
// NOTE: this is still just process memory, like the original Express backend
// ("reset on server restart"). On serverless hosting (Netlify Functions) it
// resets on every cold start and is NOT shared between concurrent function
// instances. There is no database in scope for this port.

const ROOT_KEY = '__nextTripServerStore__';

type StoreRoot = Map<string, unknown>;

function root(): StoreRoot {
  const g = globalThis as typeof globalThis & { [ROOT_KEY]?: StoreRoot };
  if (!g[ROOT_KEY]) g[ROOT_KEY] = new Map();
  return g[ROOT_KEY];
}

/** Returns the process-wide value for `key`, creating it with `init()` on first use. */
export function persistent<T>(key: string, init: () => T): T {
  const store = root();
  if (!store.has(key)) store.set(key, init());
  return store.get(key) as T;
}
