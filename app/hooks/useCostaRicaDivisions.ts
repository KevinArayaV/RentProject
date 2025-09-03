"use client";

import { useState, useEffect, useCallback } from 'react';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import * as turf from '@turf/turf';

// Interfaces para las propiedades de los datos GeoJSON
interface DivisionProperties {
  provincia: string;
  canton?: string;
  distrito?: string;
}

// Tipo genérico para una Feature con nuestras propiedades
type DivisionFeature = Feature<Geometry, DivisionProperties>;

// Tipos para las FeatureCollections
type DivisionFC = FeatureCollection<Geometry, DivisionProperties>;

// Estructura para los datos cacheados
interface CachedData {
  provinces: DivisionFC;
  cantons: DivisionFC;
  districts: DivisionFC;
  // Estructuras pre-calculadas para búsquedas rápidas
  cantonsByProvince: Map<string, DivisionFeature[]>;
  districtsByCanton: Map<string, DivisionFeature[]>;
}

// Usamos un caché a nivel de módulo para que los datos persistan entre montajes del hook
let dataCache: CachedData | null = null;

const useCostaRicaDivisions = () => {
  const [data, setData] = useState<CachedData | null>(dataCache);
  const [isLoading, setIsLoading] = useState(!dataCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (dataCache) {
        setIsLoading(false);
        return;
      }

      try {
        const [provincesRes, cantonsRes, districtsRes] = await Promise.all([
          fetch('/data/cr-geo/provinces.geojson'),
          fetch('/data/cr-geo/cantons.geojson'),
          fetch('/data/cr-geo/districts.geojson'),
        ]);

        if (!provincesRes.ok || !cantonsRes.ok || !districtsRes.ok) {
          throw new Error('Failed to fetch GeoJSON data');
        }

        const provinces: DivisionFC = await provincesRes.json();
        const cantons: DivisionFC = await cantonsRes.json();
        const districts: DivisionFC = await districtsRes.json();

        const cantonsByProvince = new Map<string, DivisionFeature[]>();
        cantons.features.forEach(canton => {
          const provinceName = canton.properties.provincia;
          if (!cantonsByProvince.has(provinceName)) {
            cantonsByProvince.set(provinceName, []);
          }
          cantonsByProvince.get(provinceName)?.push(canton);
        });

        const districtsByCanton = new Map<string, DivisionFeature[]>();
        districts.features.forEach(district => {
          const cantonKey = `${district.properties.provincia}-${district.properties.canton}`;
          if (!districtsByCanton.has(cantonKey)) {
            districtsByCanton.set(cantonKey, []);
          }
          districtsByCanton.get(cantonKey)?.push(district);
        });
        
        const processedData: CachedData = {
          provinces,
          cantons,
          districts,
          cantonsByProvince,
          districtsByCanton,
        };

        dataCache = processedData;
        setData(processedData);

      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getProvinces = useCallback(() => {
    if (!data) return [];
    // CORRECCIÓN APLICADA AQUÍ
    return [...data.provinces.features].sort((a, b) => 
      (a.properties.provincia || '').localeCompare(b.properties.provincia || '')
    );
  }, [data]);

  const getCantonsByProvince = useCallback((provinceName: string | null) => {
    if (!data || !provinceName) return [];
    const cantons = data.cantonsByProvince.get(provinceName) || [];
    // CORRECCIÓN APLICADA AQUÍ
    return [...cantons].sort((a, b) => 
      (a.properties.canton || '').localeCompare(b.properties.canton || '')
    );
  }, [data]);

  const getDistrictsByCanton = useCallback((provinceName: string | null, cantonName: string | null) => {
    if (!data || !provinceName || !cantonName) return [];
    const cantonKey = `${provinceName}-${cantonName}`;
    const districts = data.districtsByCanton.get(cantonKey) || [];
    // CORRECCIÓN APLICADA AQUÍ
    return [...districts].sort((a, b) => 
      (a.properties.distrito || '').localeCompare(b.properties.distrito || '')
    );
  }, [data]);

  const findLocationByCoords = useCallback((coords: { lat: number; lng: number }) => {
    if (!data) return null;
    const point = turf.point([coords.lng, coords.lat]);

    for (const district of data.districts.features) {
      if (turf.booleanPointInPolygon(point, district.geometry)) {
        return {
          province: district.properties.provincia,
          canton: district.properties.canton,
          district: district.properties.distrito,
        };
      }
    }

    for (const canton of data.cantons.features) {
      if (turf.booleanPointInPolygon(point, canton.geometry)) {
        return {
          province: canton.properties.provincia,
          canton: canton.properties.canton,
          district: null,
        };
      }
    }
    
    for (const province of data.provinces.features) {
        if (turf.booleanPointInPolygon(point, province.geometry)) {
            return {
                province: province.properties.provincia,
                canton: null,
                district: null,
            };
        }
    }
    
    return null;
  }, [data]);

  return {
    isLoading,
    error,
    getProvinces,
    getCantonsByProvince,
    getDistrictsByCanton,
    findLocationByCoords,
    allData: data,
  };
};

export default useCostaRicaDivisions;