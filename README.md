# Next Trip

Next Trip is a travel planning web app that helps you find a destination, understand what to expect once you're there, and put together a day-by-day itinerary — all in one place instead of juggling a search engine, a weather site, and a spreadsheet.

Built with Next.js 16 (App Router, React 19, Tailwind CSS 4). The UI and the Travel API run in one app: the API is a set of Next.js Route Handlers under `/api/v1`.

## What it does

- **Destination search** — search cities, states and countries by name, backed by an offline geo dataset. If nothing matches, an "Ask AI" fallback runs a natural-language search ("quiet beach towns in Kerala") via Gemini.
- **Interactive maps** — view destinations, attractions, restaurants, and hidden gems on a Leaflet-powered map.
- **Itinerary planning** — auto-generate a day-by-day plan that fits the recommended sights into the number of days you have, and edit each day afterward.
- **Weather outlook** — real weather forecasts (via Open-Meteo) for your specific travel dates, used to plan activities and packing.
- **Packing list** — a suggested packing list generated from the weather outlook for your trip.
- **Budget estimator** — a cost estimate based on destination, trip length, number of travelers, and transport choice.
- **Transport & routes** — compare flight, bus, train, and car options, plus road-condition info for driving trips.
- **Local news** — recent news for your destination, so you're not caught off guard by anything happening on the ground.
- **Trip management** — create, update, and delete trips tied to a user account, with basic login/signup and route guarding.

## Why it's useful

- **One workflow instead of five tabs.** Search, weather, budget, packing, and itinerary all live in a single flow, so planning a trip doesn't mean copy-pasting information between different sites.
- **Itinerary logic does the busy work.** Instead of guessing how many days a destination needs, the itinerary suggestion engine tells you the minimum days required and flags anything that won't fit.
- **Weather-aware packing.** The packing list isn't generic — it's built from the actual forecast for your travel dates.
- **Graceful degradation.** Optional third-party integrations (news, AI search, global city data) each have a sensible fallback, so the app stays usable even without API keys configured.
- **Fast to run locally.** No database setup required — the API keeps user, trip and itinerary data in memory, which is enough for prototyping, demos, or personal use.

## Project structure

```
Next-Trip/
├── src/
│   ├── app/
│   │   ├── travel/search/   # Main page: destination search, map, trip planner
│   │   ├── login/ signup/ dashboard/
│   │   └── api/v1/          # Travel API (Route Handlers)
│   ├── components/          # Header, footer, hero banner, auth guard
│   │   └── travel/          # Map (Leaflet), search box, trip planner, page sections
│   ├── lib/                 # Browser API client, shared types, auth context
│   └── server/              # Server-only API logic: data sources, auth, rate limiting
└── agents/API_DOCUMENTATION.md
```

## Getting started

### Prerequisites

- Node.js 20.9 or later, and npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables (optional)

The app works out of the box with sample data. To enable live integrations, copy `.env.example` to `.env.local` and fill in the keys you want. `.env.example` explains each variable; the main ones are:

| Variable | Enables | Fallback without it |
|---|---|---|
| `JWT_SECRET` | Stable login sessions | Random secret per process; sessions end on restart |
| `GNEWS_API_KEY` | Live destination news | Generic sample travel tips |
| `GEMINI_API_KEY` | AI place search and the Explore section | No results, with a disclaimer |
| `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` | Destination photos | Photo gallery hidden |
| `YOUTUBE_API_KEY` | Destination videos | Videos section hidden |

All of these are server-only and never reach the browser.

### 3. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000/`. The API is served from the same origin at `http://localhost:3000/api/v1` (health check: `/api/v1/health`).

## Building for production

```bash
npm run build
npm start
```

## Linting

```bash
npm run lint
```

## Deploying to Netlify

`netlify.toml` sets the build command and publish directory, and Netlify applies its Next.js adapter automatically. In the site's environment settings, add the variables from `.env.example`, including `JWT_SECRET` (required there: each serverless instance would otherwise sign sessions with a different secret).

In-memory data (users, trips, caches, rate-limit counters) is per serverless instance and resets on cold starts, so add a database before relying on accounts or trips in production.
