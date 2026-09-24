export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api/v1', // Backend Travel API

  // Google Maps API Configuration
  googleMaps: {
    apiKey: 'AIzaSyBYwn_ksvjImNGug3HOjVm9FNtUr1HH4Iw', // Add your Google Maps API key here
    defaultCenter: { lat: 20, lng: 0 },
    defaultZoom: 4,
    language: 'en',
    region: 'US',
    mapTypeId: 'roadmap', // 'roadmap' | 'satellite' | 'terrain' | 'hybrid'
    enableAutocomplete: true,
    enableDirections: true,
    enableGeolocation: true,
    clusterMarkers: true,
    markerClusterOptions: {
      gridSize: 50,
      maxZoom: 15,
      minimumClusterSize: 3,
    },
  },

  // External APIs
  openWeatherMap: {
    apiKey: '', // Add your OpenWeatherMap API key here
  },

  amadeus: {
    clientId: '', // Add your Amadeus API client ID
    clientSecret: '', // Add your Amadeus API secret
  },

  // App Configuration
  app: {
    name: 'Next Trip',
    version: '1.0.0',
    defaultCurrency: 'INR',
  },

  // Cache Configuration
  cache: {
    destinationsTTL: 24 * 60 * 60 * 1000, // 24 hours
    weatherTTL: 60 * 60 * 1000, // 1 hour
    routesTTL: 6 * 60 * 60 * 1000, // 6 hours
  },
};

