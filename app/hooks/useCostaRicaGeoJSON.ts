import { useState, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';

interface GeoJSONData {
  provinces: any;
  cantons: any;
  districts: any;
}

export const useCostaRicaGeoJSON = () => {
  const [geoData, setGeoData] = useState<GeoJSONData>({
    provinces: null,
    cantons: null,
    districts: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const [provincesRes, cantonsRes, districtsRes] = await Promise.all([
          fetch('/data/cr-geo/geoBoundaries-CRI-ADM1.geojson'),
          fetch('/data/cr-geo/geoBoundaries-CRI-ADM2.geojson'),
          fetch('/data/cr-geo/geoBoundaries-CRI-ADM3.geojson'),
        ]);

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

    loadGeoJSON();
  }, []);

  const findLocationByCoordinates = useCallback((lat: number, lng: number) => {
    if (!geoData.provinces || !geoData.cantons || !geoData.districts) {
      return null;
    }

    const point = turf.point([lng, lat]);
    let result = {
      province: null as any,
      canton: null as any,
      district: null as any,
    };

    // Check districts first (most specific)
    for (const feature of geoData.districts.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        result.district = feature;
        break;
      }
    }

    // Check cantons
    for (const feature of geoData.cantons.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        result.canton = feature;
        break;
      }
    }

    // Check provinces
    for (const feature of geoData.provinces.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        result.province = feature;
        break;
      }
    }

    return result;
  }, [geoData]);

  const getProvinces = useCallback(() => {
    if (!geoData.provinces) return [];
    return geoData.provinces.features.map((f: any) => ({
      value: f.properties.shapeID,
      label: f.properties.shapeName.replace('Provincia ', ''),
      feature: f,
    }));
  }, [geoData.provinces]);

  const getCantonsByProvince = useCallback((provinceName: string) => {
    if (!geoData.cantons || !geoData.provinces) return [];
    
    // Find the selected province feature
    const provinceFeature = geoData.provinces.features.find(
      (f: any) => f.properties.shapeID === provinceName || 
                  f.properties.shapeName.includes(provinceName)
    );
    
    if (!provinceFeature) return [];

    // Filter cantons that are within the province
    return geoData.cantons.features
      .filter((canton: any) => {
        const cantonCenter = turf.centroid(canton);
        return turf.booleanPointInPolygon(cantonCenter, provinceFeature);
      })
      .map((f: any) => ({
        value: f.properties.shapeID,
        label: f.properties.shapeName,
        feature: f,
      }));
  }, [geoData.cantons, geoData.provinces]);

  const getDistrictsByCanton = useCallback((cantonId: string) => {
    if (!geoData.districts || !geoData.cantons) return [];
    
    const cantonFeature = geoData.cantons.features.find(
      (f: any) => f.properties.shapeID === cantonId
    );
    
    if (!cantonFeature) return [];

    return geoData.districts.features
      .filter((district: any) => {
        const districtCenter = turf.centroid(district);
        return turf.booleanPointInPolygon(districtCenter, cantonFeature);
      })
      .map((f: any) => ({
        value: f.properties.shapeID,
        label: f.properties.shapeName,
        feature: f,
      }));
  }, [geoData.districts, geoData.cantons]);

  return {
    geoData,
    isLoading,
    findLocationByCoordinates,
    getProvinces,
    getCantonsByProvince,
    getDistrictsByCanton,
  };
};