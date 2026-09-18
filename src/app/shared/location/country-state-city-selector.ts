import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { TravelApiService, PlaceSuggestion } from '../../features/travel/services/travel-api.service';

type ComboboxKey = 'country' | 'state' | 'city';

export interface LocationSelection {
  country: PlaceSuggestion | null;
  state: PlaceSuggestion | null;
  city: PlaceSuggestion | null;
}

/**
 * Cascading Country -> State -> City picker backed by the offline
 * country-state-city dataset (see backend/src/data/citySearch.js).
 *
 * Each field is a searchable combobox: typing filters the list (debounced,
 * server-side) instead of loading the full dataset into the DOM, which
 * matters for city lists that can run into the thousands (India alone has
 * 4000+ cities). Selecting a country loads/filters its states; selecting a
 * state (or country, if a country has no states/state chosen) loads/filters
 * its cities.
 */
@Component({
  selector: 'app-country-state-city-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="csc-selector">
      <div class="csc-field">
        <label>Country</label>
        <div class="csc-combobox">
          <input
            type="text"
            formControlName="countryQuery"
            placeholder="Search country..."
            autocomplete="off"
            (focus)="countryOpen = true"
            (blur)="closeSoon('country')"
            (keydown)="onKeydown($event, 'country')"
          />
          <ul class="csc-options" *ngIf="countryOpen && countryOptions.length">
            <li
              *ngFor="let c of countryOptions; let i = index"
              [class.active]="highlightedIndex.country === i"
              (mousedown)="pickCountry(c)"
            >
              <span *ngIf="c.flag as flag">{{ flag }}</span> {{ c.name }}
            </li>
          </ul>
          <p class="csc-hint" *ngIf="countryOpen && countryLoading">Searching…</p>
        </div>
      </div>

      <div class="csc-field" *ngIf="selected.country">
        <label>State / Province {{ stateRequired ? '' : '(optional)' }}</label>
        <div class="csc-combobox">
          <input
            type="text"
            formControlName="stateQuery"
            placeholder="Search state..."
            autocomplete="off"
            [disabled]="!selected.country"
            (focus)="stateOpen = true"
            (blur)="closeSoon('state')"
            (keydown)="onKeydown($event, 'state')"
          />
          <ul class="csc-options" *ngIf="stateOpen && stateOptions.length">
            <li
              *ngFor="let s of stateOptions; let i = index"
              [class.active]="highlightedIndex.state === i"
              (mousedown)="pickState(s)"
            >
              {{ s.name }}
            </li>
          </ul>
          <p class="csc-hint" *ngIf="stateOpen && stateLoading">Searching…</p>
          <p class="csc-hint" *ngIf="stateOpen && !stateLoading && !stateOptions.length && form.value.stateQuery">
            No matching states — this country may not use states.
          </p>
        </div>
      </div>

      <div class="csc-field" *ngIf="selected.country">
        <label>City</label>
        <div class="csc-combobox">
          <input
            type="text"
            formControlName="cityQuery"
            placeholder="Search city..."
            autocomplete="off"
            (focus)="cityOpen = true"
            (blur)="closeSoon('city')"
            (keydown)="onKeydown($event, 'city')"
          />
          <ul class="csc-options" *ngIf="cityOpen && cityOptions.length">
            <li
              *ngFor="let city of cityOptions; let i = index"
              [class.active]="highlightedIndex.city === i"
              (mousedown)="pickCity(city)"
            >
              {{ city.label || city.name }}
            </li>
          </ul>
          <p class="csc-hint" *ngIf="cityOpen && cityLoading">Searching…</p>
          <p class="csc-hint" *ngIf="cityOpen && !cityLoading && !cityOptions.length && form.value.cityQuery">
            No matching cities.
          </p>
        </div>
      </div>

      <p class="csc-error" *ngIf="showValidationError">
        Please select {{ !selected.country ? 'a country' : !selected.city ? 'a city' : '' }}.
      </p>
    </form>
  `,
  styles: [
    `
      .csc-selector {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .csc-field label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #333;
        margin-bottom: 6px;
      }
      .csc-combobox {
        position: relative;
      }
      .csc-combobox input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
      }
      .csc-combobox input:focus {
        outline: none;
        border-color: #667eea;
      }
      .csc-options {
        position: absolute;
        z-index: 20;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        max-height: 260px;
        overflow-y: auto;
        margin: 0;
        padding: 4px;
        list-style: none;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
      .csc-options li {
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .csc-options li:hover,
      .csc-options li.active {
        background: #f0f4ff;
      }
      .csc-hint {
        margin: 6px 0 0 0;
        font-size: 12px;
        color: #999;
      }
      .csc-error {
        margin: 0;
        font-size: 12px;
        color: #d9534f;
      }
    `,
  ],
})
export class CountryStateCitySelectorComponent implements OnInit, OnDestroy {
  /** Require a state to be picked before considering the selection valid (most countries have states; set false to allow country+city only). */
  @Input() stateRequired = false;
  /** Whether the parent has attempted a submit — shows validation messaging. */
  @Input() submitted = false;
  /** Default ISO2 country code to preselect (e.g. 'IN' for India). */
  @Input() defaultCountryCode: string | null = null;

  @Output() selectionChange = new EventEmitter<LocationSelection>();

  form: FormGroup;
  selected: LocationSelection = { country: null, state: null, city: null };

  countryOptions: PlaceSuggestion[] = [];
  stateOptions: PlaceSuggestion[] = [];
  cityOptions: PlaceSuggestion[] = [];

  countryOpen = false;
  stateOpen = false;
  cityOpen = false;

  countryLoading = false;
  stateLoading = false;
  cityLoading = false;

  /** Keyboard-highlighted option index per combobox (-1 = none highlighted). */
  highlightedIndex: Record<ComboboxKey, number> = { country: -1, state: -1, city: -1 };

  private destroy$ = new Subject<void>();
  private countryQuery$ = new Subject<string>();
  private stateQuery$ = new Subject<string>();
  private cityQuery$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private travelApi: TravelApiService,
  ) {
    this.form = this.fb.group({
      countryQuery: [''],
      stateQuery: [{ value: '', disabled: true }],
      cityQuery: [{ value: '', disabled: true }],
    });
  }

  get showValidationError(): boolean {
    return this.submitted && (!this.selected.country || !this.selected.city);
  }

  ngOnInit() {
    this.countryQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          this.countryLoading = true;
          return this.travelApi.getCountries(q);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.countryOptions = res.data || [];
          this.countryLoading = false;
          this.highlightedIndex.country = -1;
        },
        error: () => (this.countryLoading = false),
      });

    this.stateQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!this.selected.country) return [];
          this.stateLoading = true;
          return this.travelApi.getStates(this.countryCode()!, q);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.stateOptions = res.data || [];
          this.stateLoading = false;
          this.highlightedIndex.state = -1;
        },
        error: () => (this.stateLoading = false),
      });

    this.cityQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!this.selected.country) return [];
          this.cityLoading = true;
          return this.travelApi.getCities(this.countryCode()!, {
            state: this.stateCode() || undefined,
            q,
            limit: 50,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.cityOptions = res.data || [];
          this.cityLoading = false;
          this.highlightedIndex.city = -1;
        },
        error: () => (this.cityLoading = false),
      });

    this.form.get('countryQuery')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((q) => {
      this.countryQuery$.next(q || '');
    });
    this.form.get('stateQuery')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((q) => {
      this.stateQuery$.next(q || '');
    });
    this.form.get('cityQuery')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((q) => {
      this.cityQuery$.next(q || '');
    });

    // Kick off an initial (unfiltered) country list so the dropdown has
    // content the first time the field is focused.
    this.countryQuery$.next('');

    if (this.defaultCountryCode) {
      this.travelApi.getCountries('').pipe(takeUntil(this.destroy$)).subscribe((res) => {
        const match = (res.data || []).find((c) => c.isoCode === this.defaultCountryCode);
        if (match) this.pickCountry(match, { silent: false });
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private countryCode(): string | undefined {
    return this.selected.country?.isoCode || this.selected.country?.iso2 || (this.selected.country?.id as string);
  }

  private stateCode(): string | undefined {
    return this.selected.state?.isoCode || this.selected.state?.state_code;
  }

  pickCountry(country: PlaceSuggestion, opts: { silent?: boolean } = {}) {
    this.selected = { country, state: null, city: null };
    this.form.patchValue({ countryQuery: country.name, stateQuery: '', cityQuery: '' }, { emitEvent: false });
    this.form.get('stateQuery')!.enable({ emitEvent: false });
    this.form.get('cityQuery')!.enable({ emitEvent: false });
    this.countryOpen = false;
    this.stateOptions = [];
    this.cityOptions = [];
    // Preload states and an initial (unfiltered) page of cities for this country.
    this.stateQuery$.next('');
    this.cityQuery$.next('');
    if (!opts.silent) this.emitSelection();
  }

  pickState(state: PlaceSuggestion) {
    this.selected = { ...this.selected, state, city: null };
    this.form.patchValue({ stateQuery: state.name, cityQuery: '' }, { emitEvent: false });
    this.stateOpen = false;
    this.cityOptions = [];
    // Re-scope the city list to this state.
    this.cityQuery$.next('');
    this.emitSelection();
  }

  pickCity(city: PlaceSuggestion) {
    this.selected = { ...this.selected, city };
    this.form.patchValue({ cityQuery: city.name }, { emitEvent: false });
    this.cityOpen = false;
    this.emitSelection();
  }

  /** Close a dropdown shortly after blur so a mousedown-selected option still registers first. */
  closeSoon(which: ComboboxKey) {
    setTimeout(() => {
      if (which === 'country') this.countryOpen = false;
      if (which === 'state') this.stateOpen = false;
      if (which === 'city') this.cityOpen = false;
    }, 150);
  }

  private optionsFor(which: ComboboxKey): PlaceSuggestion[] {
    if (which === 'country') return this.countryOptions;
    if (which === 'state') return this.stateOptions;
    return this.cityOptions;
  }

  private isOpen(which: ComboboxKey): boolean {
    if (which === 'country') return this.countryOpen;
    if (which === 'state') return this.stateOpen;
    return this.cityOpen;
  }

  private setOpen(which: ComboboxKey, open: boolean) {
    if (which === 'country') this.countryOpen = open;
    else if (which === 'state') this.stateOpen = open;
    else this.cityOpen = open;
  }

  private selectAt(which: ComboboxKey, index: number) {
    const option = this.optionsFor(which)[index];
    if (!option) return;
    if (which === 'country') this.pickCountry(option);
    else if (which === 'state') this.pickState(option);
    else this.pickCity(option);
  }

  /** Arrow keys move the highlighted option, Enter selects it, Escape closes the dropdown. */
  onKeydown(event: KeyboardEvent, which: ComboboxKey) {
    const options = this.optionsFor(which);

    if (event.key === 'ArrowDown' && !this.isOpen(which)) {
      this.setOpen(which, true);
      event.preventDefault();
      return;
    }
    if (!this.isOpen(which) || !options.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex[which] = Math.min(this.highlightedIndex[which] + 1, options.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex[which] = Math.max(this.highlightedIndex[which] - 1, 0);
        break;
      case 'Enter':
        if (this.highlightedIndex[which] >= 0) {
          event.preventDefault();
          this.selectAt(which, this.highlightedIndex[which]);
        }
        break;
      case 'Escape':
        this.setOpen(which, false);
        this.highlightedIndex[which] = -1;
        break;
    }
  }

  private emitSelection() {
    this.selectionChange.emit(this.selected);
  }
}
