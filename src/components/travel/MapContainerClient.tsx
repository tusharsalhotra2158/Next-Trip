'use client';

// Browser-only wrapper: Leaflet needs `window`, so MapContainer is never prerendered on the server.
import dynamic from 'next/dynamic';
import type { MapContainerProps } from './MapContainer';

const MapContainer = dynamic<MapContainerProps>(() => import('./MapContainer'), { ssr: false });

export type { MapContainerProps };

export default function MapContainerClient(props: MapContainerProps) {
  return <MapContainer {...props} />;
}
