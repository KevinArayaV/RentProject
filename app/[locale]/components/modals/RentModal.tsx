"use client";

import axios from "axios";
import { toast } from "react-hot-toast";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { IoMdHome } from "react-icons/io";
import { MdApartment } from "react-icons/md";
import useRentModal from "../../../hooks/useRentModal";
import { useTranslations } from "next-intl";
import { useCostaRicaGeoJSON } from "../../../hooks/useCostaRicaGeoJSON";
import Modal from "./Modal";
import Counter from "../inputs/Counter";
import CategoryInput from "../inputs/CategoryInput";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import Heading from "../Heading";
import InfoPopup from "../InfoPopup";
import ToggleInput from "../inputs/ToggleInput";
import * as turf from "@turf/turf";

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

const RentModal = () => {
  const t = useTranslations("RentModal");
  const router = useRouter();
  const rentModal = useRentModal();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [Map, setMap] = useState<any>(null);

  const {
    geoData,
    findLocationByCoordinates,
    getProvinces,
    getCantonsByProvince,
    getDistrictsByCanton,
  } = useCostaRicaGeoJSON();

  // Load Map component dynamically
  useEffect(() => {
    import("../Map").then((mod) => {
      setMap(() => mod.default);
    });
  }, []);

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
      province: "",
      canton: "",
      district: "",
      contactPhone: "",
      contactWhatsapp: "",
    },
  });

  const category = watch("category");
  const location = watch("location");
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
  const contactPhone = watch("contactPhone");
  const isWhatsappSame = watch("isWhatsappSame");

  const setCustomValue = useCallback(
    (id: string, value: any) => {
      setValue(id, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const setFeatureCenter = useCallback(
    (feature: any) => {
      if (!feature) return;
      const center = turf.centroid(feature).geometry.coordinates;
      setCustomValue("location", { latlng: [center[1], center[0]] });
      setSelectedFeature(feature);
    },
    [setCustomValue]
  );

  const handleMapLocationChange = useCallback(
    (newLocation: [number, number]) => {
      setCustomValue("location", { latlng: newLocation });

      const found = findLocationByCoordinates(newLocation[0], newLocation[1]);
      if (found) {
        if (found.district) {
          setSelectedFeature(found.district);
          setCustomValue("district", found.district.properties.shapeID);
          setCustomValue("canton", found.canton?.properties.shapeID || "");
          setCustomValue("province", found.province?.properties.shapeID || "");
        } else if (found.canton) {
          setSelectedFeature(found.canton);
          setCustomValue("canton", found.canton.properties.shapeID);
          setCustomValue("province", found.province?.properties.shapeID || "");
          setCustomValue("district", "");
        } else if (found.province) {
          setSelectedFeature(found.province);
          setCustomValue("province", found.province.properties.shapeID);
          setCustomValue("canton", "");
          setCustomValue("district", "");
        }
      }
    },
    [findLocationByCoordinates, setCustomValue]
  );

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsLoading(true);
    toast.loading("Obteniendo tu ubicación...", { id: "location-toast" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCustomValue("location", { latlng: [latitude, longitude] });

        const found = findLocationByCoordinates(latitude, longitude);
        if (found) {
          setCustomValue("province", found.province?.properties.shapeID || "");
          setCustomValue("canton", found.canton?.properties.shapeID || "");
          setCustomValue("district", found.district?.properties.shapeID || "");
          setSelectedFeature(found.district || found.canton || found.province);
        }

        toast.success("¡Ubicación encontrada!", { id: "location-toast" });
        setIsLoading(false);
      },
      () => {
        toast.error("No se pudo obtener la ubicación.", {
          id: "location-toast",
        });
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [setCustomValue, findLocationByCoordinates]);

  useEffect(() => {
    if (isWhatsappSame) {
      setValue("contactWhatsapp", contactPhone);
    }
  }, [contactPhone, isWhatsappSame, setValue]);

  const onBack = () => setStep((value) => value - 1);
  const onNext = () => setStep((value) => value + 1);

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (step !== STEPS.DESCRIPTION_PRICE) return onNext();
    setIsLoading(true);
    axios
      .post("/api/listings", data)
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

  const actionLabel = step === STEPS.DESCRIPTION_PRICE ? t("create") : t("next");
  const secondaryActionLabel =
    step === STEPS.CATEGORY ? undefined : t("back");

  // Get dropdown options
  const provinces = getProvinces();
  const cantons = province ? getCantonsByProvince(province) : [];
  const districts = canton ? getDistrictsByCanton(canton) : [];

  let bodyContent = (
    <div className="flex flex-col gap-8">
      <Heading
        title={t("categoryStepTitle")}
        subtitle={t("categoryStepSubtitle")}
      />
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
    bodyContent = (
      // 1. REMOVED h-[60vh] FROM THIS PARENT CONTAINER
      <div className="flex flex-col gap-4">
        <Heading
          title={t("locationStepTitle")}
          subtitle={t("locationStepSubtitle")}
        />

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Provincia
            </label>
            <select
              value={province || ""}
              onChange={(e) => {
                const selected = provinces.find(
                  (p) => p.value === e.target.value
                );
                setCustomValue("province", e.target.value);
                setCustomValue("canton", "");
                setCustomValue("district", "");
                if (selected?.feature) {
                  setFeatureCenter(selected.feature);
                } else {
                  setSelectedFeature(null);
                }
              }}
              className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition"
            >
              <option value="">Seleccione una provincia</option>
              {provinces.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Cantón
            </label>
            <select
              value={canton || ""}
              onChange={(e) => {
                const selected = cantons.find(
                  (c) => c.value === e.target.value
                );
                setCustomValue("canton", e.target.value);
                setCustomValue("district", "");
                if (selected?.feature) {
                  setFeatureCenter(selected.feature);
                } else {
                  setSelectedFeature(null);
                }
              }}
              disabled={!province}
              className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70"
            >
              <option value="">Seleccione un cantón</option>
              {cantons.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Distrito
            </label>
            <select
              value={district || ""}
              onChange={(e) => {
                const selected = districts.find(
                  (d) => d.value === e.target.value
                );
                setCustomValue("district", e.target.value);
                if (selected?.feature) {
                  setFeatureCenter(selected.feature);
                } else {
                  setSelectedFeature(null);
                }
              }}
              disabled={!canton}
              className="w-full p-3 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70"
            >
              <option value="">Seleccione un distrito</option>
              {districts.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          id="address"
          label={t("addressLabel")}
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
          {t("useMyLocation")}
        </button>

        {Map && (
          // 2. REPLACED flex-1 WITH h-[40vh] ON THE MAP CONTAINER
          <div className="relative h-[40vh] rounded-lg overflow-hidden">
            <InfoPopup message={t("dragMarkerInfo")} />
            <Map
              center={location?.latlng}
              selectedFeature={selectedFeature}
              onLocationChange={handleMapLocationChange}
            />
          </div>
        )}
      </div>
    );
  }

  // Remaining steps
  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("infoStepTitle")}
          subtitle={t("infoStepSubtitle")}
        />
        <Counter
          onChange={(value) => setCustomValue("roomCount", value)}
          value={roomCount}
          title={t("rooms")}
          subTitle={t("roomsSubtitle")}
        />
        <hr />
        <Counter
          onChange={(value) => setCustomValue("bathroomCount", value)}
          value={bathroomCount}
          title={t("bathrooms")}
          subTitle={t("bathroomsSubtitle")}
        />
        <hr />
        <Counter
          onChange={(value) => setCustomValue("garageCount", value)}
          value={garageCount}
          title={t("garage")}
          subTitle={t("garageSubtitle")}
          minValue={0}
        />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("imagesStepTitle")}
          subtitle={t("imagesStepSubtitle")}
        />
        <ImageUpload
          onChange={(value) => setCustomValue("imageSrc", value)}
          value={imageSrc}
        />
      </div>
    );
  }

  if (step === STEPS.DESCRIPTION_PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("descriptionStepTitle")}
          subtitle={t("descriptionStepSubtitle")}
        />
        <Input
          id="title"
          label={t("listingTitleLabel")}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="description"
          label={t("descriptionLabel")}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="monthlyCost"
          label={t("monthlyCostLabel")}
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="contactPhone"
          label={t("phoneLabel")}
          type="tel"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={rentModal.isOpen}
      title={t("title")}
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
