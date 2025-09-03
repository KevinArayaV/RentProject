"use client";

import axios from "axios";
import { toast } from "react-hot-toast";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { IoMdHome } from 'react-icons/io';
import { MdApartment } from 'react-icons/md';
import { Feature } from 'geojson';
import { useTranslations } from "next-intl";
import * as turf from '@turf/turf';

import useRentModal from "../../../hooks/useRentModal";
import useCostaRicaDivisions from "../../../hooks/useCostaRicaDivisions";

import Modal from "./Modal";
import Counter from "../inputs/Counter";
import CategoryInput from "../inputs/CategoryInput";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import Heading from "../Heading";
import InfoPopup from "../InfoPopup";
import ToggleInput from "../inputs/ToggleInput";

const customCategories = [
  { label: "Casa", icon: IoMdHome },
  { label: "Apartamento", icon: MdApartment },
];

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION_PRICE = 4,
}

// Coordenadas del centro de San José como fallback inicial
const initialCenter: [number, number] = [9.9281, -84.0907];

const RentModal = () => {
    const t = useTranslations('RentModal');
    const router = useRouter();
    const rentModal = useRentModal();
    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isGeolocating, setIsGeolocating] = useState(false);

    const { 
        getProvinces, 
        getCantonsByProvince, 
        getDistrictsByCanton, 
        findLocationByCoords,
        isLoading: isLocationDataLoading, // Renombramos para claridad
    } = useCostaRicaDivisions();

    const [selectedProvince, setSelectedProvince] = useState<Feature | null>(null);
    const [selectedCanton, setSelectedCanton] = useState<Feature | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<Feature | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
        reset,
    } = useForm<FieldValues>({
        defaultValues: {
            category: "",
            location: initialCenter, // Empezamos con una ubicación definida
            province: "",
            canton: "",
            district: "",
            roomCount: 1,
            bathroomCount: 1,
            garageCount: 0,
            imageSrc: "",
            title: "",
            description: "",
            includesWater: false,
            includesElectricity: false,
            includesInternet: false,
            allowsChildren: true,
            allowsPets: true,
            monthlyCost: "",
            address: "",
            contactPhone: "",
            contactWhatsapp: "",
        },
    });

    const location = watch("location");
    const category = watch("category");
    const contactPhone = watch("contactPhone");
    const isWhatsappSame = watch("isWhatsappSame");
    const roomCount = watch("roomCount");
    const bathroomCount = watch("bathroomCount");
    const garageCount = watch("garageCount");
    const imageSrc = watch("imageSrc");
    const includesWater = watch("includesWater");
    const includesElectricity = watch("includesElectricity");
    const includesInternet = watch("includesInternet");
    const allowsChildren = watch("allowsChildren");
    const allowsPets = watch("allowsPets");

    const Map = useMemo(() =>
        dynamic(() => import('../Map'), { 
            ssr: false
        }),
    []);

    const setCustomValue = useCallback((id: string, value: any) => {
        setValue(id, value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
    }, [setValue]);

    useEffect(() => {
        if (isWhatsappSame) {
            setValue('contactWhatsapp', contactPhone);
        }
    }, [contactPhone, isWhatsappSame, setValue]);

    const handleProvinceChange = (provinceName: string) => {
        const province = getProvinces().find(p => p.properties.provincia === provinceName) || null;
        setSelectedProvince(province);
        setSelectedCanton(null);
        setSelectedDistrict(null);
        setCustomValue('province', provinceName);
        setCustomValue('canton', '');
        setCustomValue('district', '');
    };

    const handleCantonChange = (cantonName: string) => {
        if (!selectedProvince) return;
        const canton = getCantonsByProvince(selectedProvince.properties.provincia).find(c => c.properties.canton === cantonName) || null;
        setSelectedCanton(canton);
        setSelectedDistrict(null);
        setCustomValue('canton', cantonName);
        setCustomValue('district', '');
    };

    const handleDistrictChange = (districtName: string) => {
        if (!selectedProvince || !selectedCanton) return;
        const district = getDistrictsByCanton(selectedProvince.properties.provincia, selectedCanton.properties.canton).find(d => d.properties.distrito === districtName) || null;
        setSelectedDistrict(district);
        setCustomValue('district', districtName);
    };
    
    useEffect(() => {
        const targetBoundary = selectedDistrict || selectedCanton || selectedProvince;
        if (targetBoundary) {
            const center = turf.centerOfMass(targetBoundary).geometry.coordinates;
            setCustomValue('location', [center[1], center[0]]);
        }
    }, [selectedProvince, selectedCanton, selectedDistrict, setCustomValue]);

    const handleMapLocationChange = useCallback((newLocation: [number, number]) => {
        setCustomValue('location', newLocation);
        const found = findLocationByCoords({ lat: newLocation[0], lng: newLocation[1] });
        
        if (found) {
            const updateState = (province: string, canton?: string | null, district?: string | null) => {
                handleProvinceChange(province);
                setTimeout(() => {
                    if (canton) {
                        handleCantonChange(canton);
                        setTimeout(() => {
                            if (district) handleDistrictChange(district);
                        }, 50);
                    }
                }, 50);
            };

            if (found.province && watch('province') !== found.province) {
                updateState(found.province, found.canton, found.district);
            } else if (found.canton && watch('canton') !== found.canton) {
                updateState(found.province, found.canton, found.district);
            } else if (found.district && watch('district') !== found.district) {
                updateState(found.province, found.canton, found.district);
            }
        }
    }, [setCustomValue, findLocationByCoords, watch]);

    // --- FUNCIONALIDAD DE GEOLOCALIZACIÓN RESTAURADA ---
    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta geolocalización.");
            return;
        }
        setIsGeolocating(true);
        toast.loading('Obteniendo tu ubicación...', { id: 'location-toast' });
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                toast.success("¡Ubicación encontrada!", { id: 'location-toast' });
                // Usamos la misma lógica que al arrastrar el mapa para mantener todo sincronizado
                handleMapLocationChange([latitude, longitude]);
                setIsGeolocating(false);
            },
            (error) => {
                toast.error("No se pudo obtener la ubicación.", { id: 'location-toast' });
                setIsGeolocating(false);
            },
            { enableHighAccuracy: true }
        );
    }, [handleMapLocationChange]);

    const onBack = () => setStep((value) => value - 1);
    const onNext = () => setStep((value) => value + 1);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (step !== STEPS.DESCRIPTION_PRICE) return onNext();
        // setIsLoading(true); // Reemplazado por isGeolocating para el botón de ubicación
        axios.post("/api/listings", data)
            .then(() => {
                toast.success("¡Propiedad creada con éxito!");
                router.refresh();
                reset();
                setStep(STEPS.CATEGORY);
                rentModal.onClose();
            })
            .catch(() => toast.error("Algo salió mal."))
            .finally(() => setIsLoading(false));
    };

    const actionLabel = useMemo(() => (step === STEPS.DESCRIPTION_PRICE ? t('create') : t('next')), [step, t]);
    const secondaryActionLabel = useMemo(() => (step === STEPS.CATEGORY ? undefined : t('back')), [step, t]);

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading title={t('categoryStepTitle')} subtitle={t('categoryStepSubtitle')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                {customCategories.map((item) => (
                    <div key={item.label} className="col-span-1">
                        <CategoryInput onClick={(cat) => setCustomValue("category", cat)} selected={category === item.label} label={item.label} icon={item.icon} />
                    </div>
                ))}
            </div>
        </div>
    );

    if (step === STEPS.LOCATION) {
        const provinces = getProvinces();
        const cantons = selectedProvince ? getCantonsByProvince(selectedProvince.properties.provincia) : [];
        const districts = selectedCanton ? getDistrictsByCanton(selectedProvince?.properties.provincia, selectedCanton.properties.canton) : [];
        const boundary = selectedDistrict || selectedCanton || selectedProvince || undefined;

        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading title={t('locationStepTitle')} subtitle={t('locationStepSubtitle')} />
                
                {isLocationDataLoading ? (
                    <div>Cargando datos del mapa...</div>
                ) : (
                    <>
                        <select onChange={(e) => handleProvinceChange(e.target.value)} value={watch('province')} className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed">
                            <option value="">Selecciona una Provincia</option>
                            {provinces.map(p => <option key={p.properties.provincia} value={p.properties.provincia}>{p.properties.provincia}</option>)}
                        </select>

                        <select onChange={(e) => handleCantonChange(e.target.value)} value={watch('canton')} disabled={!selectedProvince} className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed">
                            <option value="">Selecciona un Cantón</option>
                            {cantons.map(c => <option key={c.properties.canton} value={c.properties.canton}>{c.properties.canton}</option>)}
                        </select>

                        <select onChange={(e) => handleDistrictChange(e.target.value)} value={watch('district')} disabled={!selectedCanton} className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed">
                            <option value="">Selecciona un Distrito</option>
                            {districts.map(d => <option key={d.properties.distrito} value={d.properties.distrito}>{d.properties.distrito}</option>)}
                        </select>
                    </>
                )}

                <Input id="address" label={t('addressLabel')} disabled={isGeolocating} register={register} errors={errors} required />
                
                <button onClick={handleGetLocation} disabled={isGeolocating} className="p-4 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition disabled:bg-rose-300">
                    {isGeolocating ? 'Buscando...' : t('useMyLocation')}
                </button>

                <div className="relative h-[40vh] rounded-lg mt-2">
                    <InfoPopup message={t('dragMarkerInfo')} />
                    <Map center={location} onLocationChange={handleMapLocationChange} boundary={boundary as Feature | undefined} />
                </div>
            </div>
        );
    }

    // ... (los otros pasos INFO, IMAGES, DESCRIPTION_PRICE se mantienen igual)
    // ... (código para los otros pasos)

    return (
        <Modal
            disabled={isGeolocating}
            isOpen={rentModal.isOpen}
            title={t('title')}
            actionLabel={actionLabel}
            onSubmit={handleSubmit(onSubmit)}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
            onClose={rentModal.onClose}
            body={bodyContent}
        />
    );
};

export default RentModal;