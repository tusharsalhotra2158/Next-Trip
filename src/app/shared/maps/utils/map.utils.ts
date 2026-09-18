import { LatLng, MapBounds } from '../models/map.models';

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(from: LatLng, to: LatLng): number {
  const dLng = degreesToRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(degreesToRadians(to.lat));
  const x =
    Math.cos(degreesToRadians(from.lat)) * Math.sin(degreesToRadians(to.lat)) -
    Math.sin(degreesToRadians(from.lat)) *
      Math.cos(degreesToRadians(to.lat)) *
      Math.cos(dLng);
  const bearing = radiansToDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate destination point given distance and bearing
 */
export function calculateDestination(
  from: LatLng,
  distance: number,
  bearing: number
): LatLng {
  const R = 6371000; // Earth's radius in meters
  const angularDistance = distance / R;
  const phi1 = degreesToRadians(from.lat);
  const lambda1 = degreesToRadians(from.lng);
  const theta = degreesToRadians(bearing);

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angularDistance) +
      Math.cos(phi1) * Math.sin(angularDistance) * Math.cos(theta)
  );

  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angularDistance) * Math.cos(phi1),
      Math.cos(angularDistance) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    lat: radiansToDegrees(phi2),
    lng: radiansToDegrees(lambda2),
  };
}

/**
 * Check if point is within bounds
 */
export function isPointInBounds(point: LatLng, bounds: MapBounds): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(location: LatLng, precision: number = 6): string {
  return `${location.lat.toFixed(precision)}, ${location.lng.toFixed(precision)}`;
}

/**
 * Convert coordinates string to LatLng
 */
export function parseCoordinates(coordsString: string): LatLng | null {
  const match = coordsString.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/**
 * Format distance in human-readable format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Interpolate color between two colors based on value
 */
export function interpolateColor(
  minColor: string,
  maxColor: string,
  value: number,
  min: number = 0,
  max: number = 100
): string {
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));

  const minRGB = hexToRgb(minColor);
  const maxRGB = hexToRgb(maxColor);

  if (!minRGB || !maxRGB) return minColor;

  const r = Math.round(minRGB.r + (maxRGB.r - minRGB.r) * ratio);
  const g = Math.round(minRGB.g + (maxRGB.g - minRGB.g) * ratio);
  const b = Math.round(minRGB.b + (maxRGB.b - minRGB.b) * ratio);

  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Encode polyline (Google's algorithm)
 */
export function encodePolyline(points: LatLng[], precision: number = 5): string {
  const factor = Math.pow(10, precision);
  let output = '';

  let previousPoint = { lat: 0, lng: 0 };

  for (const point of points) {
    const currentPoint = {
      lat: Math.round(point.lat * factor),
      lng: Math.round(point.lng * factor),
    };

    output += encodeValue(currentPoint.lat - previousPoint.lat);
    output += encodeValue(currentPoint.lng - previousPoint.lng);

    previousPoint = currentPoint;
  }

  return output;
}

/**
 * Decode polyline (Google's algorithm)
 */
export function decodePolyline(encoded: string, precision: number = 5): LatLng[] {
  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      lat: lat / factor,
      lng: lng / factor,
    });
  }

  return coordinates;
}

/**
 * Helper function to encode a single value
 */
function encodeValue(value: number): string {
  value = Math.round(value);
  value = value << 1;
  if (value < 0) {
    value = ~value;
  }

  let encoded = '';
  while (value >= 0x20) {
    const chunk = (0x20 | (value & 0x1f)) + 63;
    encoded += String.fromCharCode(chunk);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Simplify polyline using Douglas-Peucker algorithm
 */
export function simplifyPolyline(points: LatLng[], tolerance: number = 0.001): LatLng[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointLineDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPolyline(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolyline(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function pointLineDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.lng - lineStart.lng, 2) + Math.pow(point.lat - lineStart.lat, 2)
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) /
        (dx * dx + dy * dy)
    )
  );

  const closestPoint = {
    lng: lineStart.lng + t * dx,
    lat: lineStart.lat + t * dy,
  };

  return Math.sqrt(
    Math.pow(point.lng - closestPoint.lng, 2) +
      Math.pow(point.lat - closestPoint.lat, 2)
  );
}
