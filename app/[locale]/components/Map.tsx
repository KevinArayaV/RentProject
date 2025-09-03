'use client';

import L, { LatLngExpression } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useRef, useMemo } from 'react';
import { Feature } from 'geojson';
import * as turf from '@turf/turf';

// Configuración del ícono de Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

// Componente para actualizar el mapa (vista y límites)
const MapUpdater: React.FC<{ center: LatLngExpression; zoom: number; boundary?: Feature; }> = ({ center, zoom, boundary }) => {
  const map = useMap();
  
  useEffect(() => {
    if (boundary?.geometry) {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(boundary);
      const bounds: L.LatLngBoundsExpression = [[minLat, minLng], [maxLat, maxLng]];
      map.fitBounds(bounds, { padding: [10, 10] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, boundary, map]);

  return null;
};

interface MapProps {
  center?: number[];
  zoom?: number;
  onLocationChange?: (location: [number, number]) => void;
  boundary?: Feature; // Nueva prop para el límite geográfico
}

const url = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const costaRicaBounds: L.LatLngBoundsExpression = [
  [8.04, -87.09],
  [11.23, -82.56],
];

const Map: React.FC<MapProps> = ({ center, zoom, onLocationChange, boundary }) => {
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

  // Estilo para el polígono del límite
  const boundaryStyle = {
    color: "#f06292", // Un color rosado similar al de la marca
    weight: 2,
    opacity: 0.8,
    fillColor: "#f8bbd0",
    fillOpacity: 0.2,
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      maxBounds={costaRicaBounds}
      className="h-[40vh] rounded-lg"
    >
      <TileLayer url={url} attribution={attribution} />
      
      {/* Dibuja el límite si se proporciona */}
      {boundary && <GeoJSON key={boundary.properties?.name} data={boundary} style={boundaryStyle} />}

      {/* El marcador solo se muestra si hay una ubicación central */}
      {center && (
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={mapCenter}
          ref={markerRef}
        />
      )}
      
      <MapUpdater center={mapCenter} zoom={mapZoom} boundary={boundary} />
    </MapContainer>
  );
};

export default Map;