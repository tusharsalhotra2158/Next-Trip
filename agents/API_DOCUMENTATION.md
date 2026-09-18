# Travel App Backend API Documentation

## Base URL
```
http://localhost:4000/api/v1
```

## Authentication
Current implementation uses mock authentication. Add `Authorization: Bearer <token>` header for protected routes.

---

## ENDPOINTS

### 🌍 DESTINATIONS

#### Search Destinations
```
GET /destinations/search?q={query}
```
- **Query Parameters:** `q` (search query)
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dest_paris",
      "name": "Paris",
      "country": "France",
      "lat": 48.8566,
      "lng": 2.3522,
      "description": "...",
      "googlePlaceId": "..."
    }
  ],
  "count": 1
}
```

#### Get Popular Destinations
```
GET /destinations/popular
```
- **Response:** Array of 5 most popular destinations

#### Get Destination Details
```
GET /destinations/{id}
```
- **Path Parameters:** `id` (destination ID)
- **Response:** Single destination object with location count

#### Get Destination Locations
```
GET /destinations/{id}/locations?type={type}
```
- **Path Parameters:** `id` (destination ID)
- **Query Parameters:** `type` (optional: `restaurant`, `tourist_site`, `attraction`, `hidden_gem`)
- **Response:** Array of locations

#### Get Restaurants
```
GET /destinations/{id}/restaurants
```
- **Path Parameters:** `id` (destination ID)
- **Response:** Array of restaurant locations

#### Get Attractions
```
GET /destinations/{id}/attractions
```
- **Path Parameters:** `id` (destination ID)
- **Response:** Array of tourist sites and attractions

#### Get Hidden Gems
```
GET /destinations/{id}/hidden-gems
```
- **Path Parameters:** `id` (destination ID)
- **Response:** Array of hidden gem locations

---

### 🛫 TRIPS

#### Create Trip
```
POST /trips
```
- **Body:**
```json
{
  "userId": "user_123",
  "name": "Paris Adventure",
  "startDate": "2024-02-15",
  "endDate": "2024-02-20",
  "destinationId": "dest_paris",
  "budget": 2000
}
```
- **Response:** Created trip object

#### Get User Trips
```
GET /users/{userId}/trips
```
- **Path Parameters:** `userId` (user ID)
- **Response:** Array of trips for user

#### Get Trip Details
```
GET /trips/{tripId}
```
- **Path Parameters:** `tripId` (trip ID)
- **Response:** Trip object with itineraries and routes

#### Update Trip
```
PUT /trips/{tripId}
```
- **Path Parameters:** `tripId` (trip ID)
- **Body:** Any trip fields to update
- **Response:** Updated trip object

#### Delete Trip
```
DELETE /trips/{tripId}
```
- **Path Parameters:** `tripId` (trip ID)
- **Response:** Success message

---

### 📅 ITINERARIES

#### Generate Itinerary
```
POST /trips/{tripId}/itineraries/generate
```
- **Path Parameters:** `tripId` (trip ID)
- **Body:**
```json
{
  "tripId": "trip_123",
  "days": 5,
  "interests": ["museums", "restaurants", "shopping"]
}
```
- **Response:** Array of daily itinerary objects

#### Get Trip Itinerary
```
GET /trips/{tripId}/itineraries
```
- **Path Parameters:** `tripId` (trip ID)
- **Response:** Array of itinerary days (sorted by day number)

#### Update Itinerary Day
```
PUT /itineraries/{dayId}
```
- **Path Parameters:** `dayId` (itinerary day ID)
- **Body:**
```json
{
  "activities": [
    {
      "id": "act_123",
      "name": "Eiffel Tower Visit",
      "time": "10:00 AM",
      "duration": "2h",
      "cost": 15
    }
  ],
  "budgetAllocated": 200
}
```
- **Response:** Updated itinerary day object

---

### 🚂 ROUTES (Transportation)

#### Search Routes
```
GET /routes/search?tripId={tripId}&mode={mode}&date={date}
```
- **Query Parameters:**
  - `tripId` (required): Trip ID
  - `mode` (required): `flight`, `bus`, `train`, or `car`
  - `date` (required): Date in format YYYY-MM-DD
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "route_123",
      "tripId": "trip_123",
      "mode": "flight",
      "departureTime": "08:00",
      "arrivalTime": "11:30",
      "price": 250,
      "duration": "2h 30m",
      "details": {
        "airline": "Airline A",
        "stops": 0,
        "class": "Economy"
      }
    }
  ],
  "summary": {
    "mode": "flight",
    "cheapest": 180,
    "fastest": 150
  }
}
```

#### Get Flight Options
```
GET /routes/flights?date={date}
```
- **Query Parameters:** `date` (required: YYYY-MM-DD)
- **Response:** Array of flight options

#### Get Bus Options
```
GET /routes/buses?date={date}
```
- **Query Parameters:** `date` (required: YYYY-MM-DD)
- **Response:** Array of bus options

#### Get Train Options
```
GET /routes/trains?date={date}
```
- **Query Parameters:** `date` (required: YYYY-MM-DD)
- **Response:** Array of train options

#### Get Car Options
```
GET /routes/cars?date={date}
```
- **Query Parameters:** `date` (required: YYYY-MM-DD)
- **Response:** Array of car rental options with toll estimates

