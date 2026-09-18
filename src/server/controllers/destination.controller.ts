import { Request, Response } from 'express';
import { db, Destination, getDestinationLocations } from '../config/database';

export class DestinationController {
  static searchDestinations(req: Request, res: Response): void {
    const { q } = req.query;
    const query = (q as string)?.toLowerCase() || '';

    const results = Array.from(db.destinations.values()).filter(
      (dest) =>
        dest.name.toLowerCase().includes(query) ||
        dest.country.toLowerCase().includes(query),
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }

  static getPopularDestinations(req: Request, res: Response): void {
    const popular = Array.from(db.destinations.values()).slice(0, 5);
    res.json({
      success: true,
      data: popular,
    });
  }

  static getDestinationById(req: Request, res: Response): void {
    const id = req.params['id'] as string;
    const destination = db.destinations.get(id);

    if (!destination) {
      res.status(404).json({
        success: false,
        error: 'Destination not found',
      });
    }

    const locations = getDestinationLocations(id);

    res.json({
      success: true,
      data: {
        ...destination,
        locationsCount: locations.length,
      },
    });
  }

  static getDestinationLocations(req: Request, res: Response): void {
    const id = req.params['id'] as string;
    const { type } = req.query;

    const destination = db.destinations.get(id);
    if (!destination) {
      res.status(404).json({
        success: false,
        error: 'Destination not found',
      });
    }

    let locations = getDestinationLocations(id);

    if (type) {
      locations = locations.filter((loc) => loc.type === type);
    }

    res.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  }

  static getRestaurants(req: Request, res: Response): void {
    const id = req.params['id'] as string;
    const restaurants = getDestinationLocations(id).filter(
      (loc) => loc.type === 'restaurant',
    );

    res.json({
      success: true,
      data: restaurants,
      count: restaurants.length,
    });
  }

  static getAttractions(req: Request, res: Response): void {
    const id = req.params['id'] as string;
    const attractions = getDestinationLocations(id).filter(
      (loc) => loc.type === 'tourist_site' || loc.type === 'attraction',
    );

    res.json({
      success: true,
      data: attractions,
      count: attractions.length,
    });
  }

  static getHiddenGems(req: Request, res: Response): void {
    const id = req.params['id'] as string;
    const gems = getDestinationLocations(id).filter((loc) => loc.type === 'hidden_gem');

    res.json({
      success: true,
      data: gems,
      count: gems.length,
    });
  }
}
