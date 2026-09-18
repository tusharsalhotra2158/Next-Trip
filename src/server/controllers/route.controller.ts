import { Request, Response } from 'express';
import { db, RouteOption, Trip } from '../config/database';
import { generateId } from '../utils/helpers';

// Mock route data generator
function generateMockRoutes(
  mode: 'flight' | 'bus' | 'train' | 'car',
  date: string,
): RouteOption[] {
  const baseTime = new Date(date);
  const routes: RouteOption[] = [];

  if (mode === 'flight') {
    const flightTimes = ['08:00', '12:30', '15:45', '19:00'];
    const basePrices = [250, 180, 200, 220];

    flightTimes.forEach((time, idx) => {
      const departure = new Date(baseTime);
      departure.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));

      const arrival = new Date(departure);
      arrival.setHours(arrival.getHours() + 2); // 2 hour flight

      routes.push({
        id: generateId('route'),
        tripId: '',
        mode: 'flight',
        departureTime: time,
        arrivalTime: arrival.toTimeString().slice(0, 5),
        price: basePrices[idx] + Math.random() * 100,
        duration: '2h 30m',
        details: {
          airline: ['Airline A', 'Airline B', 'Airline C'][idx],
          stops: idx === 0 ? 0 : idx === 1 ? 1 : 0,
          class: 'Economy',
        },
        createdAt: new Date(),
      });
    });
  } else if (mode === 'bus') {
    const busTimes = ['07:00', '11:00', '14:00', '18:00', '21:00'];
    const basePrices = [25, 25, 30, 30, 20];

    busTimes.forEach((time, idx) => {
      const departure = new Date(baseTime);
      departure.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));

      const arrival = new Date(departure);
      arrival.setHours(arrival.getHours() + 8); // 8 hour bus ride

      routes.push({
        id: generateId('route'),
        tripId: '',
        mode: 'bus',
        departureTime: time,
        arrivalTime: arrival.toTimeString().slice(0, 5),
        price: basePrices[idx] + Math.random() * 15,
        duration: '8h',
        details: {
          operator: ['Bus Co A', 'Bus Co B', 'Bus Co C'][idx],
          comfort: ['Standard', 'Standard', 'Deluxe', 'Deluxe', 'Standard'][idx],
          stops: 3,
        },
        createdAt: new Date(),
      });
    });
  } else if (mode === 'train') {
    const trainTimes = ['06:00', '09:30', '13:00', '16:30', '19:45'];
    const basePrices = [60, 80, 70, 85, 65];

    trainTimes.forEach((time, idx) => {
      const departure = new Date(baseTime);
      departure.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));

      const arrival = new Date(departure);
      arrival.setHours(arrival.getHours() + 4); // 4 hour train ride

      routes.push({
        id: generateId('route'),
        tripId: '',
        mode: 'train',
        departureTime: time,
        arrivalTime: arrival.toTimeString().slice(0, 5),
        price: basePrices[idx] + Math.random() * 30,
        duration: '4h',
        details: {
          operator: 'National Rail',
          class: ['Standard', 'First Class'][idx % 2],
          seats: ['Available', 'Limited', 'Available', 'Limited', 'Available'][idx],
        },
        createdAt: new Date(),
      });
    });
  } else if (mode === 'car') {
    const carTimes = ['06:00', '08:00', '10:00', '14:00', '18:00'];
    const basePrices = [80, 80, 85, 85, 90];

    carTimes.forEach((time, idx) => {
      routes.push({
        id: generateId('route'),
        tripId: '',
        mode: 'car',
        departureTime: time,
        arrivalTime: '',
        price: basePrices[idx] + Math.random() * 50,
        duration: '6h',
        details: {
          provider: ['Hertz', 'Avis', 'Budget', 'Enterprise', 'Sixt'][idx],
          carType: ['Compact', 'Mid-size', 'Sedan', 'SUV', 'Van'][idx],
          tolls: Math.random() * 50,
        },
        createdAt: new Date(),
      });
    });
  }

  return routes;
}

export class RouteController {
  static searchRoutes(req: Request, res: Response): void {
    const { tripId, mode, date } = req.query;

    if (!tripId || !mode || !date) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tripId, mode, date',
      });
    }

    const trip = db.trips.get(tripId as string);
    if (!trip) {
      res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    const routes = generateMockRoutes(mode as any, date as string);

    res.json({
      success: true,
      data: routes,
      count: routes.length,
      summary: {
        mode,
        date,
        cheapest: Math.min(...routes.map((r) => r.price)),
        fastest: Math.min(...routes.map((r) => {
          const parts = r.duration.split('h');
          return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
        })),
      },
    });
  }

  static getFlightOptions(req: Request, res: Response): void {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        error: 'Date parameter required',
      });
    }

    const flights = generateMockRoutes('flight', date as string);

    res.json({
      success: true,
      data: flights,
      count: flights.length,
    });
  }

  static getBusOptions(req: Request, res: Response): void {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        error: 'Date parameter required',
      });
    }

    const buses = generateMockRoutes('bus', date as string);

    res.json({
      success: true,
      data: buses,
      count: buses.length,
    });
  }

  static getTrainOptions(req: Request, res: Response): void {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        error: 'Date parameter required',
      });
    }

    const trains = generateMockRoutes('train', date as string);

    res.json({
      success: true,
      data: trains,
      count: trains.length,
    });
  }

  static getCarOptions(req: Request, res: Response): void {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        error: 'Date parameter required',
      });
    }

    const cars = generateMockRoutes('car', date as string);

    res.json({
      success: true,
      data: cars,
      count: cars.length,
    });
  }
}