---

### 🌤️ WEATHER

#### Get Current Weather
```
GET /weather/current/{destinationId}
```
- **Path Parameters:** `destinationId` (destination ID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "temp": 18,
    "condition": "Partly Cloudy",
    "humidity": 65,
    "windSpeed": 12,
    "icon": "⛅"
  }
}
```

#### Get Weather Forecast
```
GET /weather/forecast/{destinationId}?days={days}
```
- **Path Parameters:** `destinationId` (destination ID)
- **Query Parameters:** `days` (optional, default: 7)
- **Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "temp": 18,
      "condition": "Partly Cloudy",
      "humidity": 65,
      "windSpeed": 12,
      "icon": "⛅"
    },
    "forecast": [
      {
        "date": "2024-01-15",
        "tempMax": 20,
        "tempMin": 15,
        "condition": "Partly Cloudy",
        "icon": "⛅"
      }
    ]
  }
}
```

#### Get Bulk Weather
```
POST /weather/bulk
```
- **Body:**
```json
{
  "destinationIds": ["dest_paris", "dest_tokyo"]
}
```
- **Response:** Array of destination weather data

---

### 🏥 HEALTH CHECK

#### Health Status
```
GET /health
```
- **Response:**
```json
{
  "success": true,
  "message": "Travel API is running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Data Models

### Destination
```typescript
{
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  thumbnailUrl?: string;
  googlePlaceId?: string;
  createdAt: Date;
}
```

### Trip
```typescript
{
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  destinationId: string;
  status: 'draft' | 'active' | 'completed';
  budget: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### ItineraryDay
```typescript
{
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string;
  budgetAllocated: number;
  activities: Activity[];
  createdAt: Date;
}
```

### Activity
```typescript
{
  id: string;
  name: string;
  time: string;
  duration: string;
  location?: string;
  cost?: number;
  type: 'activity' | 'restaurant' | 'attraction';
}
```

### Location
```typescript
{
  id: string;
  destinationId: string;
  name: string;
  type: 'restaurant' | 'tourist_site' | 'attraction' | 'hidden_gem';
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  googlePlaceId?: string;
  category?: string;
  createdAt: Date;
}
```

### RouteOption
```typescript
{
  id: string;
  tripId: string;
  mode: 'flight' | 'bus' | 'train' | 'car';
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: string;
  details: Record<string, any>;
  createdAt: Date;
}
```

### Weather
```typescript
{
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast?: WeatherDay[];
}
```

---

## Demo Data

The API comes pre-loaded with demo data:

### Destinations
- Paris, France
- Tokyo, Japan
- New York City, USA
- Bangkok, Thailand
- Dubai, UAE

### Locations (by destination)
Each destination has multiple locations:
- Tourist Sites
- Restaurants
- Hidden Gems
- Attractions

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (missing required fields)
- `404`: Not Found
- `500`: Server Error

---

## Testing the API

### Using cURL

```bash
# Get popular destinations
curl http://localhost:4000/api/v1/destinations/popular

# Search destinations
curl "http://localhost:4000/api/v1/destinations/search?q=paris"

# Get restaurants in Paris
curl http://localhost:4000/api/v1/destinations/dest_paris/restaurants

# Create a trip
curl -X POST http://localhost:4000/api/v1/trips \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "name": "Paris Adventure",
    "startDate": "2024-02-15",
    "endDate": "2024-02-20",
    "destinationId": "dest_paris",
    "budget": 2000
  }'

# Get weather forecast
curl http://localhost:4000/api/v1/weather/forecast/dest_paris?days=5

# Health check
curl http://localhost:4000/api/v1/health
```

### Using Postman
1. Import endpoints as REST requests
2. Use environment variables for base URL
3. Example collection structure:
   - Destinations (folder)
     - Search
     - Popular
     - Get by ID
   - Trips (folder)
     - Create
     - List
     - Details
   - Itineraries
   - Routes
   - Weather

---

## Next Steps

1. **Frontend Integration**
   - Create Angular services to call these endpoints
   - Build components for search, map, itinerary, etc.

2. **Enhanced Features**
   - Add authentication (JWT)
   - Real flight/bus pricing integration
   - Google Maps API integration
   - User reviews and ratings

3. **Database Migration**
   - Replace in-memory database with PostgreSQL
   - Add database migrations
   - Implement proper ORM (TypeORM or Sequelize)

4. **API Enhancements**
   - Add pagination
   - Add filtering and sorting
   - Rate limiting
   - Caching

---

## Server Structure

```
src/server/
├── config/
│   └── database.ts         # Database models, initialization, demo data
├── controllers/
│   ├── destination.controller.ts
│   ├── trip.controller.ts
│   ├── route.controller.ts
│   └── weather.controller.ts
├── routes/
│   └── travel.routes.ts    # All API route definitions
└── utils/
    └── helpers.ts          # Utility functions

src/
└── server.ts              # Main Express app setup
```

---

## Running the Server

```bash
# Development
npm run serve:ssr:guide-me

# The server will start on http://localhost:4000
# API endpoints available at http://localhost:4000/api/v1
# Health check: http://localhost:4000/api/v1/health
```
