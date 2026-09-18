import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, Location } from './travel-api.service';

export type VehicleType = 'car' | 'bike' | 'bus' | 'train' | 'flight';

export interface WeatherOutlookDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
  precipitationMm: number;
  windSpeedMaxKmh: number;
}

export interface WeatherOutlook {
  source: 'forecast' | 'historical-estimate';
  days: WeatherOutlookDay[];
}

export interface ItineraryStop extends Location {
  visitMinutes: number;
}

export interface ItineraryDayPlan {
  dayNumber: number;
  stops: ItineraryStop[];
  estimatedMinutes: number;
  touristSiteCount: number;
  hiddenGemCount: number;
}

export interface ItinerarySuggestion {
  data: ItineraryDayPlan[];
  minDaysRequired: number;
  requestedDays: number;
  uncoveredCount: number;
  note: string;
}

export interface TrainOption {
  id: string;
  operator: string;
  trainNumber: string;
  departureTime: string;
  durationHours: number;
  classOptions: string[];
  fareEstimateUsd: number;
  seatsAvailable: number;
}

export interface BusOption {
  id: string;
  operator: string;
  departureTime: string;
  durationHours: number;
  busType: string;
  fareEstimateUsd: number;
  seatsAvailable: number;
}

export interface TransportOptions {
  trains: TrainOption[];
  buses: BusOption[];
  disclaimer: string;
}

export interface RoadConditions {
  trafficLevel: 'light' | 'moderate' | 'heavy';
  note: string;
  disclaimer: string;
}

export interface PackingList {
  common: string[];
  men: string[];
  women: string[];
  tripDays: number;
  avgMaxTempC: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string | null;
  publishedAt: string | null;
  source: string;
}

export interface DestinationNews {
  source: 'gnews' | 'mock';
  disclaimer: string;
  articles: NewsArticle[];
}

export interface BudgetEstimate {
  currency: string;
  days: number;
  travelers: number;
  dailyBudgetPerPersonUsd: number;
  breakdown: {
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
    misc: number;
  };
  transportNote: string;
  total: number;
  contingencyBuffer: number;
  recommendedCash: number;
  disclaimer: string;
}

@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getWeatherOutlook(destinationId: string, startDate: string, endDate: string): Observable<ApiResponse<WeatherOutlook>> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<ApiResponse<WeatherOutlook>>(
      `${this.apiUrl}/destinations/${destinationId}/weather-outlook`,
      { params },
    );
  }

  getItinerarySuggestion(destinationId: string, days: number): Observable<ItinerarySuggestion> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ItinerarySuggestion>(
      `${this.apiUrl}/destinations/${destinationId}/itinerary-suggestion`,
      { params },
    );
  }

  getTransportOptions(destinationId: string, date: string): Observable<ApiResponse<TransportOptions>> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<TransportOptions>>(
      `${this.apiUrl}/destinations/${destinationId}/transport`,
      { params },
    );
  }

  getRoadConditions(destLat: number, destLng: number, date: string): Observable<ApiResponse<RoadConditions>> {
    const params = new HttpParams()
      .set('destLat', destLat.toString())
      .set('destLng', destLng.toString())
      .set('date', date);
    return this.http.get<ApiResponse<RoadConditions>>(`${this.apiUrl}/routes/road-conditions`, { params });
  }

  getPackingList(
    destinationId: string,
    startDate: string,
    endDate: string,
    days: number,
  ): Observable<ApiResponse<PackingList>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('days', days.toString());
    return this.http.get<ApiResponse<PackingList>>(
      `${this.apiUrl}/destinations/${destinationId}/packing-list`,
      { params },
    );
  }

  getNews(query: string): Observable<ApiResponse<DestinationNews>> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ApiResponse<DestinationNews>>(`${this.apiUrl}/news`, { params });
  }

  getBudgetEstimate(
    destinationId: string,
    days: number,
    travelers: number,
    vehicleType?: VehicleType,
    distanceKm?: number,
  ): Observable<ApiResponse<BudgetEstimate>> {
    let params = new HttpParams()
      .set('destinationId', destinationId)
      .set('days', days.toString())
      .set('travelers', travelers.toString());
    if (vehicleType) params = params.set('vehicleType', vehicleType);
    if (distanceKm) params = params.set('distanceKm', distanceKm.toString());

    return this.http.get<ApiResponse<BudgetEstimate>>(`${this.apiUrl}/budget-estimate`, { params });
  }
}
