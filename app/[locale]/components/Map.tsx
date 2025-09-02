'use client';

import L, { LatLngExpression } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useRef, useMemo } from 'react';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

// Componente que fuerza la actualización de la vista del mapa (centro y zoom)
const MapUpdater: React.FC<{ center: LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

interface MapProps {
  center?: number[];
  zoom?: number;
  onLocationChange?: (location: [number, number]) => void;
}

const url = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const costaRicaBounds: L.LatLngBoundsExpression = [
  [8.04, -87.09],
  [11.23, -82.56],
];

const Map: React.FC<MapProps> = ({ center, zoom, onLocationChange }) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPosition = marker.getLatLng();
          if (onLocationChange) {
            onLocationChange([newPosition.lat, newPosition.lng]);
          }
        }
      },
    }),
    [onLocationChange]
  );

  const mapCenter = (center as LatLngExpression) || [9.9281, -84.0907];
  const mapZoom = zoom || 8;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      maxBounds={costaRicaBounds}
      className="h-[40vh] rounded-lg"
    >
      <TileLayer url={url} attribution={attribution} />
      {center && (
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={mapCenter}
          ref={markerRef}
        />
      )}
      <MapUpdater center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  );
};

export default Map;