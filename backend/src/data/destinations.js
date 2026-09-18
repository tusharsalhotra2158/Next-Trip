// Seed data for the in-memory Travel API.
// Coordinates are approximate city centers; this is demo/mock data, not a live data source.

const DESTINATIONS = [
  { id: 'dest_chandigarh', name: 'Chandigarh', country: 'India', lat: 30.7333, lng: 76.7794, description: 'A planned city known for its modernist architecture, Rock Garden, and Sukhna Lake.' },
  { id: 'dest_delhi', name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.2090, description: "India's capital, blending Mughal-era monuments with a bustling modern metropolis." },
  { id: 'dest_mumbai', name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, description: "India's financial capital, home to Bollywood, colonial architecture, and the Gateway of India." },
  { id: 'dest_bangalore', name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, description: "India's tech hub, known for its parks, nightlife, and pleasant climate." },
  { id: 'dest_jaipur', name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873, description: 'The Pink City, famed for its forts, palaces, and vibrant bazaars.' },
  { id: 'dest_paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, description: 'The City of Light, celebrated for the Eiffel Tower, art, and cuisine.' },
  { id: 'dest_london', name: 'London', country: 'United Kingdom', lat: 51.5072, lng: -0.1276, description: 'A global city rich in history, museums, and diverse neighborhoods.' },
  { id: 'dest_rome', name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964, description: 'The Eternal City, home to the Colosseum, Vatican, and centuries of history.' },
  { id: 'dest_tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, description: 'A dazzling mix of ultramodern and traditional, from skyscrapers to ancient temples.' },
  { id: 'dest_bangkok', name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, description: 'A vibrant city of ornate shrines, street food, and bustling markets.' },
  { id: 'dest_singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, description: 'A gleaming garden city known for its food scene and futuristic skyline.' },
  { id: 'dest_dubai', name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, description: 'A desert metropolis of record-breaking skyscrapers and luxury shopping.' },
  { id: 'dest_newyork', name: 'New York City', country: 'United States', lat: 40.7128, lng: -74.0060, description: 'The city that never sleeps, packed with iconic landmarks and culture.' },
  { id: 'dest_sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, description: 'Home to the Opera House and Harbour Bridge, framed by beaches.' },
  { id: 'dest_barcelona', name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734, description: "Gaudí's architectural playground on the Mediterranean coast." },
  { id: 'dest_amsterdam', name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, description: 'A canal-laced city famed for its museums and cycling culture.' },
  { id: 'dest_bali', name: 'Bali', country: 'Indonesia', lat: -8.3405, lng: 115.0920, description: 'An island of terraced rice paddies, temples, and beaches.' },
];

const RESTAURANT_NAMES = ['The Local Kitchen', 'Spice Route', 'Old Town Bistro', 'Harbor View Cafe', 'Street Food Corner', 'Garden Terrace'];
const ATTRACTION_NAMES = ['Old Fort', 'City Museum', 'Central Park', 'Heritage Walk', 'Grand Bazaar', 'Riverside Promenade'];
const HIDDEN_GEM_NAMES = ['Hidden Courtyard Cafe', "Artisan's Alley", 'Secret Rooftop View', 'Quiet Botanical Corner'];

/** Deterministic pseudo-random generator so seed data is stable across restarts. */
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildLocations(destination) {
  const rand = seededRandom(hashString(destination.id));
  const locations = [];

  const addSet = (names, type) => {
    names.forEach((name, index) => {
      locations.push({
        id: `${destination.id}_${type}_${index}`,
        destinationId: destination.id,
        name: `${name} - ${destination.name}`,
        type,
        lat: destination.lat + (rand() - 0.5) * 0.08,
        lng: destination.lng + (rand() - 0.5) * 0.08,
        rating: Math.round((3.5 + rand() * 1.5) * 10) / 10,
        reviewsCount: Math.floor(50 + rand() * 5000),
        category: type === 'restaurant' ? 'Dining' : type === 'hidden_gem' ? 'Local Favorite' : 'Sightseeing',
        createdAt: new Date().toISOString(),
      });
    });
  };

  addSet(RESTAURANT_NAMES, 'restaurant');
  addSet(ATTRACTION_NAMES, 'tourist_site');
  addSet(HIDDEN_GEM_NAMES, 'hidden_gem');

  return locations;
}

const destinations = DESTINATIONS.map((d) => ({ ...d, createdAt: new Date().toISOString() }));
const locationsByDestination = new Map(destinations.map((d) => [d.id, buildLocations(d)]));

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Find an existing seeded destination by name+country, or create a new one
 * (with generated sample restaurants/attractions/hidden-gems, same as the
 * seed data) for a city resolved via search. Runtime-created destinations
 * live only in memory and reset on server restart, same as trips.
 */
function getOrCreateDestination({ name, country, lat, lng, description }) {
  const existing = destinations.find(
    (d) => d.name.toLowerCase() === name.toLowerCase() && d.country.toLowerCase() === (country || '').toLowerCase(),
  );
  if (existing) return existing;

  const id = `dest_${slugify(name)}_${slugify(country || '')}`.slice(0, 60);
  if (locationsByDestination.has(id)) {
    return destinations.find((d) => d.id === id);
  }

  const destination = {
    id,
    name,
    country: country || 'Unknown',
    lat,
    lng,
    description:
      description || `Explore ${name}${country ? `, ${country}` : ''} — points of interest below are sample suggestions.`,
    createdAt: new Date().toISOString(),
  };

  destinations.push(destination);
  locationsByDestination.set(id, buildLocations(destination));
  return destination;
}

module.exports = { destinations, locationsByDestination, getOrCreateDestination };
