import { Component, Input, OnChanges, SimpleChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Destination } from '../../services/travel-api.service';
import {
  PlannerApiService,
  VehicleType,
  WeatherOutlook,
  ItinerarySuggestion,
  TransportOptions,
  PackingList,
  DestinationNews,
  BudgetEstimate,
  RoadConditions,
} from '../../services/planner-api.service';

type TabId = 'weather' | 'itinerary' | 'transport' | 'news' | 'packing' | 'route' | 'budget';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'weather', label: 'Weather & Vehicle', icon: '🌦️' },
  { id: 'itinerary', label: 'Itinerary', icon: '🗓️' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'packing', label: 'Packing', icon: '🎒' },
  { id: 'route', label: 'Route & Roads', icon: '🛣️' },
  { id: 'budget', label: 'Budget', icon: '💰' },
];

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function tripDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

@Component({
  selector: 'app-trip-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trip-planner">
      <div class="tab-bar">
        <button
          *ngFor="let tab of tabs"
          class="tab-button"
          [class.active]="activeTab() === tab.id"
          (click)="selectTab(tab.id)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- ============ WEATHER & VEHICLE ============ -->
        <section *ngIf="activeTab() === 'weather'" class="tab-panel">
          <div class="controls-row">
            <label class="field">
              Start date
              <input type="date" [(ngModel)]="startDate" [min]="todayStr" (change)="onDatesChanged()" />
            </label>
            <label class="field">
              End date
              <input type="date" [(ngModel)]="endDate" [min]="startDate" (change)="onDatesChanged()" />
            </label>
            <label class="field">
              Vehicle
              <select [(ngModel)]="vehicleType" (change)="onVehicleChanged()">
                <option value="car">🚗 Car</option>
                <option value="bike">🏍️ Bike</option>
                <option value="bus">🚌 Bus</option>
                <option value="train">🚆 Train</option>
                <option value="flight">✈️ Flight</option>
              </select>
            </label>
            <label class="field">
              Distance to destination (km, one-way)
              <input type="number" min="0" [(ngModel)]="distanceKm" (change)="onDistanceChanged()" placeholder="e.g. 250" />
            </label>
            <label class="field">
              Travelers
              <input type="number" min="1" [(ngModel)]="travelers" (change)="onTravelersChanged()" />
            </label>
          </div>
          <p class="trip-length">Trip length: <strong>{{ tripDays() }} day(s)</strong></p>

          <div *ngIf="weatherLoading()" class="loading-row">Loading weather…</div>
          <p *ngIf="weatherError()" class="error-text">{{ weatherError() }}</p>

          <div *ngIf="weatherOutlook() as outlook">
            <p class="source-note" *ngIf="outlook.source === 'historical-estimate'">
              📅 These dates are beyond the live forecast window — showing typical conditions from the same dates last year.
            </p>
            <div class="weather-days">
              <div class="weather-day-card" *ngFor="let day of outlook.days">
                <div class="wd-date">{{ day.date | date: 'EEE, MMM d' }}</div>
                <div class="wd-icon">{{ day.icon }}</div>
                <div class="wd-temp">{{ day.tempMax }}° / {{ day.tempMin }}°C</div>
                <div class="wd-condition">{{ day.condition }}</div>
                <div class="wd-extra">💧 {{ day.precipitationMm }}mm · 💨 {{ day.windSpeedMaxKmh }} km/h</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ ITINERARY ============ -->
        <section *ngIf="activeTab() === 'itinerary'" class="tab-panel">
          <div class="controls-row">
            <label class="field">
              Days to plan
              <input type="number" min="1" [(ngModel)]="itineraryDays" (change)="loadItinerary()" />
            </label>
            <button class="btn-refresh" (click)="loadItinerary()">Recalculate</button>
          </div>

          <div *ngIf="itineraryLoading()" class="loading-row">Building itinerary…</div>
          <p *ngIf="itineraryError()" class="error-text">{{ itineraryError() }}</p>

          <div *ngIf="itinerarySuggestion() as suggestion">
            <p class="min-days-note">
              📌 Recommended minimum: <strong>{{ suggestion.minDaysRequired }} day(s)</strong> to comfortably
              cover the top spots. {{ suggestion.note }}
            </p>

            <div class="itinerary-day" *ngFor="let day of suggestion.data">
              <h4>Day {{ day.dayNumber }}</h4>
              <div class="itinerary-stop" *ngFor="let stop of day.stops">
                <span class="stop-icon">{{ stopIcon(stop.type) }}</span>
                <div class="stop-details">
                  <div class="stop-name">{{ stop.name }}</div>
                  <div class="stop-meta">
                    ⭐ {{ stop.rating }}/5 · {{ stop.visitMinutes }} min · {{ typeLabel(stop.type) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ TRANSPORT ============ -->
        <section *ngIf="activeTab() === 'transport'" class="tab-panel">
          <div *ngIf="transportLoading()" class="loading-row">Loading transport options…</div>
          <p *ngIf="transportError()" class="error-text">{{ transportError() }}</p>

          <div *ngIf="transportOptions() as transport">
            <p class="disclaimer">⚠️ {{ transport.disclaimer }}</p>

            <h4>🚆 Trains</h4>
            <table class="data-table">
              <thead>
                <tr><th>Operator</th><th>No.</th><th>Departs</th><th>Duration</th><th>Fare (approx.)</th><th>Seats</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let train of transport.trains">
                  <td>{{ train.operator }}</td>
                  <td>{{ train.trainNumber }}</td>
                  <td>{{ train.departureTime }}</td>
                  <td>{{ train.durationHours }}h</td>
                  <td>{{ train.fareEstimate | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</td>
                  <td>{{ train.seatsAvailable }}</td>
                </tr>
              </tbody>
            </table>

            <h4>🚌 Buses</h4>
            <table class="data-table">
              <thead>
                <tr><th>Operator</th><th>Type</th><th>Departs</th><th>Duration</th><th>Fare (approx.)</th><th>Seats</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let bus of transport.buses">
                  <td>{{ bus.operator }}</td>
                  <td>{{ bus.busType }}</td>
                  <td>{{ bus.departureTime }}</td>
                  <td>{{ bus.durationHours }}h</td>
                  <td>{{ bus.fareEstimate | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</td>
                  <td>{{ bus.seatsAvailable }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ============ NEWS ============ -->
        <section *ngIf="activeTab() === 'news'" class="tab-panel">
          <div *ngIf="newsLoading()" class="loading-row">Loading news…</div>
          <p *ngIf="newsError()" class="error-text">{{ newsError() }}</p>

          <div *ngIf="news() as newsData">
            <p class="disclaimer">ℹ️ {{ newsData.disclaimer }}</p>
            <div class="news-article" *ngFor="let article of newsData.articles">
              <h4>
                <a *ngIf="article.url" [href]="article.url" target="_blank" rel="noopener">{{ article.title }}</a>
                <span *ngIf="!article.url">{{ article.title }}</span>
              </h4>
              <p>{{ article.description }}</p>
              <span class="news-source">{{ article.source }}</span>
            </div>
          </div>
        </section>

        <!-- ============ PACKING ============ -->
        <section *ngIf="activeTab() === 'packing'" class="tab-panel">
          <div *ngIf="packingLoading()" class="loading-row">Building packing list…</div>
          <p *ngIf="packingError()" class="error-text">{{ packingError() }}</p>

          <div *ngIf="packingList() as packing" class="packing-grid">
            <div class="packing-column">
              <h4>🧳 Common (everyone)</h4>
              <ul><li *ngFor="let item of packing.common">{{ item }}</li></ul>
            </div>
            <div class="packing-column">
              <h4>👔 Men</h4>
              <ul><li *ngFor="let item of packing.men">{{ item }}</li></ul>
            </div>
            <div class="packing-column">
              <h4>👗 Women</h4>
              <ul><li *ngFor="let item of packing.women">{{ item }}</li></ul>
            </div>
          </div>
        </section>

        <!-- ============ ROUTE & ROADS ============ -->
        <section *ngIf="activeTab() === 'route'" class="tab-panel">
          <div *ngIf="routeLoading()" class="loading-row">Checking route &amp; road conditions…</div>
          <p *ngIf="routeError()" class="error-text">{{ routeError() }}</p>

          <div *ngIf="routeInfo() as route">
            <div class="route-summary">
              🚗 Approx. <strong>{{ route.distanceKm }} km</strong> · <strong>{{ route.durationMin }} min</strong> to the first itinerary stop
            </div>
          </div>

          <div *ngIf="roadConditions() as conditions" class="road-conditions" [class]="'traffic-' + conditions.trafficLevel">
            <strong>Traffic: {{ conditions.trafficLevel | titlecase }}</strong>
            <p>{{ conditions.note }}</p>
            <p class="disclaimer">⚠️ {{ conditions.disclaimer }}</p>
          </div>
        </section>

        <!-- ============ BUDGET ============ -->
        <section *ngIf="activeTab() === 'budget'" class="tab-panel">
          <div *ngIf="budgetLoading()" class="loading-row">Calculating budget…</div>
          <p *ngIf="budgetError()" class="error-text">{{ budgetError() }}</p>

          <div *ngIf="budget() as b">
            <p class="disclaimer">⚠️ {{ b.disclaimer }}</p>
            <div class="budget-rows">
              <div class="budget-row"><span>🏨 Accommodation</span><span>{{ b.breakdown.accommodation | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row"><span>🍽️ Food</span><span>{{ b.breakdown.food | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row"><span>🎟️ Activities</span><span>{{ b.breakdown.activities | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row"><span>⛽ Transport / Fuel</span><span>{{ b.breakdown.transport | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row"><span>🧾 Miscellaneous</span><span>{{ b.breakdown.misc | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row total"><span>Total (estimated)</span><span>{{ b.total | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row buffer"><span>+ 15% contingency</span><span>{{ b.contingencyBuffer | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
              <div class="budget-row cash"><span>💵 Recommended cash to carry</span><span>{{ b.recommendedCash | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span></div>
            </div>
            <p class="transport-note">{{ b.transportNote }}</p>
            <p class="transport-note">
              Converted at ₹{{ b.usdRate | number: '1.2-2' }} per USD
              <span *ngIf="b.rateSource === 'frankfurter' && b.rateDate">(ECB reference rate, {{ b.rateDate }})</span>
              <span *ngIf="b.rateSource === 'fallback'">(approximate — live rate unavailable)</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .trip-planner {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        margin-top: 20px;
      }

      .tab-bar {
        display: flex;
        flex-wrap: wrap;
        border-bottom: 1px solid #eee;
        background: #f9f9ff;
      }

      .tab-button {
        flex: 1 1 auto;
        min-width: 120px;
        padding: 12px 10px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: #666;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .tab-button:hover {
        background: #f0f0fa;
        color: #333;
      }

      .tab-button.active {
        color: #667eea;
        border-bottom-color: #667eea;
        background: white;
      }

      .tab-icon {
        margin-right: 4px;
      }

      .tab-content {
        padding: 20px;
        max-height: 600px;
        overflow-y: auto;
      }

      .controls-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 16px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .field input,
      .field select {
        padding: 8px 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }

      .btn-refresh {
        align-self: flex-end;
        padding: 8px 16px;
        border: 1px solid #667eea;
        background: white;
        color: #667eea;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        height: 38px;
      }

      .btn-refresh:hover {
        background: #667eea;
        color: white;
      }

      .trip-length {
        font-size: 13px;
        color: #555;
        margin: 0 0 12px 0;
      }

      .loading-row {
        padding: 16px;
        color: #667eea;
        text-align: center;
        font-size: 14px;
      }

      .error-text {
        color: #c62828;
        font-size: 13px;
      }

      .source-note,
      .disclaimer,
      .min-days-note,
      .transport-note {
        font-size: 12px;
        color: #666;
        background: #f5f5fa;
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 12px;
      }

      .weather-days {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .weather-day-card {
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 12px;
        min-width: 120px;
        text-align: center;
        flex: 1 1 120px;
      }

      .wd-date {
        font-size: 12px;
        color: #999;
        margin-bottom: 4px;
      }

      .wd-icon {
        font-size: 28px;
      }

      .wd-temp {
        font-weight: 600;
        font-size: 15px;
        margin: 4px 0;
      }

      .wd-condition {
        font-size: 12px;
        color: #555;
      }

      .wd-extra {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
      }

      .itinerary-day {
        margin-bottom: 20px;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 12px 16px;
      }

      .itinerary-day h4 {
        margin: 0 0 10px 0;
        color: #667eea;
      }

      .itinerary-stop {
        display: flex;
        gap: 10px;
        padding: 8px 0;
        border-top: 1px solid #f5f5f5;
      }

      .itinerary-stop:first-of-type {
        border-top: none;
      }

      .stop-icon {
        font-size: 20px;
      }

      .stop-name {
        font-weight: 500;
        font-size: 14px;
      }

      .stop-meta {
        font-size: 12px;
        color: #999;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 13px;
      }

      .data-table th,
      .data-table td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #f0f0f0;
      }

      .data-table th {
        color: #999;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
      }

      .news-article {
        border-bottom: 1px solid #f0f0f0;
        padding: 12px 0;
      }

      .news-article h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
      }

      .news-article p {
        margin: 0 0 4px 0;
        font-size: 13px;
        color: #555;
      }

      .news-source {
        font-size: 11px;
        color: #999;
      }

      .packing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .packing-column h4 {
        margin: 0 0 10px 0;
        color: #667eea;
      }

      .packing-column ul {
        margin: 0;
        padding-left: 18px;
        font-size: 13px;
        color: #444;
        line-height: 1.8;
      }

      .route-summary {
        font-size: 15px;
        margin-bottom: 16px;
      }

      .road-conditions {
        padding: 14px;
        border-radius: 8px;
        border-left: 4px solid #999;
      }

      .road-conditions.traffic-light {
        background: #eaf6ea;
        border-left-color: #2e7d32;
      }

      .road-conditions.traffic-moderate {
        background: #fff8e1;
        border-left-color: #f9a825;
      }

      .road-conditions.traffic-heavy {
        background: #fdecea;
        border-left-color: #c62828;
      }

      .budget-rows {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .budget-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 12px;
        font-size: 14px;
        border-bottom: 1px solid #f5f5f5;
      }

      .budget-row.total {
        font-weight: 600;
        border-top: 2px solid #eee;
        margin-top: 6px;
      }

      .budget-row.cash {
        background: #f0f4ff;
        border-radius: 6px;
        font-weight: 600;
        color: #667eea;
      }
    `,
  ],
})
export class TripPlannerComponent implements OnChanges {
  @Input({ required: true }) destination!: Destination;

  tabs = TABS;
  activeTab = signal<TabId>('weather');

  todayStr = toDateInputValue(new Date());
  startDate = toDateInputValue(addDays(new Date(), 7));
  endDate = toDateInputValue(addDays(new Date(), 10));
  vehicleType: VehicleType = 'car';
  distanceKm: number | null = null;
  travelers = 2;
  itineraryDays = 3;

  tripDays = computed(() => tripDaysBetween(this.startDate, this.endDate));

  weatherOutlook = signal<WeatherOutlook | null>(null);
  weatherLoading = signal(false);
  weatherError = signal<string | null>(null);

  itinerarySuggestion = signal<ItinerarySuggestion | null>(null);
  itineraryLoading = signal(false);
  itineraryError = signal<string | null>(null);

  transportOptions = signal<TransportOptions | null>(null);
  transportLoading = signal(false);
  transportError = signal<string | null>(null);

  news = signal<DestinationNews | null>(null);
  newsLoading = signal(false);
  newsError = signal<string | null>(null);

  packingList = signal<PackingList | null>(null);
  packingLoading = signal(false);
  packingError = signal<string | null>(null);

  routeInfo = signal<{ distanceKm: number; durationMin: number } | null>(null);
  roadConditions = signal<RoadConditions | null>(null);
  routeLoading = signal(false);
  routeError = signal<string | null>(null);

  budget = signal<BudgetEstimate | null>(null);
  budgetLoading = signal(false);
  budgetError = signal<string | null>(null);

  private loadedTabs = new Set<TabId>();

  constructor(private planner: PlannerApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['destination']) {
      this.loadedTabs.clear();
      this.itineraryDays = this.tripDays();
      this.loadActiveTab();
    }
  }

  selectTab(tab: TabId) {
    this.activeTab.set(tab);
    this.loadActiveTab();
  }

  onDatesChanged() {
    this.itineraryDays = this.tripDays();
    this.loadedTabs.delete('weather');
    this.loadedTabs.delete('packing');
    this.loadActiveTab();
  }

  onVehicleChanged() {
    this.loadedTabs.delete('budget');
    if (this.activeTab() === 'budget') this.loadActiveTab();
  }

  onDistanceChanged() {
    this.loadedTabs.delete('budget');
    if (this.activeTab() === 'budget') this.loadActiveTab();
  }

  onTravelersChanged() {
    this.loadedTabs.delete('budget');
    if (this.activeTab() === 'budget') this.loadActiveTab();
  }

  stopIcon(type: string): string {
    const icons: Record<string, string> = {
      restaurant: '🍽️',
      tourist_site: '🏛️',
      attraction: '🎪',
      hidden_gem: '💎',
    };
    return icons[type] || '📍';
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      restaurant: 'Restaurant',
      tourist_site: 'Tourist Site',
      attraction: 'Attraction',
      hidden_gem: 'Hidden Gem',
    };
    return labels[type] || type;
  }

  private loadActiveTab() {
    if (!this.destination || this.loadedTabs.has(this.activeTab())) return;

    switch (this.activeTab()) {
      case 'weather':
        this.loadWeather();
        break;
      case 'itinerary':
        this.loadItinerary();
        break;
      case 'transport':
        this.loadTransport();
        break;
      case 'news':
        this.loadNews();
        break;
      case 'packing':
        this.loadPacking();
        break;
      case 'route':
        this.loadRoute();
        break;
      case 'budget':
        this.loadBudget();
        break;
    }
  }

  loadWeather() {
    this.weatherLoading.set(true);
    this.weatherError.set(null);
    this.planner.getWeatherOutlook(this.destination.id, this.startDate, this.endDate).subscribe({
      next: (res) => {
        this.weatherOutlook.set(res.data ?? null);
        this.weatherLoading.set(false);
        this.loadedTabs.add('weather');
      },
      error: (err) => {
        console.error('Weather outlook failed:', err);
        this.weatherError.set('Could not load weather right now. Please try again.');
        this.weatherLoading.set(false);
      },
    });
  }

  loadItinerary() {
    this.itineraryLoading.set(true);
    this.itineraryError.set(null);
    this.planner.getItinerarySuggestion(this.destination.id, this.itineraryDays).subscribe({
      next: (res) => {
        this.itinerarySuggestion.set(res);
        this.itineraryLoading.set(false);
        this.loadedTabs.add('itinerary');
      },
      error: (err) => {
        console.error('Itinerary suggestion failed:', err);
        this.itineraryError.set('Could not build an itinerary right now. Please try again.');
        this.itineraryLoading.set(false);
      },
    });
  }

  loadTransport() {
    this.transportLoading.set(true);
    this.transportError.set(null);
    this.planner.getTransportOptions(this.destination.id, this.startDate).subscribe({
      next: (res) => {
        this.transportOptions.set(res.data ?? null);
        this.transportLoading.set(false);
        this.loadedTabs.add('transport');
      },
      error: (err) => {
        console.error('Transport options failed:', err);
        this.transportError.set('Could not load transport options right now. Please try again.');
        this.transportLoading.set(false);
      },
    });
  }

  loadNews() {
    this.newsLoading.set(true);
    this.newsError.set(null);
    this.planner.getNews(this.destination.name).subscribe({
      next: (res) => {
        this.news.set(res.data ?? null);
        this.newsLoading.set(false);
        this.loadedTabs.add('news');
      },
      error: (err) => {
        console.error('News fetch failed:', err);
        this.newsError.set('Could not load news right now. Please try again.');
        this.newsLoading.set(false);
      },
    });
  }

  loadPacking() {
    this.packingLoading.set(true);
    this.packingError.set(null);
    this.planner
      .getPackingList(this.destination.id, this.startDate, this.endDate, this.tripDays())
      .subscribe({
        next: (res) => {
          this.packingList.set(res.data ?? null);
          this.packingLoading.set(false);
          this.loadedTabs.add('packing');
        },
        error: (err) => {
          console.error('Packing list failed:', err);
          this.packingError.set('Could not build a packing list right now. Please try again.');
          this.packingLoading.set(false);
        },
      });
  }

  async loadRoute() {
    this.routeLoading.set(true);
    this.routeError.set(null);

    try {
      // Use the first itinerary stop (falling back to the itinerary tab's
      // own fetch) as the destination point for a representative route.
      let firstStop = this.itinerarySuggestion()?.data?.[0]?.stops?.[0];
      if (!firstStop) {
        const suggestion = await new Promise<ItinerarySuggestion | null>((resolve) => {
          this.planner.getItinerarySuggestion(this.destination.id, this.itineraryDays).subscribe({
            next: (res) => resolve(res),
            error: () => resolve(null),
          });
        });
        firstStop = suggestion?.data?.[0]?.stops?.[0];
      }

      if (firstStop) {
        const url =
          `${OSRM_ROUTE_URL}/${this.destination.lng},${this.destination.lat};${firstStop.lng},${firstStop.lat}` +
          `?overview=false`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const route = data.routes?.[0];
          if (route) {
            this.routeInfo.set({
              distanceKm: Math.round((route.distance / 1000) * 10) / 10,
              durationMin: Math.round(route.duration / 60),
            });
          }
        }
      }

      this.planner.getRoadConditions(this.destination.lat, this.destination.lng, this.startDate).subscribe({
        next: (res) => {
          this.roadConditions.set(res.data ?? null);
          this.routeLoading.set(false);
          this.loadedTabs.add('route');
        },
        error: (err) => {
          console.error('Road conditions failed:', err);
          this.routeError.set('Could not load road conditions right now.');
          this.routeLoading.set(false);
        },
      });
    } catch (error) {
      console.error('Route lookup failed:', error);
      this.routeError.set('Could not load route information right now.');
      this.routeLoading.set(false);
    }
  }

  loadBudget() {
    this.budgetLoading.set(true);
    this.budgetError.set(null);
    this.planner
      .getBudgetEstimate(
        this.destination.id,
        this.tripDays(),
        this.travelers,
        this.vehicleType,
        this.distanceKm ?? undefined,
      )
      .subscribe({
        next: (res) => {
          this.budget.set(res.data ?? null);
          this.budgetLoading.set(false);
          this.loadedTabs.add('budget');
        },
        error: (err) => {
          console.error('Budget estimate failed:', err);
          this.budgetError.set('Could not calculate a budget right now. Please try again.');
          this.budgetLoading.set(false);
        },
      });
  }
}
