'use client';

// Ported from src/app/features/travel/components/search-autocomplete/search-autocomplete.ts.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { travelApi } from '@/lib/api';
import type { Destination, PlaceSuggestion } from '@/lib/types';
import styles from './SearchAutocomplete.module.css';

export interface SearchAutocompleteProps {
  placeholder?: string;
  /** Optional field label (e.g. "Starting point" / "Destination") shown above the input. */
  label?: string;
  onSuggestionSelected?: (d: Destination) => void;
}

const DEBOUNCE_MS = 300;
const BLUR_CLOSE_MS = 200;

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export default function SearchAutocomplete({
  placeholder = 'Search cities, states, countries...',
  label = '',
  onSuggestionSelected,
}: SearchAutocompleteProps) {
  const listId = useId();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [sourceNote, setSourceNote] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last query that made it through the debounce (rxjs distinctUntilChanged).
  const lastEmittedRef = useRef<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const resolveReqIdRef = useRef(0);

  // Cancel timers and in-flight requests on unmount.
  useEffect(() => {
    const resolveIds = resolveReqIdRef;
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      searchAbortRef.current?.abort();
      aiAbortRef.current?.abort();
      resolveIds.current++;
    };
  }, []);

  async function performSearch(query: string) {
    // Only the latest search may update the list (rxjs switchMap semantics).
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsLoading(true);

    try {
      const response = await travelApi.searchPlaces(query, { limit: 10 }, controller.signal);
      if (controller.signal.aborted) return;
      const data = response.data || [];
      setSuggestions(data);
      setSourceNote(response.disclaimer ?? null);
      setIsLoading(false);
      setHighlightedIndex(-1);

      if (data.length === 0) {
        setShowDropdown(true);
      }
    } catch (err) {
      if (isAbort(err) || controller.signal.aborted) return;
      console.error('Search error:', err);
      setIsLoading(false);
      setSuggestions([]);
    } finally {
      if (searchAbortRef.current === controller) searchAbortRef.current = null;
    }
  }

  function onSearch(query: string) {
    setSearchQuery(query);
    setHighlightedIndex(-1);
    setShowDropdown(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;

    if (!query.trim()) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      setIsLoading(false);
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (query === lastEmittedRef.current) return;
      lastEmittedRef.current = query;
      void performSearch(query);
    }, DEBOUNCE_MS);
  }

  /**
   * Fall back to natural-language (Gemini) search from within the same box —
   * this keeps the app to a single search input instead of a separate AI
   * search UI. Triggered from a link in the dropdown, either when the
   * structured search found nothing or on demand.
   */
  async function askAi(event: MouseEvent) {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setIsAiSearching(true);
    setShowDropdown(true);

    try {
      const res = await travelApi.aiSearchPlaces(q, 6, controller.signal);
      if (controller.signal.aborted) return;
      const aiResults = (res.data || []).map((place) => ({ ...place, aiSuggested: true }));
      setSuggestions(aiResults);
      setSourceNote(res.disclaimer ?? null);
      setIsAiSearching(false);
    } catch (err) {
      if (isAbort(err) || controller.signal.aborted) return;
      console.error('AI search failed:', err);
      setIsAiSearching(false);
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
    }
  }

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setShowDropdown(false);
    setIsResolving(true);

    const reqId = ++resolveReqIdRef.current;
    const coords =
      suggestion.latitude != null && suggestion.longitude != null
        ? { lat: Number(suggestion.latitude), lng: Number(suggestion.longitude) }
        : null;

    try {
      const response = await travelApi.resolvePlace(
        suggestion.name,
        suggestion.country_code,
        suggestion.country,
        coords,
      );
      if (reqId !== resolveReqIdRef.current) return;
      setIsResolving(false);
      if (response.data) {
        onSuggestionSelected?.(response.data);
      } else {
        console.error('Could not resolve place:', suggestion, response.error);
      }
    } catch (err) {
      if (reqId !== resolveReqIdRef.current) return;
      console.error('Failed to resolve place:', err);
      setIsResolving(false);
    }
  }

  function onFocus() {
    if (searchQuery.trim()) {
      setShowDropdown(true);
    }
  }

  /** Arrow keys move the highlighted suggestion, Enter selects it, Escape closes the dropdown. */
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || !suggestions.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(Math.min(highlightedIndex + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(Math.max(highlightedIndex - 1, 0));
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          event.preventDefault();
          void selectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  }

  // Closing on blur (after a short delay so a mousedown on a suggestion lands first)
  // is what closes the dropdown on any click outside the component.
  function onBlur() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      setShowDropdown(false);
    }, BLUR_CLOSE_MS);
  }

  const listOpen = showDropdown && suggestions.length > 0;
  const askAiBtn =
    'cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-terracotta hover:underline';

  return (
    <div className="relative w-full">
      {label && (
        <label className="mb-2 block text-xs font-semibold tracking-[0.04em] text-ink-soft uppercase">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label || placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-activedescendant={listOpen && highlightedIndex >= 0 ? `${listId}-${highlightedIndex}` : undefined}
          className="box-border w-full rounded-full border-[1.5px] border-line bg-white py-[14px] pr-[18px] pl-11 font-sans text-sm text-ink transition-all duration-[250ms] ease-[ease] placeholder:text-[#9aa59d] focus:border-forest focus:shadow-[0_0_0_4px_rgba(31,77,62,0.1)] focus:outline-none"
          autoComplete="off"
        />
        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-forest opacity-70" aria-hidden="true">
          🔍
        </span>
      </div>

      {listOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-[1000] max-h-[400px] overflow-y-auto rounded-[20px] border border-line bg-white shadow-[0_16px_32px_rgba(31,77,62,0.14)]"
        >
          {suggestions.map((suggestion, i) => (
            <div
              key={`${suggestion.aiSuggested ? 'ai' : suggestion.type}-${suggestion.id}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={highlightedIndex === i}
              onMouseDown={() => void selectSuggestion(suggestion)}
              className={`cursor-pointer border-b border-cream-soft px-[18px] py-[14px] transition-all duration-200 first:rounded-t-[20px] last:rounded-b-[20px] last:border-b-0 hover:bg-cream ${
                highlightedIndex === i ? 'bg-cream' : ''
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <strong className="font-display text-sm font-semibold text-ink">{suggestion.name}</strong>
                {!suggestion.aiSuggested && (
                  <span className="rounded-full bg-cream-soft px-2.5 py-[3px] text-[11px] font-semibold text-forest">
                    {suggestion.country_code}
                  </span>
                )}
                {suggestion.aiSuggested && (
                  <span className="rounded-full bg-[#fdf1de] px-2.5 py-[3px] text-[11px] font-semibold text-[#b8791f]">
                    ✨ AI
                  </span>
                )}
              </div>
              <p className="m-0 text-xs leading-[1.4] text-ink-soft">
                {suggestion.whyMatch || suggestion.description || suggestion.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {showDropdown && (isLoading || isResolving || isAiSearching) && (
        <div className="flex items-center justify-center gap-2 p-[18px] text-center font-medium text-forest" role="status">
          <span className={styles.spinner}></span>
          {isResolving ? 'Loading location…' : isAiSearching ? 'Asking AI…' : 'Searching…'}
        </div>
      )}

      {showDropdown && sourceNote && (
        <p className="m-0 rounded-b-[20px] border-t border-cream-soft bg-cream px-[18px] py-2 text-[11px] text-[#9aa59d]">
          {sourceNote}
        </p>
      )}

      {showDropdown && !isLoading && !isAiSearching && suggestions.length === 0 && searchQuery && (
        <div className="p-[18px] text-center text-[13px] text-ink-soft">
          <p className="mt-0 mb-2">No places found for &quot;{searchQuery}&quot;</p>
          <button type="button" className={askAiBtn} onMouseDown={(e) => void askAi(e)}>
            ✨ Ask AI to suggest places for &quot;{searchQuery}&quot;
          </button>
        </div>
      )}

      {showDropdown && suggestions.length > 0 && !isAiSearching && (
        <div className="rounded-b-[20px] border-t border-cream-soft bg-cream px-[18px] py-2">
          <button type="button" className={askAiBtn} onMouseDown={(e) => void askAi(e)}>
            ✨ Not finding it? Ask AI
          </button>
        </div>
      )}
    </div>
  );
}
