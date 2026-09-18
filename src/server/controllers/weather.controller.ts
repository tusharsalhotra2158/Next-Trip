import { Request, Response } from 'express';
import { Weather, WeatherDay } from '../config/database';

// Mock weather data by destination
const weatherByDestination: { [key: string]: Weather } = {
  dest_paris: {
    temp: 18,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
    icon: '⛅',
    forecast: [
      {
        date: '2024-01-15',
        tempMax: 20,
        tempMin: 15,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-16',
        tempMax: 22,
        tempMin: 16,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-17',
        tempMax: 19,
        tempMin: 14,
        condition: 'Rainy',
        icon: '🌧️',
      },
      {
        date: '2024-01-18',
        tempMax: 18,
        tempMin: 13,
        condition: 'Cloudy',
        icon: '☁️',
      },
      {
        date: '2024-01-19',
        tempMax: 21,
        tempMin: 15,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-20',
        tempMax: 20,
        tempMin: 14,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-21',
        tempMax: 23,
        tempMin: 17,
        condition: 'Sunny',
        icon: '☀️',
      },
    ],
  },
  dest_tokyo: {
    temp: 8,
    condition: 'Clear',
    humidity: 45,
    windSpeed: 8,
    icon: '☀️',
    forecast: [
      {
        date: '2024-01-15',
        tempMax: 12,
        tempMin: 5,
        condition: 'Clear',
        icon: '☀️',
      },
      {
        date: '2024-01-16',
        tempMax: 14,
        tempMin: 6,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-17',
        tempMax: 10,
        tempMin: 4,
        condition: 'Cloudy',
        icon: '☁️',
      },
      {
        date: '2024-01-18',
        tempMax: 9,
        tempMin: 3,
        condition: 'Rainy',
        icon: '🌧️',
      },
      {
        date: '2024-01-19',
        tempMax: 13,
        tempMin: 7,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-20',
        tempMax: 15,
        tempMin: 8,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-21',
        tempMax: 16,
        tempMin: 9,
        condition: 'Clear',
        icon: '☀️',
      },
    ],
  },
  dest_nyc: {
    temp: 5,
    condition: 'Snowy',
    humidity: 60,
    windSpeed: 15,
    icon: '❄️',
    forecast: [
      {
        date: '2024-01-15',
        tempMax: 8,
        tempMin: 2,
        condition: 'Snowy',
        icon: '❄️',
      },
      {
        date: '2024-01-16',
        tempMax: 10,
        tempMin: 3,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-17',
        tempMax: 7,
        tempMin: 1,
        condition: 'Snowy',
        icon: '❄️',
      },
      {
        date: '2024-01-18',
        tempMax: 6,
        tempMin: 0,
        condition: 'Clear',
        icon: '☀️',
      },
      {
        date: '2024-01-19',
        tempMax: 9,
        tempMin: 2,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-20',
        tempMax: 11,
        tempMin: 4,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-21',
        tempMax: 12,
        tempMin: 5,
        condition: 'Clear',
        icon: '☀️',
      },
    ],
  },
  dest_bangkok: {
    temp: 32,
    condition: 'Sunny',
    humidity: 75,
    windSpeed: 5,
    icon: '☀️',
    forecast: [
      {
        date: '2024-01-15',
        tempMax: 35,
        tempMin: 28,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-16',
        tempMax: 36,
        tempMin: 29,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-17',
        tempMax: 34,
        tempMin: 27,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-18',
        tempMax: 33,
        tempMin: 26,
        condition: 'Rainy',
        icon: '🌧️',
      },
      {
        date: '2024-01-19',
        tempMax: 35,
        tempMin: 28,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-20',
        tempMax: 36,
        tempMin: 29,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-21',
        tempMax: 34,
        tempMin: 27,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
    ],
  },
  dest_dubai: {
    temp: 28,
    condition: 'Clear',
    humidity: 35,
    windSpeed: 10,
    icon: '☀️',
    forecast: [
      {
        date: '2024-01-15',
        tempMax: 30,
        tempMin: 25,
        condition: 'Clear',
        icon: '☀️',
      },
      {
        date: '2024-01-16',
        tempMax: 31,
        tempMin: 26,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-17',
        tempMax: 29,
        tempMin: 24,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      {
        date: '2024-01-18',
        tempMax: 28,
        tempMin: 23,
        condition: 'Clear',
        icon: '☀️',
      },
      {
        date: '2024-01-19',
        tempMax: 30,
        tempMin: 25,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-20',
        tempMax: 32,
        tempMin: 27,
        condition: 'Sunny',
        icon: '☀️',
      },
      {
        date: '2024-01-21',
        tempMax: 31,
        tempMin: 26,
        condition: 'Clear',
        icon: '☀️',
      },
    ],
  },
  dest_delhi: {
    temp: 22,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 10,
    icon: '⛅',
    forecast: [
      { date: '2024-01-15', tempMax: 25, tempMin: 12, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 27, tempMin: 14, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 24, tempMin: 11, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-18', tempMax: 22, tempMin: 10, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-19', tempMax: 26, tempMin: 13, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 28, tempMin: 15, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 25, tempMin: 12, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_mumbai: {
    temp: 30,
    condition: 'Sunny',
    humidity: 75,
    windSpeed: 12,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 32, tempMin: 24, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 33, tempMin: 25, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 31, tempMin: 23, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2024-01-18', tempMax: 29, tempMin: 22, condition: 'Rainy', icon: '🌧️' },
      { date: '2024-01-19', tempMax: 32, tempMin: 24, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 33, tempMin: 25, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 31, tempMin: 23, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_goa: {
    temp: 32,
    condition: 'Sunny',
    humidity: 80,
    windSpeed: 15,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 34, tempMin: 26, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 35, tempMin: 27, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 33, tempMin: 25, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2024-01-18', tempMax: 31, tempMin: 24, condition: 'Rainy', icon: '🌧️' },
      { date: '2024-01-19', tempMax: 34, tempMin: 26, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 35, tempMin: 27, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 33, tempMin: 25, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_jaipur: {
    temp: 23,
    condition: 'Sunny',
    humidity: 55,
    windSpeed: 9,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 26, tempMin: 13, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 28, tempMin: 14, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 25, tempMin: 12, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-18', tempMax: 23, tempMin: 11, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-19', tempMax: 27, tempMin: 13, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 29, tempMin: 15, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 26, tempMin: 13, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_agra: {
    temp: 21,
    condition: 'Partly Cloudy',
    humidity: 60,
    windSpeed: 8,
    icon: '⛅',
    forecast: [
      { date: '2024-01-15', tempMax: 24, tempMin: 11, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 26, tempMin: 12, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 23, tempMin: 10, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-18', tempMax: 21, tempMin: 9, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-19', tempMax: 25, tempMin: 11, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 27, tempMin: 13, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 24, tempMin: 11, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_bangalore: {
    temp: 28,
    condition: 'Partly Cloudy',
    humidity: 70,
    windSpeed: 10,
    icon: '⛅',
    forecast: [
      { date: '2024-01-15', tempMax: 30, tempMin: 20, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 32, tempMin: 21, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 29, tempMin: 19, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2024-01-18', tempMax: 28, tempMin: 18, condition: 'Rainy', icon: '🌧️' },
      { date: '2024-01-19', tempMax: 31, tempMin: 20, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 32, tempMin: 21, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 30, tempMin: 19, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_chandigarh: {
    temp: 18,
    condition: 'Sunny',
    humidity: 60,
    windSpeed: 12,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 20, tempMin: 8, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 22, tempMin: 9, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 19, tempMin: 7, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-18', tempMax: 17, tempMin: 6, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-19', tempMax: 21, tempMin: 8, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 23, tempMin: 10, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 20, tempMin: 8, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_varanasi: {
    temp: 20,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 8,
    icon: '⛅',
    forecast: [
      { date: '2024-01-15', tempMax: 23, tempMin: 10, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 25, tempMin: 11, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 22, tempMin: 9, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-18', tempMax: 20, tempMin: 8, condition: 'Cloudy', icon: '☁️' },
      { date: '2024-01-19', tempMax: 24, tempMin: 10, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 26, tempMin: 12, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 23, tempMin: 10, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_kolkata: {
    temp: 24,
    condition: 'Sunny',
    humidity: 72,
    windSpeed: 10,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 27, tempMin: 15, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 29, tempMin: 16, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 26, tempMin: 14, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2024-01-18', tempMax: 24, tempMin: 13, condition: 'Rainy', icon: '🌧️' },
      { date: '2024-01-19', tempMax: 28, tempMin: 15, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 29, tempMin: 16, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 27, tempMin: 14, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
  dest_hyderabad: {
    temp: 26,
    condition: 'Sunny',
    humidity: 55,
    windSpeed: 11,
    icon: '☀️',
    forecast: [
      { date: '2024-01-15', tempMax: 29, tempMin: 18, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-16', tempMax: 31, tempMin: 19, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-17', tempMax: 28, tempMin: 17, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2024-01-18', tempMax: 26, tempMin: 16, condition: 'Rainy', icon: '🌧️' },
      { date: '2024-01-19', tempMax: 30, tempMin: 18, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-20', tempMax: 31, tempMin: 19, condition: 'Sunny', icon: '☀️' },
      { date: '2024-01-21', tempMax: 29, tempMin: 17, condition: 'Partly Cloudy', icon: '⛅' },
    ],
  },
};

export class WeatherController {
  static getWeather(req: Request, res: Response): void {
    const { destinationId } = req.params;

    const weather = weatherByDestination[destinationId as string];

    if (!weather) {
      res.status(404).json({
        success: false,
        error: 'Weather data not found for destination',
      });
      return;
    }

    res.json({
      success: true,
      data: weather,
    });
  }

  static getWeatherForecast(req: Request, res: Response): void {
    const { destinationId } = req.params;
    const { days = 7 } = req.query;

    const weather = weatherByDestination[destinationId as string];

    if (!weather) {
      res.status(404).json({
        success: false,
        error: 'Weather data not found for destination',
      });
      return;
    }

    const forecast = weather.forecast?.slice(0, parseInt(days as string)) || [];

    res.json({
      success: true,
      data: {
        current: {
          temp: weather.temp,
          condition: weather.condition,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          icon: weather.icon,
        },
        forecast,
      },
    });
  }

  static getBulkWeather(req: Request, res: Response): void {
    const { destinationIds } = req.body;

    if (!Array.isArray(destinationIds)) {
      res.status(400).json({
        success: false,
        error: 'destinationIds should be an array',
      });
      return;
    }

    const weatherData = destinationIds.map((id: string) => ({
      destinationId: id,
      weather: weatherByDestination[id as string] || null,
    }));

    res.json({
      success: true,
      data: weatherData,
    });
  }
}
