// app/hooks/useCostaRicaDivisions.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Feature, FeatureCollection, Point } from 'geojson';
import * as turf from '@turf/turf';

// Tipos específicos para las propiedades de nuestros datos GeoJSON
interface ProvinceProperties {
  provincia: string;
}

interface CantonProperties extends ProvinceProperties {
  canton: string;
}

interface DistrictProperties extends CantonProperties {
  distrito: string;
}

// Tipos de Features con propiedades específicas
type ProvinceFeature = Feature<Point, ProvinceProperties>;
type CantonFeature = Feature<Point, CantonProperties>;
type DistrictFeature = Feature<Point, DistrictProperties>;

// Tipos de FeatureCollections
type ProvinceFC = FeatureCollection<Point, ProvinceProperties>;
type CantonFC = FeatureCollection<Point, CantonProperties>;
type DistrictFC = FeatureCollection<Point, DistrictProperties>;

// Estructura para los datos cacheados
interface CachedData {
  provinces: ProvinceFC;
  cantons: CantonFC;
  districts: DistrictFC;
  // Estructuras pre-calculadas para búsquedas rápidas
  cantonsByProvince: Map<string, CantonFeature>;
  districtsByCanton: Map<string, DistrictFeature>;
}

const useCostaRicaDivisions = () => {
  const = useState<CachedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Usamos useRef para el caché para evitar re-renders innecesarios al setearlo
  const dataCache = useRef<CachedData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Si ya tenemos los datos en caché, no los volvemos a buscar
      if (dataCache.current) {
        setData(dataCache.current);
        setIsLoading(false);
        return;
      }

      try {
        const = await Promise.all([
          fetch('/data/cr-geo/provinces.geojson'),
          fetch('/data/cr-geo/cantons.geojson'),
          fetch('/data/cr-geo/districts.geojson'),
        ]);

        if (!provincesRes.ok ||!cantonsRes.ok ||!districtsRes.ok) {
          throw new Error('Failed to fetch GeoJSON data');
        }

        const provinces: ProvinceFC = await provincesRes.json();
        const cantons: CantonFC = await cantonsRes.json();
        const districts: DistrictFC = await districtsRes.json();

        // Pre-procesar datos para búsquedas eficientes (O(1))
        const cantonsByProvince = new Map<string, CantonFeature>();
        cantons.features.forEach(canton => {
          const provinceName = canton.properties.provincia;
          if (!cantonsByProvince.has(provinceName)) {
            cantonsByProvince.set(provinceName,);
          }
          cantonsByProvince.get(provinceName)?.push(canton);
        });

        const districtsByCanton = new Map<string, DistrictFeature>();
        districts.features.forEach(district => {
          const cantonName = district.properties.canton;
          if (!districtsByCanton.has(cantonName)) {
            districtsByCanton.set(cantonName,);
          }
          districtsByCanton.get(cantonName)?.push(district);
        });
        
        const processedData = {
          provinces,
          cantons,
          districts,
          cantonsByProvince,
          districtsByCanton,
        };

        dataCache.current = processedData;
        setData(processedData);

      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  },);

  const getProvinces = useCallback(() => {
    if (!data) return;
    // Ordenar alfabéticamente para una mejor UX en los selectores
    return [...data.provinces.features].sort((a, b) => 
      a.properties.provincia.localeCompare(b.properties.provincia)
    );
  }, [data]);

  const getCantonsByProvince = useCallback((provinceName: string | null) => {
    if (!data ||!provinceName) return;
    const cantons = data.cantonsByProvince.get(provinceName) ||;
    // Ordenar alfabéticamente
    return [...cantons].sort((a, b) => 
      a.properties.canton.localeCompare(b.properties.canton)
    );
  }, [data]);

  const getDistrictsByCanton = useCallback((provinceName: string | null, cantonName: string | null) => {
    if (!data ||!provinceName ||!cantonName) return;
    // Filtramos primero por cantón, que es más específico
    const districts = data.districtsByCanton.get(cantonName) ||;
    // Luego, nos aseguramos que pertenezcan a la provincia correcta para evitar ambigüedades
    const filteredDistricts = districts.filter(d => d.properties.provincia === provinceName);
    // Ordenar alfabéticamente
    return.sort((a, b) => 
      a.properties.distrito.localeCompare(b.properties.distrito)
    );
  }, [data]);

  const findLocationByCoords = useCallback((coords: { lat: number; lng: number }) => {
    if (!data) return null;

    const point = turf.point([coords.lng, coords.lat]);

    let foundDistrict: DistrictFeature | null = null;
    for (const district of data.districts.features) {
      if (turf.booleanPointInPolygon(point, district.geometry)) {
        foundDistrict = district;
        break;
      }
    }

    if (foundDistrict) {
      return {
        province: foundDistrict.properties.provincia,
        canton: foundDistrict.properties.canton,
        district: foundDistrict.properties.distrito,
      };
    }

    // Fallback si no se encuentra en un distrito (p.ej., en el océano cerca de la costa)
    let foundCanton: CantonFeature | null = null;
    for (const canton of data.cantons.features) {
      if (turf.booleanPointInPolygon(point, canton.geometry)) {
        foundCanton = canton;
        break;
      }
    }

    if (foundCanton) {
        return {
            province: foundCanton.properties.provincia,
            canton: foundCanton.properties.canton,
            district: null,
        };
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