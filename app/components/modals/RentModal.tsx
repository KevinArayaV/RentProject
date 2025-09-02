"use client";

import axios from "axios";
import { toast } from "react-hot-toast";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";

import { IoMdHome } from 'react-icons/io';
import { MdApartment } from 'react-icons/md';

import useRentModal from "@/app/hooks/useRentModal";

import Modal from "./Modal";
import Counter from "../inputs/Counter";
import CategoryInput from "../inputs/CategoryInput";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import Heading from "../Heading";
import InfoPopup from "@/app/components/InfoPopup";
import ToggleInput from "@/app/components/inputs/ToggleInput";

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

const provinceCoordinates: { [key: string]: [number, number] } = {
    "San José": [9.9281, -84.0907],
    Alajuela: [10.0163, -84.2117],
    Cartago: [9.8644, -83.9196],
    Heredia: [9.9983, -84.1194],
    Guanacaste: [10.6333, -85.4333],
    Puntarenas: [9.9766, -84.8384],
    Limón: [9.9913, -83.0315],
};

const getProvinceKey = (provinceName: string) => {
    const normalizedName = provinceName.replace('Provincia de ', '').trim();
    if (Object.keys(provinceCoordinates).includes(normalizedName)) {
        return normalizedName;
    }
    return null;
}

