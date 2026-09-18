import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TravelApiService, PlaceSuggestion } from '../../features/travel/services/travel-api.service';

/**
 * Natural-language place search backed by Gemini (see
 * backend/src/data/geminiSearch.js), for free-form queries like "quiet beach
 * towns in Kerala" that the structured country/state/city picker can't
 * answer. This is a separate, explicit mode from that picker rather than a
 * replacement for it — the offline dataset stays the fast, free default.
 */
@Component({
  selector: 'app-ai-place-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-search">
      <form class="ai-search-form" (ngSubmit)="search()">
        <input
          type="text"
          [(ngModel)]="query"
          name="aiQuery"
          placeholder="e.g. quiet beach towns in Kerala"
          autocomplete="off"
        />
        <button type="submit" [disabled]="loading || !query.trim()">
          {{ loading ? 'Asking…' : '✨ Ask AI' }}
        </button>
      </form>

      <p class="ai-hint" *ngIf="disclaimer">{{ disclaimer }}</p>
      <p class="ai-error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <ul class="ai-results" *ngIf="results.length">
        <li *ngFor="let place of results" (click)="pick(place)">
          <div class="ai-result-header">
            <strong>{{ place.name }}</strong>
            <span class="ai-result-country">{{ place.country || place.country_code }}</span>
          </div>
          <p class="ai-result-why" *ngIf="place.whyMatch">{{ place.whyMatch }}</p>
          <p class="ai-result-desc" *ngIf="place.description">{{ place.description }}</p>
        </li>
      </ul>

      <p class="ai-empty" *ngIf="searched && !loading && !results.length && !disclaimer && !errorMessage">
        No matches found — try rephrasing your search.
      </p>
    </div>
  `,
  styles: [
    `
      .ai-search {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ai-search-form {
        display: flex;
        gap: 8px;
      }
      .ai-search-form input {
        flex: 1;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
      }
      .ai-search-form input:focus {
        outline: none;
        border-color: #667eea;
      }
      .ai-search-form button {
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        background: #667eea;
        color: white;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
      }
      .ai-search-form button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .ai-hint {
        margin: 0;
        font-size: 12px;
        color: #999;
      }
      .ai-error {
        margin: 0;
        font-size: 12px;
        color: #d9534f;
      }
      .ai-empty {
        margin: 0;
        font-size: 13px;
        color: #999;
      }
      .ai-results {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
      }
      .ai-results li {
        padding: 10px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ai-results li:hover {
        border-color: #667eea;
        background: #f9f9ff;
      }
      .ai-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .ai-result-header strong {
        font-size: 14px;
        color: #333;
      }
      .ai-result-country {
        font-size: 11px;
        color: #667eea;
        background: #e8eef7;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .ai-result-why {
        margin: 0 0 4px 0;
        font-size: 12px;
        color: #667eea;
        font-weight: 500;
      }
      .ai-result-desc {
        margin: 0;
        font-size: 12px;
        color: #777;
        line-height: 1.4;
      }
    `,
  ],
})
export class AiPlaceSearchComponent {
  @Output() placeSelected = new EventEmitter<PlaceSuggestion>();

  query = '';
  results: PlaceSuggestion[] = [];
  loading = false;
  searched = false;
  disclaimer: string | null = null;
  errorMessage: string | null = null;

  constructor(private travelApi: TravelApiService) {}

  search() {
    const q = this.query.trim();
    if (!q) return;

    this.loading = true;
    this.searched = true;
    this.disclaimer = null;
    this.errorMessage = null;

    this.travelApi.aiSearchPlaces(q, 6).subscribe({
      next: (res) => {
        this.results = res.data || [];
        this.disclaimer = res.disclaimer ?? null;
        this.loading = false;
      },
      error: (err) => {
        console.error('AI place search failed:', err);
        this.results = [];
        this.errorMessage = 'AI search failed. Please try again.';
        this.loading = false;
      },
    });
  }

  pick(place: PlaceSuggestion) {
    this.placeSelected.emit(place);
  }
}
