import { Router, Request, Response } from 'express';
import { DestinationController } from '../controllers/destination.controller';
import { TripController } from '../controllers/trip.controller';
import { RouteController } from '../controllers/route.controller';
import { WeatherController } from '../controllers/weather.controller';

const router = Router();

// ==================== DESTINATIONS ====================
router.get('/destinations/search', DestinationController.searchDestinations);
router.get('/destinations/popular', DestinationController.getPopularDestinations);
router.get('/destinations/:id', DestinationController.getDestinationById);
router.get('/destinations/:id/locations', DestinationController.getDestinationLocations);
router.get('/destinations/:id/restaurants', DestinationController.getRestaurants);
router.get('/destinations/:id/attractions', DestinationController.getAttractions);
router.get('/destinations/:id/hidden-gems', DestinationController.getHiddenGems);

// ==================== TRIPS ====================
router.post('/trips', TripController.createTrip);
router.get('/users/:userId/trips', TripController.getUserTrips);
router.get('/trips/:tripId', TripController.getTripById);
router.put('/trips/:tripId', TripController.updateTrip);
router.delete('/trips/:tripId', TripController.deleteTrip);

// ==================== ITINERARIES ====================
router.post('/trips/:tripId/itineraries/generate', TripController.generateItinerary);
router.get('/trips/:tripId/itineraries', TripController.getItinerary);
router.put('/itineraries/:dayId', TripController.updateItineraryDay);

// ==================== ROUTES (Transportation) ====================
router.get('/routes/search', RouteController.searchRoutes);
router.get('/routes/flights', RouteController.getFlightOptions);
router.get('/routes/buses', RouteController.getBusOptions);
router.get('/routes/trains', RouteController.getTrainOptions);
router.get('/routes/cars', RouteController.getCarOptions);

// ==================== WEATHER ====================
router.get('/weather/current/:destinationId', WeatherController.getWeather);
router.get('/weather/forecast/:destinationId', WeatherController.getWeatherForecast);
router.post('/weather/bulk', WeatherController.getBulkWeather);

// ==================== HEALTH CHECK ====================
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Travel API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
