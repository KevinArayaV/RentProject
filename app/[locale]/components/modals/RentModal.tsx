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

import useCostaRicaDivisions from "../../../hooks/useCostaRicaDivisions";
import useRentModal from "../../../hooks/useRentModal";

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
        allData: geoJsonData,
        isLoading: isLocationDataLoading
    } = useCostaRicaDivisions();

    const [mapBoundary, setMapBoundary] = useState<Feature | undefined>(undefined);

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
            location: initialCenter,
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
    const province = watch("province");
    const canton = watch("canton");
    const district = watch("district");
    const roomCount = watch("roomCount");
    const bathroomCount = watch("bathroomCount");
    const garageCount = watch("garageCount");
    const imageSrc = watch("imageSrc");
    const includesWater = watch("includesWater");
    const includesElectricity = watch("includesElectricity");
    const includesInternet = watch("includesInternet");
    const allowsChildren = watch("allowsChildren");
    const allowsPets = watch("allowsPets");

    const Map = useMemo(() => dynamic(() => import('../Map'), { ssr: false }), []);

    const setCustomValue = useCallback((id: string, value: any) => {
        setValue(id, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }, [setValue]);

    useEffect(() => {
        if (isWhatsappSame) setValue('contactWhatsapp', contactPhone);
    }, [contactPhone, isWhatsappSame, setValue]);

    useEffect(() => {
        if (!geoJsonData) return;

        let feature;
        if (district) {
            feature = geoJsonData.districts.features.find(f => f.properties.distrito === district && f.properties.canton === canton);
        } else if (canton) {
            feature = geoJsonData.cantons.features.find(f => f.properties.canton === canton && f.properties.provincia === province);
        } else if (province) {
            feature = geoJsonData.provinces.features.find(f => f.properties.provincia === province);
        }
        
        setMapBoundary(feature as Feature | undefined);

        if (feature) {
            const center = turf.centerOfMass(feature).geometry.coordinates;
            setCustomValue('location', [center[1], center[0]]);
        }

    }, [province, canton, district, geoJsonData, setCustomValue]);

    const handleMapLocationChange = useCallback((newLocation: [number, number]) => {
        setCustomValue('location', newLocation);
        const found = findLocationByCoords({ lat: newLocation[0], lng: newLocation[1] });
        
        if (found) {
            setCustomValue('province', found.province);
            setCustomValue('canton', found.canton || '');
            setCustomValue('district', found.district || '');
        }
    }, [setCustomValue, findLocationByCoords]);

    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta geolocalización.");
            return;
        }
        setIsGeolocating(true);
        toast.loading('Obteniendo tu ubicación...', { id: 'location-toast' });
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                toast.success("¡Ubicación encontrada!", { id: 'location-toast' });
                handleMapLocationChange([position.coords.latitude, position.coords.longitude]);
                setIsGeolocating(false);
            },
            () => {
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

    const actionLabel = useMemo(() => (step === STEPS.DESCRIPTION_PRICE ? t('create') : t('next')), [step, t]);
    const secondaryActionLabel = useMemo(() => (step === STEPS.CATEGORY ? undefined : t('back')), [step, t]);

    // --- RENDERIZADO DEL MODAL ---

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading title={t('categoryStepTitle')} subtitle={t('categoryStepSubtitle')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                {customCategories.map((item) => (
                    <div key={item.label} className="col-span-1">
                        <CategoryInput 
                            onClick={(cat) => setCustomValue("category", cat)} 
                            selected={category === item.label} 
                            label={item.label} 
                            icon={item.icon} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    if (step === STEPS.LOCATION) {
        const provincesList = getProvinces();
        const cantonsList = getCantonsByProvince(province);
        const districtsList = getDistrictsByCanton(province, canton);

        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading title={t('locationStepTitle')} subtitle={t('locationStepSubtitle')} />
                
                <select 
                    value={province} 
                    onChange={(e) => {
                        setCustomValue('province', e.target.value);
                        setCustomValue('canton', '');
                        setCustomValue('district', '');
                    }} 
                    className="w-full p-4 font-light bg-white border-2 rounded-md outline-none"
                >
                    <option value="">Selecciona una Provincia</option>
                    {provincesList.map(p => <option key={p.properties.provincia} value={p.properties.provincia}>{p.properties.provincia}</option>)}
                </select>

                <select 
                    value={canton} 
                    onChange={(e) => {
                        setCustomValue('canton', e.target.value);
                        setCustomValue('district', '');
                    }} 
                    disabled={!province} 
                    className="w-full p-4 font-light bg-white border-2 rounded-md outline-none disabled:opacity-70"
                >
                    <option value="">Selecciona un Cantón</option>
                    {cantonsList.map(c => <option key={c.properties.canton} value={c.properties.canton}>{c.properties.canton}</option>)}
                </select>

                <select 
                    value={district}
                    onChange={(e) => setCustomValue('district', e.target.value)}
                    disabled={!canton} 
                    className="w-full p-4 font-light bg-white border-2 rounded-md outline-none disabled:opacity-70"
                >
                    <option value="">Selecciona un Distrito</option>
                    {districtsList.map(d => <option key={d.properties.distrito} value={d.properties.distrito}>{d.properties.distrito}</option>)}
                </select>

                <Input id="address" label={t('addressLabel')} disabled={isGeolocating} register={register} errors={errors} required />
                
                <button onClick={handleGetLocation} disabled={isGeolocating} className="p-4 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition disabled:bg-rose-300">
                    {isGeolocating ? 'Buscando...' : t('useMyLocation')}
                </button>

                <div className="relative h-[40vh] rounded-lg mt-2">
                    <InfoPopup message={t('dragMarkerInfo')} />
                    <Map center={location} onLocationChange={handleMapLocationChange} boundary={mapBoundary} />
                </div>
            </div>
        );
    }

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
                <Input id="title" label={t('listingTitleLabel')} disabled={isGeolocating} register={register} errors={errors} required />
                <hr />
                <Input id="description" label={t('descriptionLabel')} disabled={isGeolocating} register={register} errors={errors} required />
                <hr />
                <Heading title={t('priceStepTitle')} subtitle={t('priceStepSubtitle')} />
                <Input id="monthlyCost" label={t('monthlyCostLabel')} formatPrice type="number" disabled={isGeolocating} register={register} errors={errors} required />
                <hr />
                <Heading title={t('contactStepTitle')} subtitle={t('contactStepSubtitle')} />
                <Input id="contactPhone" label={t('phoneLabel')} type="tel" disabled={isGeolocating} register={register} errors={errors} required />
                <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('isWhatsappSame')} id="isWhatsappSame" className="w-5 h-5" />
                    <label htmlFor="isWhatsappSame">{t('sameWhatsapp')}</label>
                </div>
                {!isWhatsappSame && (
                    <Input id="contactWhatsapp" label={t('whatsappLabel')} type="tel" disabled={isGeolocating} register={register} errors={errors} required />
                )}
            </div>
        );
    }

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