// ✅ Límites de Costa Rica para validación
const costaRicaBounds = {
  southWest: { lat: 8.04, lng: -87.09 },
  northEast: { lat: 11.23, lng: -82.56 },
};

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(STEPS.CATEGORY);
    const [mapZoom, setMapZoom] = useState(14);
    // ✅ 1. Añadimos la "bandera" para evitar la condición de carrera
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
            province: "San José",
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
    const address = watch("address");
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
    
    useEffect(() => {
        if (isWhatsappSame) {
            setValue('contactWhatsapp', contactPhone);
        }
    }, [contactPhone, isWhatsappSame, setValue]);

    // ✅ 2. El useEffect ahora respeta la "bandera"
    useEffect(() => {
        // Si la geolocalización está activa, no hagas nada.
        if (isGeolocating.current) {
            return;
        }
        if (province && provinceCoordinates[province]) {
            const coords = provinceCoordinates[province];
            setCustomValue("location", { latlng: coords });
            setMapZoom(14);
        }
    }, [province, setCustomValue]);

    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta geolocalización.");
            return;
        }
        setIsLoading(true);
        // ✅ 3. Levantamos la "bandera" antes de empezar
        isGeolocating.current = true;
        toast.loading('Obteniendo tu ubicación...', { id: 'location-toast' });
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // ✅ 4. Comprobamos si la ubicación está dentro de Costa Rica
                const isInBounds = latitude >= costaRicaBounds.southWest.lat &&
                                 latitude <= costaRicaBounds.northEast.lat &&
                                 longitude >= costaRicaBounds.southWest.lng &&
                                 longitude <= costaRicaBounds.northEast.lng;
                
                if (!isInBounds) {
                    toast.error("Función solo disponible para ubicaciones dentro de Costa Rica.", { id: 'location-toast' });
                    setIsLoading(false);
                    isGeolocating.current = false; // Bajamos la bandera
                    return;
                }

                setCustomValue("location", { latlng: [latitude, longitude] });
                setMapZoom(18);
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                    const response = await axios.get(url);
                    if (response.data?.address?.state) {
                        const provinceKey = getProvinceKey(response.data.address.state);
                        if (provinceKey) {
                            setCustomValue('province', provinceKey);
                        }
                    }
                } catch (error) { console.error("Error geocodificación inversa:", error); }
                
                toast.success("¡Ubicación encontrada!", { id: 'location-toast' });
                setIsLoading(false);
                // Bajamos la "bandera" un poco después para dar tiempo a que el estado se asiente
                setTimeout(() => {
                    isGeolocating.current = false;
                }, 100);
            },
            (error) => {
                toast.error("No se pudo obtener la ubicación.", { id: 'location-toast' });
                setIsLoading(false);
                // ✅ 3. Bajamos la "bandera" también en caso de error
                isGeolocating.current = false;
            },
            { enableHighAccuracy: true }
        );
    }, [setCustomValue]);

    const handleMapLocationChange = useCallback((newLocation: [number, number]) => {
        setCustomValue('location', { latlng: newLocation });
    }, [setCustomValue]);

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
        if (step === STEPS.DESCRIPTION_PRICE) return "Crear";
        return "Siguiente";
    }, [step]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.CATEGORY) return undefined;
        return "Atrás";
    }, [step]);

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading title="¿Cuál de estos describe mejor tu propiedad?" subtitle="Escoge una categoría" />
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
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title="¿Dónde se encuentra tu propiedad?" subtitle="¡Ayuda a los huéspedes a encontrarte!" />
                <select value={province} onChange={(e) => setCustomValue('province', e.target.value)} className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed">
                    {Object.keys(provinceCoordinates).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
                <Input id="address" label="Dirección (calle, número, señas)" disabled={isLoading} register={register} errors={errors} required />
                <button onClick={handleGetLocation} className="p-4 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition">
                    Usar mi ubicación actual
                </button>
                <div className="relative h-[40vh] rounded-lg">
                    <InfoPopup message="Puedes arrastrar el marcador para ajustar la ubicación." />
                    <Map center={location?.latlng} zoom={mapZoom} onLocationChange={handleMapLocationChange} />
                </div>
            </div>
        );
    }

    if (step === STEPS.INFO) {
        bodyContent = (
          <div className="flex flex-col gap-8">
            <Heading title="Comparte información básica sobre tu propiedad" subtitle="¿Qué comodidades ofreces?" />
            <Counter onChange={(value) => setCustomValue("roomCount", value)} value={roomCount} title="Habitaciones" subTitle="¿Cuántas habitaciones tienes?" />
            <hr />
            <Counter onChange={(value) => setCustomValue("bathroomCount", value)} value={bathroomCount} title="Baños" subTitle="¿Cuántos baños tienes?" />
            <hr />
            <Counter onChange={(value) => setCustomValue("garageCount", value)} value={garageCount} title="Cochera para vehículo" subTitle="¿Cuántos vehículos caben?" minValue={0} />
            <hr />
            <Heading title="¿Qué servicios y reglas ofreces?" subtitle="Selecciona lo que aplique." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesWater} onChange={(e) => setValue("includesWater", e.target.checked)} className="w-5 h-5"/><span>Incluye Agua</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesElectricity} onChange={(e) => setValue("includesElectricity", e.target.checked)} className="w-5 h-5"/><span>Incluye Electricidad</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includesInternet} onChange={(e) => setValue("includesInternet", e.target.checked)} className="w-5 h-5"/><span>Incluye Internet</span></label>
            </div>
            <hr />
            <ToggleInput label="¿Permites niños?" value={allowsChildren} onChange={(value) => setCustomValue('allowsChildren', value)} />
            <ToggleInput label="¿Permites mascotas?" value={allowsPets} onChange={(value) => setCustomValue('allowsPets', value)} />
          </div>
        );
      }

    if (step === STEPS.IMAGES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title="Agrega una foto de tu propiedad" subtitle="¡Muéstrale a los huéspedes cómo se ve!" />
                <ImageUpload onChange={(value) => setCustomValue("imageSrc", value)} value={imageSrc} />
            </div>
        );
    }

    if (step === STEPS.DESCRIPTION_PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title="Describe tu propiedad" subtitle="¡Algo corto y atractivo funciona mejor!" />
                <Input id="title" label="Título (ej: Apartamento moderno cerca de la ciudad)" disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Input id="description" label="Descripción" disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Heading title="Ahora, establece tu precio" subtitle="¿Cuánto cobras por mes?" />
                <Input id="monthlyCost" label="Costo Mensual" formatPrice type="number" disabled={isLoading} register={register} errors={errors} required />
                <hr />
                <Heading title="Información de Contacto" subtitle="¿Cómo te pueden contactar los interesados?" />
                <Input id="contactPhone" label="Número de teléfono" type="tel" disabled={isLoading} register={register} errors={errors} required />
                <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('isWhatsappSame')} id="isWhatsappSame" className="w-5 h-5" />
                    <label htmlFor="isWhatsappSame">Mi número de WhatsApp es el mismo.</label>
                </div>
                {!isWhatsappSame && (
                    <Input id="contactWhatsapp" label="Número de WhatsApp" type="tel" disabled={isLoading} register={register} errors={errors} required />
                )}
            </div>
        );
    }

    return (
        <Modal
            disabled={isLoading}
            isOpen={rentModal.isOpen}
            title="¡Publica tu propiedad en Casa Tica!"
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