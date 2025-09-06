"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON as RLGeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

// Fix for default marker icons in React-Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src || markerIcon,
  iconRetinaUrl: markerIcon2x.src || markerIcon2x,
  shadowUrl: markerShadow.src || markerShadow,
});

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
  markerPosition: LatLngExpression;
  onLocationChange?: (coords: [number, number]) => void;
}

// Component to handle map updates and size invalidation
const MapUpdater: React.FC<MapUpdaterProps> = ({ 
  center, 
  zoom, 
  bbox, 
  markerPosition,
  onLocationChange 
}) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Handle map click events
  useMapEvents({
    click(e) {
      if (onLocationChange) {
        onLocationChange([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  // Initial size invalidation and setup
  useEffect(() => {
    if (!hasInitialized && map) {
      // Force multiple invalidations to ensure proper rendering
      const invalidateSizes = () => {
        map.invalidateSize();
      };

      // Immediate invalidation
      invalidateSizes();
      
      // Delayed invalidations to catch any layout changes
      const timeouts = [
        setTimeout(invalidateSizes, 100),
        setTimeout(invalidateSizes, 300),
        setTimeout(invalidateSizes, 500),
      ];

      setHasInitialized(true);

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [map, hasInitialized]);

  // Handle bbox or center/zoom changes
  useEffect(() => {
    if (map) {
      if (bbox && bbox.length === 4) {
        const bounds = L.latLngBounds(
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]]
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        map.setView(center, zoom);
      }
      
      // Invalidate size after view change
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [map, center, zoom, bbox]);

  // Handle container visibility changes (for modals)
  useEffect(() => {
    if (!map) return;

    const checkVisibility = () => {
      const container = map.getContainer();
      if (container && container.offsetParent !== null) {
        map.invalidateSize();
      }
    };

    // Create observer for container visibility
    const observer = new MutationObserver(() => {
      checkVisibility();
    });

    // Observe the map container and its parents for visibility changes
    const container = map.getContainer();
    if (container) {
      observer.observe(container, { 
        attributes: true, 
        attributeFilter: ['style', 'class'] 
      });
      
      // Also observe parent elements (for modal visibility)
      let parent = container.parentElement;
      while (parent && parent !== document.body) {
        observer.observe(parent, { 
          attributes: true, 
          attributeFilter: ['style', 'class'] 
        });
        parent = parent.parentElement;
      }
    }

    // Handle window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

// Marker component with dragging capability
const DraggableMarker: React.FC<{
  position: LatLngExpression;
  onDragEnd: (newPosition: L.LatLng) => void;
}> = ({ position, onDragEnd }) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          onDragEnd(marker.getLatLng());
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
};

const Map: React.FC<MapProps> = ({
  center,
  zoom,
  onLocationChange,
  selectedFeature,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = useState(0);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression>(
    center || [9.9281, -84.0907]
  );

  const mapCenter = (center as LatLngExpression) || [9.9281, -84.0907];
  const mapZoom = zoom || 8;

  // Update marker position when center changes
  useEffect(() => {
    if (center) {
      setMarkerPosition(center);
    }
  }, [center]);

  // Calculate bounding box from selected feature
  const bbox = useMemo(() => {
    if (!selectedFeature) return null;
    try {
      const layer = L.geoJSON(selectedFeature as any);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        return [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ] as [number, number, number, number];
      }
    } catch (e) {
      // ignore
    }
    return null;
  }, [selectedFeature]);

  // Styling for the selected polygon feature
  const selectedStyle = useMemo(() => ({
    color: "#FF5A5F",
    weight: 2,
    opacity: 0.2, // border opacity ~80% transparent
    fillColor: "#FF5A5F",
    fillOpacity: 0.1, // reduced fill opacity for subtler highlight
  }), []);

  // Force re-mount GeoJSON layer when feature changes to avoid stale outlines
  const featureKey = useMemo(() => {
    if (!selectedFeature) return 'none';
    const id = selectedFeature?.properties?.shapeID;
    if (id) return String(id);
    try {
      return JSON.stringify(selectedFeature.geometry);
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }, [selectedFeature]);

  // Handle marker drag end
  const handleMarkerDragEnd = (newPosition: L.LatLng) => {
    setMarkerPosition([newPosition.lat, newPosition.lng]);
    if (onLocationChange) {
      onLocationChange([newPosition.lat, newPosition.lng]);
    }
  };

  // Force re-render of map when container becomes visible
  useEffect(() => {
    const checkContainerVisibility = () => {
      if (containerRef.current && containerRef.current.offsetParent !== null) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Force map re-initialization if needed
          setMapKey(prev => prev + 1);
        }
      }
    };

    // Check visibility on mount and when visibility might change
    const timer = setTimeout(checkContainerVisibility, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg relative">
      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        className="w-full h-full rounded-lg"
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          // Immediate size invalidation when map is created
          setTimeout(() => {
            map.invalidateSize();
          }, 0);
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {selectedFeature && (
          <RLGeoJSON
            key={featureKey}
            data={selectedFeature as any}
            style={selectedStyle as any}
            interactive={false}
          />
        )}

        <DraggableMarker 
          position={markerPosition}
          onDragEnd={handleMarkerDragEnd}
        />

        <MapUpdater 
          center={mapCenter} 
          zoom={mapZoom} 
          bbox={bbox}
          markerPosition={markerPosition}
          onLocationChange={onLocationChange}
        />
      </MapContainer>
    </div>
  );
};

export default Map;
