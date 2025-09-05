const Map: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  onLocationChange,
  selectedFeature
}) => {
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  // Manejador de click en el mapa
  useEffect(() => {
    if (mapRef.current && onLocationChange) {
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        onLocationChange([e.latlng.lat, e.latlng.lng]);
      };
      
      mapRef.current.on('click', handleMapClick);
      
      return () => {
        mapRef.current?.off('click', handleMapClick);
      };
    }
  }, [onLocationChange]);

  const mapCenter = (center as LatLngExpression) || [9.9281, -84.0907];
  const mapZoom = zoom || 8;

  const bbox = useMemo(() => {
    if (selectedFeature?.geometry?.coordinates?.[0]) {
      const coords = selectedFeature.geometry.coordinates[0];
      if (coords.length >= 4) {
        // Encontrar min/max correctamente
        let minLng = coords[0][0], maxLng = coords[0][0];
        let minLat = coords[0][1], maxLat = coords[0][1];
        
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
        [bbox[1], bbox[0]], // SW corner [lat, lng]
        [bbox[3], bbox[2]], // NE corner [lat, lng]
      ] as [[number, number], [number, number]];
    }
    return null;
  }, [bbox]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      className="h-[40vh] rounded-lg"
      ref={(map) => { if (map) mapRef.current = map; }}
    >
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {rectangleBounds && (
        <Rectangle
          bounds={rectangleBounds}
          pathOptions={{
            color: '#FF5A5F',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.15,
          }}
        />
      )}
      
      {center && (
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={mapCenter}
          ref={markerRef}
        />
      )}
      
      <MapUpdater center={mapCenter} zoom={mapZoom} bbox={bbox} />
    </MapContainer>
  );
};