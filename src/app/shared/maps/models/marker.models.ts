import { LatLng } from './map.models';

export interface MarkerData {
  id: string;
  position: LatLng;
  title?: string;
  label?: string;
  icon?: string | google.maps.Icon;
  animation?: google.maps.Animation;
  draggable?: boolean;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  infoContent?: string;
  customData?: Record<string, any>;
}

export interface MarkerClusterOptions {
  gridSize?: number;
  maxZoom?: number;
  zoomOnClick?: boolean;
  averageCenter?: boolean;
  minimumClusterSize?: number;
  imagePath?: string;
  imageExtension?: string;
  imageSize?: [number, number];
}

export interface MarkerAnimation {
  type: 'bounce' | 'drop' | 'pulse' | 'none';
  duration?: number;
  repeat?: boolean;
}

export interface MarkerIconConfig {
  url?: string;
  size?: { width: number; height: number };
  scaledSize?: { width: number; height: number };
  origin?: { x: number; y: number };
  anchor?: { x: number; y: number };
  labelOrigin?: { x: number; y: number };
}

export const DEFAULT_MARKER_ICONS = {
  blue: {
    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  },
  red: {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  },
  yellow: {
    url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  },
  green: {
    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  },
  orange: {
    url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  },
  purple: {
    url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
  },
};

export interface InfoWindowConfig {
  content: string;
  maxWidth?: number;
  position?: LatLng;
  disableAutoPan?: boolean;
  pixelOffset?: { width: number; height: number };
}
