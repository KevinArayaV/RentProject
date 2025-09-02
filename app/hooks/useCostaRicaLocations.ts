// app/hooks/useCostaRicaLocations.ts
import { useState, useMemo, useCallback } from 'react';
import data from '@/app/data/costa-rica-locations.json';
// Interfaces para tipar la estructura del JSON
interface District { [key: string]: string; }
interface Canton { nombre: string; distritos: District; bbox?: number[]; }
interface Province { nombre: string; cantones: { [key: string]: Canton }; bbox: number[]; }
export interface LocationData {
provincias: { [key: string]: Province };
}
const useCostaRicaLocations = () => {
const [locations] = useState<LocationData>(data as LocationData);
const provinces = useMemo(() => {
return Object.keys(locations.provincias).map(code => ({
code: code,
name: locations.provincias[code].nombre
}));
}, [locations]);
const getCantons = useCallback((provinceCode: string) => {
if (!provinceCode || !locations.provincias[provinceCode]) return [];
const province = locations.provincias[provinceCode];
return Object.keys(province.cantones).map(code => ({
code: code,
name: province.cantones[code].nombre
}));
}, [locations]);
const getDistricts = useCallback((provinceCode: string, cantonCode: string) => {
if (!provinceCode || !cantonCode || !locations.provincias[provinceCode]?.cantones[cantonCode]) return [];
const canton = locations.provincias[provinceCode].cantones[cantonCode];
return Object.keys(canton.distritos).map(code => ({
code: code,
name: canton.distritos[code]
}));
}, [locations]);
// AÑADIDO: Función para obtener el objeto completo de un cantón, incluyendo su bbox
const getCanton = useCallback((provinceCode: string, cantonCode: string): Canton | null => {
if (!provinceCode || !cantonCode || !locations.provincias[provinceCode]?.cantones[cantonCode]) return null;
return locations.provincias[provinceCode].cantones[cantonCode];
}, [locations]);
// AÑADIDO: Función para obtener el objeto completo de una provincia, incluyendo su bbox
const getProvince = useCallback((provinceCode: string): Province | null => {
if (!provinceCode || !locations.provincias[provinceCode]) return null;
return locations.provincias[provinceCode];
}, [locations]);
return { provinces, getCantons, getDistricts, getCanton, getProvince };
};
export default useCostaRicaLocations;