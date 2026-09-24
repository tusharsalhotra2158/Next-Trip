# Next Trip

Next Trip is a travel planning web app that helps you find a destination, understand what to expect once you're there, and put together a day-by-day itinerary — all in one place instead of juggling a search engine, a weather site, and a spreadsheet.

Built with Angular 21 on the frontend and a lightweight Express API on the backend.

## What it does

- **Destination search** — search by name, or browse cascading country → state → city dropdowns backed by an offline geo dataset. A natural-language search mode ("quiet beach towns in Kerala") is also available via Gemini.
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
- **Fast to run locally.** No database setup required — the backend keeps trip and itinerary data in memory, which is enough for prototyping, demos, or personal use.

## Project structure

```
Next-Trip/
├── src/app/
│   ├── components/        # Login, signup, dashboard, header
│   ├── features/travel/   # Destination search, map, trip planner
│   ├── services/          # Auth and API services
│   ├── guards/             # Route guards (auth)
│   └── shared/maps/        # Map utilities, models, and directives
└── backend/
    └── src/
        ├── server.js       # Express API entry point
        └── data/           # Destinations, weather, budget, itinerary, etc.
```

## Getting started

### Prerequisites

- Node.js and npm
- Angular CLI (`npm install -g @angular/cli`), or use `npx ng`

### 1. Install dependencies

```bash
npm install          # frontend, from the project root
cd backend && npm install   # backend
```

### 2. Configure the backend (optional)

The app works out of the box with sample data. To enable live integrations, copy `backend/.env.example` to `backend/.env` and fill in the keys you want:

| Variable | Enables | Fallback without it |
|---|---|---|
| `GNEWS_API_KEY` | Live destination news | Generic sample travel tips |
| `CSC_API_KEY` | Global city/state/country search | Small sample city list |
| `GEMINI_API_KEY` | Natural-language place search | No results, with a disclaimer |

### 3. Run the backend

```bash
cd backend
npm start            # or `npm run dev` for auto-restart on changes
```

The API listens on `http://localhost:4000/api/v1` by default (configurable via `PORT` in `.env`).

### 4. Run the frontend

```bash
ng serve
```

Open `http://localhost:4200/` in your browser. The app reloads automatically as you edit source files.

## Building for production

```bash
ng build
```

Build artifacts are output to the `dist/` directory.

## Running tests

```bash
ng test
```

Unit tests run via [Vitest](https://vitest.dev/).

## Additional resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
