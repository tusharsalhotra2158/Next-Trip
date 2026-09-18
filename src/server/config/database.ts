// In-memory database for MVP (easily swappable with PostgreSQL/MongoDB)
// For production, replace with actual database client

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface Destination {
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

export interface Location {
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

export interface Activity {
  id: string;
  name: string;
  time: string;
  duration: string;
  location?: string;
  cost?: number;
  type: 'activity' | 'restaurant' | 'attraction';
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string;
  budgetAllocated: number;
  activities: Activity[];
  createdAt: Date;
}

export interface Trip {
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

export interface RouteOption {
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

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast?: WeatherDay[];
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

// In-memory database store
export const db = {
  users: new Map<string, User>(),
  destinations: new Map<string, Destination>(),
  locations: new Map<string, Location>(),
  trips: new Map<string, Trip>(),
  itineraries: new Map<string, ItineraryDay>(),
  routes: new Map<string, RouteOption>(),
  savedTrips: new Map<string, string[]>(), // userId -> tripIds
};

// Initialize with demo data
export function initializeDemoData() {
  // Demo destinations
  const paris: Destination = {
    id: 'dest_paris',
    name: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    description: 'The City of Light. Known for the Eiffel Tower, museums, and romantic ambiance.',
    googlePlaceId: 'ChIJD7fiBh9u5OgQYJSDpqKcKW8',
    createdAt: new Date(),
  };

  const tokyo: Destination = {
    id: 'dest_tokyo',
    name: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    description: 'Japan\'s vibrant capital. Modern technology meets traditional culture.',
    googlePlaceId: 'ChIJLU7jZCx3GGARkxgs-7UzNXQ',
    createdAt: new Date(),
  };

  const nyc: Destination = {
    id: 'dest_nyc',
    name: 'New York City',
    country: 'United States',
    lat: 40.7128,
    lng: -74.006,
    description: 'The city that never sleeps. Broadway, Times Square, and iconic landmarks.',
    googlePlaceId: 'ChIJOwg_06VPwokR4v4GfH-j67w',
    createdAt: new Date(),
  };

  const bangkok: Destination = {
    id: 'dest_bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    lat: 13.7563,
    lng: 100.5018,
    description: 'Southeast Asian capital. Ancient temples and vibrant street markets.',
    googlePlaceId: 'ChIJVSZzVR8GHTERu82IW_xj38Q',
    createdAt: new Date(),
  };

  const dubai: Destination = {
    id: 'dest_dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    lat: 25.2048,
    lng: 55.2708,
    description: 'Luxury, shopping, and stunning architecture in the desert.',
    googlePlaceId: 'ChIJ0wq1U2fz6DURX3_Byu2HO8w',
    createdAt: new Date(),
  };

  const delhi: Destination = {
    id: 'dest_delhi',
    name: 'Delhi',
    country: 'India',
    lat: 28.7041,
    lng: 77.1025,
    description: 'India\'s capital. Ancient monuments, vibrant markets, and rich history.',
    googlePlaceId: 'ChIJLfyAPq-DzjsRzrT_F3sHmH0',
    createdAt: new Date(),
  };

  const mumbai: Destination = {
    id: 'dest_mumbai',
    name: 'Mumbai',
    country: 'India',
    lat: 19.0760,
    lng: 72.8777,
    description: 'Bollywood, beaches, and bustling citylife. Gateway of India and glamorous coastal hub.',
    googlePlaceId: 'ChIJH7ZsDOxXwjsRJLnKVkZU1B4',
    createdAt: new Date(),
  };

  const goa: Destination = {
    id: 'dest_goa',
    name: 'Goa',
    country: 'India',
    lat: 15.4909,
    lng: 73.8278,
    description: 'Tropical paradise with golden beaches, churches, and Portuguese heritage.',
    googlePlaceId: 'ChIJ8cxkJeLhzjsRtvCKhVOT1mw',
    createdAt: new Date(),
  };

  const jaipur: Destination = {
    id: 'dest_jaipur',
    name: 'Jaipur',
    country: 'India',
    lat: 26.9124,
    lng: 75.7873,
    description: 'The Pink City. Palaces, forts, and vibrant culture in Rajasthan.',
    googlePlaceId: 'ChIJ7wQAaZlcCjkRfZqpWGJTxz0',
    createdAt: new Date(),
  };

  const agra: Destination = {
    id: 'dest_agra',
    name: 'Agra',
    country: 'India',
    lat: 27.1767,
    lng: 78.0081,
    description: 'Home to the iconic Taj Mahal. UNESCO World Heritage sites and Mughal history.',
    googlePlaceId: 'ChIJH9qWGhD0eUkRKq4dItKnRHg',
    createdAt: new Date(),
  };

  const bangalore: Destination = {
    id: 'dest_bangalore',
    name: 'Bangalore',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    description: 'India\'s tech hub. Gardens, coffee culture, and modern nightlife.',
    googlePlaceId: 'ChIJ_Ycxj3NlzjsR9Kq9-i8vbAQ',
    createdAt: new Date(),
  };

  const chandigarh: Destination = {
    id: 'dest_chandigarh',
    name: 'Chandigarh',
    country: 'India',
    lat: 30.7333,
    lng: 76.7794,
    description: 'Planned city with beautiful gardens. Modern architecture and peaceful parks.',
    googlePlaceId: 'ChIJCQWGPw4FDDkRsH0-b-jHKgs',
    createdAt: new Date(),
  };

  const varanasi: Destination = {
    id: 'dest_varanasi',
    name: 'Varanasi',
    country: 'India',
    lat: 25.3209,
    lng: 82.9789,
    description: 'Sacred city on Ganges. Ancient temples, ghats, and spiritual journey.',
    googlePlaceId: 'ChIJ35VW7zR-eDkRmRz92_plvFI',
    createdAt: new Date(),
  };

  const kolkata: Destination = {
    id: 'dest_kolkata',
    name: 'Kolkata',
    country: 'India',
    lat: 22.5726,
    lng: 88.3639,
    description: 'City of Joy. Historical monuments, museums, and cultural heritage.',
    googlePlaceId: 'ChIJ2eUekzR_dTkRZH_xD_Gy1gE',
    createdAt: new Date(),
  };

  const hyderabad: Destination = {
    id: 'dest_hyderabad',
    name: 'Hyderabad',
    country: 'India',
    lat: 17.3850,
    lng: 78.4867,
    description: 'IT city with biryani culture. Historic sites and modern infrastructure.',
    googlePlaceId: 'ChIJCwD_FfmqwjoRamhY3t6rR5w',
    createdAt: new Date(),
  };

  db.destinations.set('dest_paris', paris);
  db.destinations.set('dest_tokyo', tokyo);
  db.destinations.set('dest_nyc', nyc);
  db.destinations.set('dest_bangkok', bangkok);
  db.destinations.set('dest_dubai', dubai);
  db.destinations.set('dest_delhi', delhi);
  db.destinations.set('dest_mumbai', mumbai);
  db.destinations.set('dest_goa', goa);
  db.destinations.set('dest_jaipur', jaipur);
  db.destinations.set('dest_agra', agra);
  db.destinations.set('dest_bangalore', bangalore);
  db.destinations.set('dest_chandigarh', chandigarh);
  db.destinations.set('dest_varanasi', varanasi);
  db.destinations.set('dest_kolkata', kolkata);
  db.destinations.set('dest_hyderabad', hyderabad);

  // Demo locations for Paris
  const parisLocations: Location[] = [
    {
      id: 'loc_eiffel',
      destinationId: 'dest_paris',
      name: 'Eiffel Tower',
      type: 'tourist_site',
      lat: 48.8584,
      lng: 2.2945,
      rating: 4.7,
      reviewsCount: 150000,
      category: 'Landmark',
      createdAt: new Date(),
    },
    {
      id: 'loc_louvre',
      destinationId: 'dest_paris',
      name: 'Louvre Museum',
      type: 'tourist_site',
      lat: 48.861,
      lng: 2.3356,
      rating: 4.6,
      reviewsCount: 120000,
      category: 'Museum',
      createdAt: new Date(),
    },
    {
      id: 'loc_cafe_paris',
      destinationId: 'dest_paris',
      name: 'Café de Flore',
      type: 'restaurant',
      lat: 48.8541,
      lng: 2.3322,
      rating: 4.4,
      reviewsCount: 8500,
      category: 'French Cafe',
      createdAt: new Date(),
    },
    {
      id: 'loc_notre_dame',
      destinationId: 'dest_paris',
      name: 'Notre-Dame Cathedral',
      type: 'tourist_site',
      lat: 48.8530,
      lng: 2.3499,
      rating: 4.5,
      reviewsCount: 95000,
      category: 'Historic Site',
      createdAt: new Date(),
    },
    {
      id: 'loc_montmartre',
      destinationId: 'dest_paris',
      name: 'Montmartre',
      type: 'hidden_gem',
      lat: 48.8867,
      lng: 2.3431,
      rating: 4.5,
      reviewsCount: 45000,
      category: 'Neighborhood',
      createdAt: new Date(),
    },
  ];

  parisLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Tokyo
  const tokyoLocations: Location[] = [
    {
      id: 'loc_senso',
      destinationId: 'dest_tokyo',
      name: 'Senso-ji Temple',
      type: 'tourist_site',
      lat: 35.7148,
      lng: 139.7967,
      rating: 4.6,
      reviewsCount: 98000,
      category: 'Temple',
      createdAt: new Date(),
    },
    {
      id: 'loc_shibuya',
      destinationId: 'dest_tokyo',
      name: 'Shibuya Crossing',
      type: 'tourist_site',
      lat: 35.6595,
      lng: 139.704,
      rating: 4.7,
      reviewsCount: 120000,
      category: 'Landmark',
      createdAt: new Date(),
    },
    {
      id: 'loc_tsukiji',
      destinationId: 'dest_tokyo',
      name: 'Tsukiji Outer Market',
      type: 'restaurant',
      lat: 35.6653,
      lng: 139.7714,
      rating: 4.5,
      reviewsCount: 52000,
      category: 'Market',
      createdAt: new Date(),
    },
    {
      id: 'loc_asakusa',
      destinationId: 'dest_tokyo',
      name: 'Asakusa District',
      type: 'hidden_gem',
      lat: 35.7115,
      lng: 139.7977,
      rating: 4.6,
      reviewsCount: 67000,
      category: 'Neighborhood',
      createdAt: new Date(),
    },
  ];

  tokyoLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Delhi, India
  const delhiLocations: Location[] = [
    {
      id: 'loc_india_gate',
      destinationId: 'dest_delhi',
      name: 'India Gate',
      type: 'tourist_site',
      lat: 28.6129,
      lng: 77.2295,
      rating: 4.5,
      reviewsCount: 180000,
      category: 'Landmark',
      createdAt: new Date(),
    },
    {
      id: 'loc_red_fort',
      destinationId: 'dest_delhi',
      name: 'Red Fort',
      type: 'tourist_site',
      lat: 28.6562,
      lng: 77.241,
      rating: 4.4,
      reviewsCount: 150000,
      category: 'Historic Site',
      createdAt: new Date(),
    },
    {
      id: 'loc_qutub_minar',
      destinationId: 'dest_delhi',
      name: 'Qutub Minar',
      type: 'tourist_site',
      lat: 28.5244,
      lng: 77.1855,
      rating: 4.6,
      reviewsCount: 120000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_chandni_chowk',
      destinationId: 'dest_delhi',
      name: 'Chandni Chowk Market',
      type: 'restaurant',
      lat: 28.6505,
      lng: 77.2303,
      rating: 4.3,
      reviewsCount: 95000,
      category: 'Market',
      createdAt: new Date(),
    },
    {
      id: 'loc_lodi_gardens',
      destinationId: 'dest_delhi',
      name: 'Lodi Gardens',
      type: 'attraction',
      lat: 28.5937,
      lng: 77.2197,
      rating: 4.6,
      reviewsCount: 85000,
      category: 'Park',
      createdAt: new Date(),
    },
  ];

  delhiLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Mumbai, India
  const mumbaiLocations: Location[] = [
    {
      id: 'loc_gateway_india',
      destinationId: 'dest_mumbai',
      name: 'Gateway of India',
      type: 'tourist_site',
      lat: 18.9220,
      lng: 72.8347,
      rating: 4.5,
      reviewsCount: 200000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_marine_drive',
      destinationId: 'dest_mumbai',
      name: 'Marine Drive',
      type: 'attraction',
      lat: 18.9432,
      lng: 72.8236,
      rating: 4.6,
      reviewsCount: 150000,
      category: 'Beach',
      createdAt: new Date(),
    },
    {
      id: 'loc_bandra_worli',
      destinationId: 'dest_mumbai',
      name: 'Bandra-Worli Sea Link',
      type: 'hidden_gem',
      lat: 19.0176,
      lng: 72.8263,
      rating: 4.4,
      reviewsCount: 120000,
      category: 'Bridge',
      createdAt: new Date(),
    },
    {
      id: 'loc_taj_hotel_mumbai',
      destinationId: 'dest_mumbai',
      name: 'Taj Mahal Palace Hotel',
      type: 'restaurant',
      lat: 18.9201,
      lng: 72.8347,
      rating: 4.7,
      reviewsCount: 85000,
      category: 'Luxury Hotel',
      createdAt: new Date(),
    },
  ];

  mumbaiLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Goa, India
  const goaLocations: Location[] = [
    {
      id: 'loc_baga_beach',
      destinationId: 'dest_goa',
      name: 'Baga Beach',
      type: 'tourist_site',
      lat: 15.5833,
      lng: 73.8333,
      rating: 4.5,
      reviewsCount: 120000,
      category: 'Beach',
      createdAt: new Date(),
    },
    {
      id: 'loc_basilica_bom_jesus',
      destinationId: 'dest_goa',
      name: 'Basilica of Bom Jesus',
      type: 'tourist_site',
      lat: 15.4909,
      lng: 73.8278,
      rating: 4.6,
      reviewsCount: 95000,
      category: 'Church',
      createdAt: new Date(),
    },
    {
      id: 'loc_fort_aguada',
      destinationId: 'dest_goa',
      name: 'Fort Aguada',
      type: 'tourist_site',
      lat: 15.4867,
      lng: 73.8081,
      rating: 4.5,
      reviewsCount: 80000,
      category: 'Fort',
      createdAt: new Date(),
    },
    {
      id: 'loc_anjuna_flea_market',
      destinationId: 'dest_goa',
      name: 'Anjuna Flea Market',
      type: 'hidden_gem',
      lat: 15.5667,
      lng: 73.8067,
      rating: 4.3,
      reviewsCount: 70000,
      category: 'Market',
      createdAt: new Date(),
    },
  ];

  goaLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Jaipur, India
  const jaipurLocations: Location[] = [
    {
      id: 'loc_city_palace',
      destinationId: 'dest_jaipur',
      name: 'City Palace',
      type: 'tourist_site',
      lat: 26.9250,
      lng: 75.8231,
      rating: 4.6,
      reviewsCount: 110000,
      category: 'Palace',
      createdAt: new Date(),
    },
    {
      id: 'loc_hawa_mahal',
      destinationId: 'dest_jaipur',
      name: 'Hawa Mahal (Palace of Winds)',
      type: 'tourist_site',
      lat: 26.9245,
      lng: 75.8274,
      rating: 4.7,
      reviewsCount: 180000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_jantar_mantar',
      destinationId: 'dest_jaipur',
      name: 'Jantar Mantar',
      type: 'tourist_site',
      lat: 26.9245,
      lng: 75.8231,
      rating: 4.5,
      reviewsCount: 95000,
      category: 'Observatory',
      createdAt: new Date(),
    },
    {
      id: 'loc_jaipur_bazaar',
      destinationId: 'dest_jaipur',
      name: 'Bapu Bazaar',
      type: 'restaurant',
      lat: 26.9106,
      lng: 75.8265,
      rating: 4.4,
      reviewsCount: 85000,
      category: 'Market',
      createdAt: new Date(),
    },
  ];

  jaipurLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Agra, India
  const agraLocations: Location[] = [
    {
      id: 'loc_taj_mahal',
      destinationId: 'dest_agra',
      name: 'Taj Mahal',
      type: 'tourist_site',
      lat: 27.1751,
      lng: 78.0421,
      rating: 4.8,
      reviewsCount: 350000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_agra_fort',
      destinationId: 'dest_agra',
      name: 'Agra Fort',
      type: 'tourist_site',
      lat: 27.1771,
      lng: 78.0081,
      rating: 4.5,
      reviewsCount: 120000,
      category: 'Fort',
      createdAt: new Date(),
    },
    {
      id: 'loc_mehtab_bagh',
      destinationId: 'dest_agra',
      name: 'Mehtab Bagh',
      type: 'hidden_gem',
      lat: 27.1890,
      lng: 78.0556,
      rating: 4.4,
      reviewsCount: 65000,
      category: 'Garden',
      createdAt: new Date(),
    },
  ];

  agraLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Bangalore, India
  const bangaloreLocations: Location[] = [
    {
      id: 'loc_vidhana_soudha',
      destinationId: 'dest_bangalore',
      name: 'Vidhana Soudha',
      type: 'tourist_site',
      lat: 12.9789,
      lng: 77.5908,
      rating: 4.5,
      reviewsCount: 100000,
      category: 'Government Building',
      createdAt: new Date(),
    },
    {
      id: 'loc_cubbon_park',
      destinationId: 'dest_bangalore',
      name: 'Cubbon Park',
      type: 'attraction',
      lat: 12.9716,
      lng: 77.5946,
      rating: 4.6,
      reviewsCount: 95000,
      category: 'Park',
      createdAt: new Date(),
    },
    {
      id: 'loc_bangalore_palace',
      destinationId: 'dest_bangalore',
      name: 'Bangalore Palace',
      type: 'tourist_site',
      lat: 13.0027,
      lng: 77.6025,
      rating: 4.5,
      reviewsCount: 85000,
      category: 'Palace',
      createdAt: new Date(),
    },
    {
      id: 'loc_koramangala',
      destinationId: 'dest_bangalore',
      name: 'Koramangala',
      type: 'hidden_gem',
      lat: 12.9352,
      lng: 77.6245,
      rating: 4.4,
      reviewsCount: 120000,
      category: 'Neighborhood',
      createdAt: new Date(),
    },
  ];

  bangaloreLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Chandigarh, India
  const chandigarhLocations: Location[] = [
    {
      id: 'loc_rock_garden',
      destinationId: 'dest_chandigarh',
      name: 'Rock Garden',
      type: 'tourist_site',
      lat: 30.7633,
      lng: 76.8012,
      rating: 4.6,
      reviewsCount: 95000,
      category: 'Garden',
      createdAt: new Date(),
    },
    {
      id: 'loc_capitol_complex',
      destinationId: 'dest_chandigarh',
      name: 'Capitol Complex',
      type: 'tourist_site',
      lat: 30.7411,
      lng: 76.8072,
      rating: 4.5,
      reviewsCount: 80000,
      category: 'Architecture',
      createdAt: new Date(),
    },
    {
      id: 'loc_sukhna_lake',
      destinationId: 'dest_chandigarh',
      name: 'Sukhna Lake',
      type: 'attraction',
      lat: 30.7633,
      lng: 76.8167,
      rating: 4.5,
      reviewsCount: 75000,
      category: 'Lake',
      createdAt: new Date(),
    },
  ];

  chandigarhLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Varanasi, India
  const varanasiLocations: Location[] = [
    {
      id: 'loc_kashi_vishwanath',
      destinationId: 'dest_varanasi',
      name: 'Kashi Vishwanath Temple',
      type: 'tourist_site',
      lat: 25.3209,
      lng: 82.9789,
      rating: 4.7,
      reviewsCount: 150000,
      category: 'Temple',
      createdAt: new Date(),
    },
    {
      id: 'loc_ghat_varanasi',
      destinationId: 'dest_varanasi',
      name: 'Ganges Ghats',
      type: 'attraction',
      lat: 25.3208,
      lng: 82.9850,
      rating: 4.6,
      reviewsCount: 120000,
      category: 'Landmark',
      createdAt: new Date(),
    },
    {
      id: 'loc_sarnath',
      destinationId: 'dest_varanasi',
      name: 'Sarnath',
      type: 'hidden_gem',
      lat: 25.3717,
      lng: 83.0129,
      rating: 4.5,
      reviewsCount: 85000,
      category: 'Buddhist Site',
      createdAt: new Date(),
    },
  ];

  varanasiLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Kolkata, India
  const kolkataLocations: Location[] = [
    {
      id: 'loc_victoria_memorial',
      destinationId: 'dest_kolkata',
      name: 'Victoria Memorial',
      type: 'tourist_site',
      lat: 22.5448,
      lng: 88.3426,
      rating: 4.6,
      reviewsCount: 110000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_howrah_bridge',
      destinationId: 'dest_kolkata',
      name: 'Howrah Bridge',
      type: 'tourist_site',
      lat: 22.5937,
      lng: 88.3629,
      rating: 4.5,
      reviewsCount: 95000,
      category: 'Bridge',
      createdAt: new Date(),
    },
    {
      id: 'loc_indian_museum',
      destinationId: 'dest_kolkata',
      name: 'Indian Museum',
      type: 'tourist_site',
      lat: 22.5636,
      lng: 88.3634,
      rating: 4.4,
      reviewsCount: 75000,
      category: 'Museum',
      createdAt: new Date(),
    },
  ];

  kolkataLocations.forEach((loc) => db.locations.set(loc.id, loc));

  // Demo locations for Hyderabad, India
  const hyderabadLocations: Location[] = [
    {
      id: 'loc_charminar',
      destinationId: 'dest_hyderabad',
      name: 'Charminar',
      type: 'tourist_site',
      lat: 17.3597,
      lng: 78.4711,
      rating: 4.5,
      reviewsCount: 120000,
      category: 'Monument',
      createdAt: new Date(),
    },
    {
      id: 'loc_mecca_masjid',
      destinationId: 'dest_hyderabad',
      name: 'Mecca Masjid',
      type: 'tourist_site',
      lat: 17.3609,
      lng: 78.4691,
      rating: 4.4,
      reviewsCount: 85000,
      category: 'Mosque',
      createdAt: new Date(),
    },
    {
      id: 'loc_hussain_sagar',
      destinationId: 'dest_hyderabad',
      name: 'Hussain Sagar Lake',
      type: 'attraction',
      lat: 17.3660,
      lng: 78.4746,
      rating: 4.5,
      reviewsCount: 95000,
      category: 'Lake',
      createdAt: new Date(),
    },
  ];

  hyderabadLocations.forEach((loc) => db.locations.set(loc.id, loc));
}

export function getDestinationLocations(destinationId: string): Location[] {
  return Array.from(db.locations.values()).filter(
    (loc) => loc.destinationId === destinationId,
  );
}

export function getLocationsByType(
  destinationId: string,
  type: Location['type'],
): Location[] {
  return getDestinationLocations(destinationId).filter((loc) => loc.type === type);
}
