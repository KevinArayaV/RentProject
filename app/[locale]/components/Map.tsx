"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Rectangle,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  onLocationChange?: (coords: [number, number]) => void;
  selectedFeature?: any;
}

interface MapUpdaterProps {
  center: LatLngExpression;
  zoom: number;
  bbox: [number, number, number, number] | null;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom, bbox }) => {
  const map = useMap();

  useEffect(() => {
    if (bbox && bbox.length === 4) {
      const bounds = L.latLngBounds(
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]]
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, bbox]);

  return null;
};

const Map: React.FC<MapProps> = ({
  center,
  zoom,
  onLocationChange,
  selectedFeature,
}) => {
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Ensure map resizes correctly when rendered in a modal
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 0);
    }
  }, []);

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

  // Allow clicking on map to move marker
  useEffect(() => {
    if (mapRef.current && onLocationChange) {
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        onLocationChange([e.latlng.lat, e.latlng.lng]);
      };

      mapRef.current.on("click", handleMapClick);

      return () => {
        mapRef.current?.off("click", handleMapClick);
      };
    }
  }, [onLocationChange]);

  const mapCenter = (center as LatLngExpression) || [9.9281, -84.0907];
  const mapZoom = zoom || 8;

  const bbox = useMemo(() => {
    if (selectedFeature?.geometry?.coordinates?.[0]) {
      const coords = selectedFeature.geometry.coordinates[0];
      if (coords.length >= 4) {
        let minLng = coords[0][0];
        let maxLng = coords[0][0];
        let minLat = coords[0][1];
        let maxLat = coords[0][1];

        coords.forEach((coord: number[]) => {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });

        return [minLng, minLat, maxLng, maxLat];
      }
    }
    return null;
  }, [selectedFeature]);

  const rectangleBounds = useMemo(() => {
    if (bbox && bbox.length === 4) {
      return [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ] as [[number, number], [number, number]];
    }
    return null;
  }, [bbox]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom
      className="w-full h-full rounded-lg"
      ref={(map) => {
        if (map) mapRef.current = map;
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {rectangleBounds && (
      <Rectangle
        bounds={rectangleBounds}
        pathOptions={{
          color: "#FF5A5F",
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.15,
        }}
      />
      )}

      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={mapCenter}
        ref={markerRef}
      />

      <MapUpdater center={mapCenter} zoom={mapZoom} bbox={bbox} />
    </MapContainer>
  );
};

export default Map;
