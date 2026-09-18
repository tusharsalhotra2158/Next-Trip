import { LatLng } from './map.models';

export interface PlaceSearchRequest {
  input: string;
  radius?: number;
  bounds?: google.maps.LatLngBounds;
  componentRestrictions?: Record<string, string>;
  language?: string;
  offset?: number;
  types?: string[];
  sessionToken?: google.maps.places.AutocompleteSessionToken;
}

export interface PlacePrediction {
  description: string;
  mainText: string;
  secondaryText?: string;
  placeId: string;
  types: string[];
  terms?: Array<{
    value: string;
    offset: number;
  }>;
  matchedSubstrings?: Array<{
    offset: number;
    length: number;
  }>;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  formattedAddress: string;
  location: LatLng;
  types: string[];
  rating?: number;
  reviews?: PlaceReview[];
  photos?: PlacePhoto[];
  website?: string;
  internationalPhoneNumber?: string;
  phoneNumber?: string;
  openingHours?: OpeningHours;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  url?: string;
  vicinity?: string;
  googleMapsUrl?: string;
  customData?: Record<string, any>;
}

export interface PlaceReview {
  author: string;
  authorUrl?: string;
  language: string;
  profilePhotoUrl?: string;
  rating?: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

export interface PlacePhoto {
  height: number;
  html_attributions: string[];
  url: string;
  width: number;
}

export interface OpeningHours {
  weekdayText?: string[];
  isOpen?: boolean;
  periods?: Array<{
    close?: { day: number; time: string };
    open: { day: number; time: string };
  }>;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  geometry: {
    location: LatLng;
    viewport?: {
      northeast: LatLng;
      southwest: LatLng;
    };
  };
  icon?: string;
  photos?: PlacePhoto[];
  types: string[];
  businessStatus?: string;
  rating?: number;
  userRatingsTotal?: number;
}

export interface PlaceAutocompleteOptions {
  componentRestrictions?: Record<string, string>;
  fields?: string[];
  types?: string[];
  strictBounds?: boolean;
  language?: string;
}
