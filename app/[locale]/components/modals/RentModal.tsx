"use client";

import axios from "axios";
import { toast } from "react-hot-toast";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { IoMdHome } from 'react-icons/io';
import { MdApartment } from 'react-icons/md';
import useRentModal from "../../../hooks/useRentModal";
import { useTranslations } from "next-intl";
import locationsData from '@/app/data/costa-rica-locations.json';
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

const costaRicaBounds = {
  southWest: { lat: 8.04, lng: -87.09 },
  northEast: { lat: 11.23, lng: -82.56 },
};

const RentModal = () => {
    const t = useTranslations('RentModal');
    const router = useRouter();
    const rentModal = useRentModal();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(STEPS.CATEGORY);
    const [mapZoom, setMapZoom] = useState(8);
    const [selectedFeature, setSelectedFeature] = useState<any>(null);
    const isGeolocating = useRef(false);

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
            location: null,
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
            province: null,
            canton: null,
            district: null,
            contactPhone: "",
            contactWhatsapp: "",
        },
    });

    const category = watch("category");
    const location = watch("location");
    const roomCount = watch("roomCount");
    const bathroomCount = watch("bathroomCount");
    const garageCount = watch("garageCount");
    const imageSrc = watch("imageSrc");
    const includesWater = watch("includesWater");
    const includesElectricity = watch("includesElectricity");
    const includesInternet = watch("includesInternet");
    const allowsChildren = watch("allowsChildren");
    const allowsPets = watch("allowsPets");
    const monthlyCost = watch("monthlyCost");
    const province = watch("province");
    const canton = watch("canton");
    const district = watch("district");
    const contactPhone = watch("contactPhone");
    const isWhatsappSame = watch("isWhatsappSame");

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

    // AQUÍ ESTÁ LA FUNCIÓN QUE FALTABA:
    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta geolocalización.");
            return;
        }
        
        setIsLoading(true);
        isGeolocating.current = true;
        toast.loading('Obteniendo tu ubicación...', { id: 'location-toast' });
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                const isInBounds = latitude >= costaRicaBounds.southWest.lat &&
                                 latitude <= costaRicaBounds.northEast.lat &&
                                 longitude >= costaRicaBounds.southWest.lng &&
                                 longitude <= costaRicaBounds.northEast.lng;
                
                if (!isInBounds) {
                    toast.error("Función solo disponible para ubicaciones dentro de Costa Rica.", { id: 'location-toast' });
                    setIsLoading(false);
                    isGeolocating.current = false;
                    return;
                }

                setCustomValue("location", { latlng: [latitude, longitude] });
                setMapZoom(16);
                
                // Intentar encontrar la provincia/cantón basado en las coordenadas
                handleMapLocationChange([latitude, longitude]);
                
                toast.success("¡Ubicación encontrada!", { id: 'location-toast' });
                setIsLoading(false);
                setTimeout(() => {
                    isGeolocating.current = false;
                }, 100);
            },
            (error) => {
                toast.error("No se pudo obtener la ubicación.", { id: 'location-toast' });
                setIsLoading(false);
                isGeolocating.current = false;
            },
            { enableHighAccuracy: true }
        );
    }, [setCustomValue]);

    const handleMapLocationChange = useCallback((newLocation: [number, number]) => {
        setCustomValue('location', { latlng: newLocation });
        
        // Buscar en qué provincia/cantón está el punto
        const findLocationFromCoords = (lat: number, lng: number) => {
            for (const [provCode, provincia] of Object.entries(locationsData.provincias)) {
                const provBbox = provincia.bbox;
                
                if (lng >= provBbox[0] && lng <= provBbox[2] && 
                    lat >= provBbox[1] && lat <= provBbox[3]) {
                    
                    // Buscar en cantones
                    for (const [cantonCode, canton] of Object.entries(provincia.cantones)) {
                        if (canton.bbox) {
                            const cantonBbox = canton.bbox;
                            if (lng >= cantonBbox[0] && lng <= cantonBbox[2] && 
                                lat >= cantonBbox[1] && lat <= cantonBbox[3]) {
                                
                                setCustomValue('province', provCode);
                                setCustomValue('canton', cantonCode);
                                setCustomValue('district', null);
                                
                                setSelectedFeature({
                                    type: 'Feature',
                                    properties: {},
                                    geometry: {
                                        type: 'Polygon',
                                        coordinates: [[
                                            [cantonBbox[0], cantonBbox[1]],
                                            [cantonBbox[2], cantonBbox[1]],
                                            [cantonBbox[2], cantonBbox[3]],
                                            [cantonBbox[0], cantonBbox[3]],
                                            [cantonBbox[0], cantonBbox[1]]
                                        ]]
                                    }
                                });
                                
                                return;
                            }
                        }
                    }
                    
                    // Solo provincia encontrada
                    setCustomValue('province', provCode);
                    setCustomValue('canton', null);
                    setCustomValue('district', null);
                    
                    setSelectedFeature({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [provBbox[0], provBbox[1]],
                                [provBbox[2], provBbox[1]],
                                [provBbox[2], provBbox[3]],
                                [provBbox[0], provBbox[3]],
                                [provBbox[0], provBbox[1]]
                            ]]
                        }
                    });
                    
                    return;
                }
            }
            
            // No encontrado
            setCustomValue('province', null);
            setCustomValue('canton', null);
            setCustomValue('district', null);
            setSelectedFeature(null);
        };
        
        findLocationFromCoords(newLocation[0], newLocation[1]);
    }, [setCustomValue]);
    
    useEffect(() => {
        if (isWhatsappSame) {
            setValue('contactWhatsapp', contactPhone);
        }
    }, [contactPhone, isWhatsappSame, setValue]);

    const onBack = () => setStep((value) => value - 1);
    const onNext = () => setStep((value) => value + 1);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (step !== STEPS.DESCRIPTION_PRICE) return onNext();
        setIsLoading(true);
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

    const actionLabel = useMemo(() => {
        if (step === STEPS.DESCRIPTION_PRICE) return t('create');
        return t('next');
    }, [step, t]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.CATEGORY) return undefined;
        return t('back');
    }, [step, t]);

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
        const provinces = Object.entries(locationsData.provincias).map(([code, data]) => ({
            value: code,
            label: data.nombre,
            bbox: data.bbox,
        }));
        
        const cantons = province ? Object.entries(locationsData.provincias[province]?.cantones || {}).map(([code, data]) => ({
            value: code,
            label: data.nombre,
            bbox: data.bbox,
        })) : [];
        
        const districts = (province && canton) ? Object.entries(locationsData.provincias[province]?.cantones[canton]?.distritos || {}).map(([code, data]) => ({
            value: code,
            label: data as string,
        })) : [];

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading 
                    title={t('locationStepTitle')} 
                    subtitle={t('locationStepSubtitle')} 
                />
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Provincia
                        </label>
                        <select 
                            value={province || ''} 
                            onChange={(e) => {
                                const selected = provinces.find(p => p.value === e.target.value);
                                setCustomValue('province', e.target.value || null);
                                setCustomValue('canton', null);
                                setCustomValue('district', null);
                                
                                if (selected?.bbox) {
                                    const centerLng = (selected.bbox[0] + selected.bbox[2]) / 2;
                                    const centerLat = (selected.bbox[1] + selected.bbox[3]) / 2;
                                    setCustomValue('location', { latlng: [centerLat, centerLng] });
                                    
                                    setSelectedFeature({
                                        type: 'Feature',
                                        properties: {},
                                        geometry: {
                                            type: 'Polygon',
                                            coordinates: [[
                                                [selected.bbox[0], selected.bbox[1]],
                                                [selected.bbox[2], selected.bbox[1]],
                                                [selected.bbox[2], selected.bbox[3]],
                                                [selected.bbox[0], selected.bbox[3]],
                                                [selected.bbox[0], selected.bbox[1]]
                                            ]]
                                        }
                                    });
                                }
                            }}
                            className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <option value="">Seleccione una provincia</option>
                            {provinces.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Cantón
                        </label>
                        <select 
                            value={canton || ''} 
                            onChange={(e) => {
                                const selected = cantons.find(c => c.value === e.target.value);
                                setCustomValue('canton', e.target.value || null);
                                setCustomValue('district', null);
                                
                                if (selected?.bbox) {
                                    const centerLng = (selected.bbox[0] + selected.bbox[2]) / 2;
                                    const centerLat = (selected.bbox[1] + selected.bbox[3]) / 2;
                                    setCustomValue('location', { latlng: [centerLat, centerLng] });
                                    
                                    setSelectedFeature({
                                        type: 'Feature',
                                        properties: {},
                                        geometry: {
                                            type: 'Polygon',
                                            coordinates: [[
                                                [selected.bbox[0], selected.bbox[1]],
                                                [selected.bbox[2], selected.bbox[1]],
                                                [selected.bbox[2], selected.bbox[3]],
                                                [selected.bbox[0], selected.bbox[3]],
                                                [selected.bbox[0], selected.bbox[1]]
                                            ]]
                                        }
                                    });
                                }
                            }}
                            disabled={!province}
                            className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <option value="">Seleccione un cantón</option>
                            {cantons.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Distrito
                        </label>
                        <select 
                            value={district || ''} 
                            onChange={(e) => {
                                setCustomValue('district', e.target.value || null);
                            }}
                            disabled={!canton}
                            className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <option value="">Seleccione un distrito</option>
                            {districts.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <Input 
                    id="address" 
                    label={t('addressLabel')} 
                    disabled={isLoading} 
                    register={register} 
                    errors={errors} 
                    required 
                />
                
                <button 
                    onClick={handleGetLocation} 
                    className="p-4 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition"
                    type="button"
                >
                    {t('useMyLocation')}
                </button>
                
                <div className="relative h-[40vh] rounded-lg">
                    <InfoPopup message={t('dragMarkerInfo')} />
                    <Map 
                        center={location?.latlng} 
                        zoom={mapZoom}
                        selectedFeature={selectedFeature}
                        onLocationChange={handleMapLocationChange} 
                    />
                </div>
            </div>
        );
    }

    // Resto de los steps (INFO, IMAGES, DESCRIPTION_PRICE) permanecen igual...
    if (step === STEPS.INFO) {
        bodyContent = (
          <div className="flex flex-col gap-8">
            <Heading title={t('infoStepTitle')} subtitle={t('infoStepSubtitle')} />
            <Counter onChange={(value) => setCustomValue("roomCount", value)} value={roomCount} title={t('rooms')} subTitle={t('roomsSubtitle')} />
            <hr />
            <Counter onChange={(value) => setCustomValue("bathroomCount", value)} value={bathroomCount} title={t('bathrooms')} subTitle={t('bathroomsSubtitle')} />
            <hr />
            <Counter onChange={(value) => setCustomValue("garageCount", value)} value={garageCount} title={t('garage')} subTitle={t('garageSubtitle')} minValue={0} />
            <hr />
            <Heading title={t('servicesTitle')} subtitle={t('servicesSubtitle')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesWater} onChange={(e) => setValue("includesWater", e.target.checked)} className="w-5 h-5"/><span>{t('includesWater')}</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesElectricity} onChange={(e) => setValue("includesElectricity", e.target.checked)} className="w-5 h-5"/><span>{t('includesElectricity')}</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesInternet} onChange={(e) => setValue("includesInternet", e.target.checked)} className="w-5 h-5"/><span>{t('includesInternet')}</span></label>
            </div>
            <hr />
            <ToggleInput label={t('allowChildren')} value={allowsChildren} onChange={(value) => setCustomValue('allowsChildren', value)} />
            <ToggleInput label={t('allowPets')} value={allowsPets} onChange={(value) => setCustomValue('allowsPets', value)} />
          </div>
        );
    }

    if (step === STEPS.IMAGES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title={t('imagesStepTitle')} subtitle={t('imagesStepSubtitle')} />
                <ImageUpload onChange={(value) => setCustomValue("imageSrc", value)} value={imageSrc} />
            </div>
        );
    }

    if (step === STEPS.DESCRIPTION_PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title={t('descriptionStepTitle')} subtitle={t('descriptionStepSubtitle')} />
                <Input id="title" label={t('listingTitleLabel')} disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Input id="description" label={t('descriptionLabel')} disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Heading title={t('priceStepTitle')} subtitle={t('priceStepSubtitle')} />
                <Input id="monthlyCost" label={t('monthlyCostLabel')} formatPrice type="number" disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Heading title={t('contactStepTitle')} subtitle={t('contactStepSubtitle')} />
                <Input id="contactPhone" label={t('phoneLabel')} type="tel" disabled={isLoading} register={register} errors={errors} required />
                <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('isWhatsappSame')} id="isWhatsappSame" className="w-5 h-5" />
                    <label htmlFor="isWhatsappSame">{t('sameWhatsapp')}</label>
                </div>
                {!isWhatsappSame && (
                    <Input id="contactWhatsapp" label={t('whatsappLabel')} type="tel" disabled={isLoading} register={register} errors={errors} required />
                )}
            </div>
        );
    }

    return (
        <Modal
            disabled={isLoading}
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