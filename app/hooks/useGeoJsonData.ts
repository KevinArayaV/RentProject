import { useState, useEffect } from 'react';

interface GeoJsonData {
  provinces: any | null;
  cantons: any | null;
  districts: any | null;
}

export const useGeoJsonData = () => {
  const [geoData, setGeoData] = useState<GeoJsonData>({
    provinces: null,
    cantons: null,
    districts: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const [provincesRes, cantonsRes, districtsRes] = await Promise.all([
          fetch('/data/cr-geo/provinces.geojson'),
          fetch('/data/cr-geo/cantons.geojson'),
          fetch('/data/cr-geo/districts.geojson'),
        ]);

        if (!provincesRes.ok || !cantonsRes.ok || !districtsRes.ok) {
          console.warn('GeoJSON files not found, using fallback');
          setIsLoading(false);
          return;
        }

        const [provinces, cantons, districts] = await Promise.all([
          provincesRes.json(),
          cantonsRes.json(),
          districtsRes.json(),
        ]);

        setGeoData({ provinces, cantons, districts });
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGeoJson();
  }, []);

  return { geoData, isLoading };
};

export default useGeoJsonData;