import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TravelApiService, Destination, PlaceSuggestion } from '../../services/travel-api.service';

@Component({
  selector: 'app-search-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="autocomplete-container">
      <label class="search-label" *ngIf="label">{{ label }}</label>
      <div class="search-input-wrapper">
        <input
          #searchInput
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeydown($event)"
          [placeholder]="placeholder"
          class="search-input"
          autocomplete="off"
        />
        <span class="search-icon">🔍</span>
      </div>

      <div *ngIf="showDropdown && suggestions.length > 0" class="dropdown-list">
        <div
          *ngFor="let suggestion of suggestions; let i = index"
          (mousedown)="selectSuggestion(suggestion)"
          class="dropdown-item"
          [class.highlighted]="highlightedIndex === i"
        >
          <div class="item-header">
            <strong>{{ suggestion.name }}</strong>
            <span class="country" *ngIf="!suggestion.aiSuggested">{{ suggestion.country_code }}</span>
            <span class="country ai-badge" *ngIf="suggestion.aiSuggested">✨ AI</span>
          </div>
          <p class="item-description">{{ suggestion.whyMatch || suggestion.description || suggestion.label }}</p>
        </div>
      </div>

      <div
        *ngIf="showDropdown && (isLoading || isResolving || isAiSearching)"
        class="dropdown-loading"
      >
        <span class="spinner"></span>
        {{ isResolving ? 'Loading location…' : isAiSearching ? 'Asking AI…' : 'Searching…' }}
      </div>

      <p *ngIf="showDropdown && sourceNote" class="dropdown-source-note">{{ sourceNote }}</p>

      <div
        *ngIf="showDropdown && !isLoading && !isAiSearching && suggestions.length === 0 && searchQuery"
        class="dropdown-no-results"
      >
        <p>No places found for "{{ searchQuery }}"</p>
        <button type="button" class="btn-ask-ai" (mousedown)="askAi($event)">
          ✨ Ask AI to suggest places for "{{ searchQuery }}"
        </button>
      </div>

      <div *ngIf="showDropdown && suggestions.length > 0 && !isAiSearching" class="dropdown-ask-ai-more">
        <button type="button" class="btn-ask-ai" (mousedown)="askAi($event)">
          ✨ Not finding it? Ask AI
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .autocomplete-container {
        position: relative;
        width: 100%;
      }

      .search-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--travel-ink-soft, #5c6a63);
        margin-bottom: 8px;
      }

      .search-input-wrapper {
        position: relative;
      }

      .search-input {
        width: 100%;
        padding: 14px 18px 14px 44px;
        border: 1.5px solid var(--travel-border, #e7ddc9);
        border-radius: 999px;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        background: var(--travel-white, #fff);
        color: var(--travel-ink, #1c2621);
        transition: all 0.25s ease;
        box-sizing: border-box;
      }

      .search-input::placeholder {
        color: #9aa59d;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--travel-forest, #1f4d3e);
        box-shadow: 0 0 0 4px rgba(31, 77, 62, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--travel-forest, #1f4d3e);
        font-size: 15px;
        opacity: 0.7;
      }

      .dropdown-list {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: var(--travel-white, #fff);
        border: 1px solid var(--travel-border, #e7ddc9);
        border-radius: 20px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 16px 32px rgba(31, 77, 62, 0.14);
      }

      .dropdown-item {
        padding: 14px 18px;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 1px solid var(--travel-cream-soft, #f3ecdf);
      }

      .dropdown-item:first-child {
        border-radius: 20px 20px 0 0;
      }

      .dropdown-item:last-child {
        border-bottom: none;
        border-radius: 0 0 20px 20px;
      }

      .dropdown-item:hover,
      .dropdown-item.highlighted {
        background: var(--travel-cream, #faf5ec);
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .item-header strong {
        font-size: 14px;
        color: var(--travel-ink, #1c2621);
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
      }

      .country {
        background: var(--travel-cream-soft, #f3ecdf);
        color: var(--travel-forest, #1f4d3e);
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }

      .item-description {
        margin: 0;
        font-size: 12px;
        color: var(--travel-ink-soft, #5c6a63);
        line-height: 1.4;
      }

      .dropdown-loading {
        padding: 18px;
        text-align: center;
        color: var(--travel-forest, #1f4d3e);
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid var(--travel-cream-soft, #f3ecdf);
        border-top-color: var(--travel-terracotta, #f2643c);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .dropdown-no-results {
        padding: 18px;
        text-align: center;
        color: var(--travel-ink-soft, #5c6a63);
        font-size: 13px;
      }

      .dropdown-no-results p {
        margin: 0 0 8px 0;
      }

      .dropdown-ask-ai-more {
        padding: 8px 18px;
        border-top: 1px solid var(--travel-cream-soft, #f3ecdf);
        background: var(--travel-cream, #faf5ec);
        border-radius: 0 0 20px 20px;
      }

      .btn-ask-ai {
        background: none;
        border: none;
        color: var(--travel-terracotta, #f2643c);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 0;
      }

      .btn-ask-ai:hover {
        text-decoration: underline;
      }

      .ai-badge {
        background: #fdf1de;
        color: var(--travel-mustard-dark, #b8791f);
      }

      .dropdown-source-note {
        margin: 0;
        padding: 8px 18px;
        font-size: 11px;
        color: #9aa59d;
        background: var(--travel-cream, #faf5ec);
        border-top: 1px solid var(--travel-cream-soft, #f3ecdf);
        border-radius: 0 0 20px 20px;
      }
    `,
  ],
})
export class SearchAutocompleteComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search cities, states, countries...';
  /** Optional field label (e.g. "Starting point" / "Destination") shown above the input. */
  @Input() label = '';
  @Output() suggestionSelected = new EventEmitter<Destination>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  searchQuery = '';
  suggestions: PlaceSuggestion[] = [];
  isLoading = false;
  isResolving = false;
  isAiSearching = false;
  showDropdown = false;
  highlightedIndex = -1;
  sourceNote: string | null = null;

  private searchSubject$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private travelApi: TravelApiService) {}

  ngOnInit() {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.highlightedIndex = -1;
    this.showDropdown = true;

    if (!query.trim()) {
      this.suggestions = [];
      this.showDropdown = false;
      return;
    }

    this.searchSubject$.next(query);
  }

  performSearch(query: string) {
    this.isLoading = true;

    this.travelApi.searchPlaces(query, { limit: 10 }).subscribe({
      next: (response) => {
        this.suggestions = response.data || [];
        this.sourceNote = response.disclaimer ?? null;
        this.isLoading = false;
        this.highlightedIndex = -1;

        if (this.suggestions.length === 0) {
          this.showDropdown = true;
        }
      },
      error: (err) => {
        console.error('Search error:', err);
        this.isLoading = false;
        this.suggestions = [];
      },
    });
  }

  /**
   * Fall back to natural-language (Gemini) search from within the same box —
   * this keeps the app to a single search input instead of a separate AI
   * search UI. Triggered from a link in the dropdown, either when the
   * structured search found nothing or on demand.
   */
  askAi(event: Event) {
    event.preventDefault();
    const q = this.searchQuery.trim();
    if (!q) return;

    this.isAiSearching = true;
    this.showDropdown = true;

    this.travelApi.aiSearchPlaces(q, 6).subscribe({
      next: (res) => {
        const aiResults = (res.data || []).map((place) => ({ ...place, aiSuggested: true }));
        this.suggestions = aiResults;
        this.sourceNote = res.disclaimer ?? null;
        this.isAiSearching = false;
      },
      error: (err) => {
        console.error('AI search failed:', err);
        this.isAiSearching = false;
      },
    });
  }

  selectSuggestion(suggestion: PlaceSuggestion) {
    this.searchQuery = suggestion.name;
    this.suggestions = [];
    this.showDropdown = false;
    this.isResolving = true;

    const coords =
      suggestion.latitude != null && suggestion.longitude != null
        ? { lat: Number(suggestion.latitude), lng: Number(suggestion.longitude) }
        : null;
    this.travelApi.resolvePlace(suggestion.name, suggestion.country_code, suggestion.country, coords).subscribe({
      next: (response) => {
        this.isResolving = false;
        if (response.data) {
          this.suggestionSelected.emit(response.data);
        } else {
          console.error('Could not resolve place:', suggestion, response.error);
        }
      },
      error: (err) => {
        console.error('Failed to resolve place:', err);
        this.isResolving = false;
      },
    });
  }

  onFocus() {
    if (this.searchQuery.trim()) {
      this.showDropdown = true;
    }
  }

  /** Arrow keys move the highlighted suggestion, Enter selects it, Escape closes the dropdown. */
  onKeydown(event: KeyboardEvent) {
    if (!this.showDropdown || !this.suggestions.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        break;
      case 'Enter':
        if (this.highlightedIndex >= 0) {
          event.preventDefault();
          this.selectSuggestion(this.suggestions[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        this.showDropdown = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }
}
