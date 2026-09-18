import { Request, Response } from 'express';
import { db, Trip, ItineraryDay, Activity } from '../config/database';
import { generateId } from '../utils/helpers';

export class TripController {
  static createTrip(req: Request, res: Response): void {
    const { userId, name, startDate, endDate, destinationId, budget } = req.body;

    if (!userId || !name || !startDate || !endDate || !destinationId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const trip: Trip = {
      id: generateId('trip'),
      userId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      destinationId,
      status: 'draft',
      budget: budget || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.trips.set(trip.id, trip);

    res.status(201).json({
      success: true,
      data: trip,
    });
  }

  static getUserTrips(req: Request, res: Response): void {
    const userId = req.params['userId'] as string;

    const trips = Array.from(db.trips.values()).filter((trip) => trip.userId === userId);

    res.json({
      success: true,
      data: trips,
      count: trips.length,
    });
  }

  static getTripById(req: Request, res: Response): void {
    const tripId = req.params['tripId'] as string;
    const trip = db.trips.get(tripId);

    if (!trip) {
      res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    const itineraries = Array.from(db.itineraries.values()).filter(
      (it) => it.tripId === tripId,
    );
    const routes = Array.from(db.routes.values()).filter((r) => r.tripId === tripId);

    res.json({
      success: true,
      data: {
        ...trip,
        itineraries,
        routes,
      },
    });
  }

  static updateTrip(req: Request, res: Response): void {
    const tripId = req.params['tripId'] as string;
    const trip = db.trips.get(tripId);

    if (!trip) {
      res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    const updated = {
      ...trip,
      ...req.body,
      updatedAt: new Date(),
    };

    db.trips.set(tripId, updated);

    res.json({
      success: true,
      data: updated,
    });
  }

  static deleteTrip(req: Request, res: Response): void {
    const tripId = req.params['tripId'] as string;

    if (!db.trips.has(tripId)) {
      res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
      return;
    }

    db.trips.delete(tripId);

    // Delete associated itineraries and routes
    Array.from(db.itineraries.values()).forEach((it) => {
      if (it.tripId === tripId) {
        db.itineraries.delete(it.id);
      }
    });

    Array.from(db.routes.values()).forEach((r) => {
      if (r.tripId === tripId) {
        db.routes.delete(r.id);
      }
    });

    res.json({
      success: true,
      message: 'Trip deleted successfully',
    });
  }

  static generateItinerary(req: Request, res: Response): void {
    const { tripId, days, interests } = req.body;

    if (!tripId || !days) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    const trip = db.trips.get(tripId);
    if (!trip) {
      res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
      return;
    }

    // Generate basic itinerary for each day
    const itineraries: ItineraryDay[] = [];

    for (let day = 1; day <= days; day++) {
      const activities: Activity[] = [];

      if (day === 1) {
        activities.push(
          { id: generateId('act'), name: 'Arrival', time: '10:00 AM', duration: '2h', type: 'activity' },
          {
            id: generateId('act'),
            name: 'Check-in & Rest',
            time: '12:00 PM',
            duration: '3h',
            type: 'activity',
          },
          {
            id: generateId('act'),
            name: 'Dinner at local restaurant',
            time: '7:00 PM',
            duration: '2h',
            type: 'restaurant',
          },
        );
      } else if (day === days) {
        activities.push(
          { id: generateId('act'), name: 'Last-minute shopping', time: '10:00 AM', duration: '2h', type: 'activity' },
          {
            id: generateId('act'),
            name: 'Lunch',
            time: '1:00 PM',
            duration: '1h',
            type: 'restaurant',
          },
          {
            id: generateId('act'),
            name: 'Departure',
            time: '4:00 PM',
            duration: '2h',
            type: 'activity',
          },
        );
      } else {
        activities.push(
          {
            id: generateId('act'),
            name: 'Breakfast',
            time: '8:00 AM',
            duration: '1h',
            type: 'restaurant',
          },
          {
            id: generateId('act'),
            name: interests?.[0] || 'Local attractions tour',
            time: '10:00 AM',
            duration: '3h',
            type: 'attraction',
          },
          {
            id: generateId('act'),
            name: 'Lunch',
            time: '1:00 PM',
            duration: '1h',
            type: 'restaurant',
          },
          {
            id: generateId('act'),
            name: interests?.[1] || 'Museum or cultural site',
            time: '3:00 PM',
            duration: '2h',
            type: 'attraction',
          },
          {
            id: generateId('act'),
            name: 'Dinner',
            time: '7:00 PM',
            duration: '2h',
            type: 'restaurant',
          },
        );
      }

      const itinerary: ItineraryDay = {
        id: generateId('itin'),
        tripId,
        dayNumber: day,
        title: `Day ${day}`,
        description: `Explore ${trip.destinationId}`,
        budgetAllocated: Math.round((trip.budget || 1000) / days),
        activities,
        createdAt: new Date(),
      };

      db.itineraries.set(itinerary.id, itinerary);
      itineraries.push(itinerary);
    }

    res.status(201).json({
      success: true,
      data: itineraries,
      message: `${days}-day itinerary generated`,
    });
  }

  static getItinerary(req: Request, res: Response): void {
    const tripId = req.params['tripId'] as string;

    const itineraries = Array.from(db.itineraries.values())
      .filter((it) => it.tripId === tripId)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    if (itineraries.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No itinerary found for this trip',
      });
      return;
    }

    res.json({
      success: true,
      data: itineraries,
    });
  }

  static updateItineraryDay(req: Request, res: Response): void {
    const dayId = Array.isArray(req.params['dayId']) ? req.params['dayId'][0] : (req.params['dayId'] as string);
    const { activities, budgetAllocated } = req.body;

    const itinerary = db.itineraries.get(dayId);
    if (!itinerary) {
      res.status(404).json({
        success: false,
        error: 'Itinerary day not found',
      });
      return;
    }

    const updated = {
      ...itinerary,
      activities: activities || itinerary.activities,
      budgetAllocated: budgetAllocated || itinerary.budgetAllocated,
    };

    db.itineraries.set(dayId, updated);

    res.json({
      success: true,
      data: updated,
    });
  }
}
