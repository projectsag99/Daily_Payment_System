"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OTHER_ROUTE_CITY_VALUE,
  buildGoogleMapsUrl,
  geocodeCityLocation,
  getLocationMapView,
  type GeoPoint,
  type LocationMapView,
} from "@/lib/constants/route-locations";

const LocationMap = dynamic(
  () => import("@/components/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Cargando mapa…
      </div>
    ),
  },
);

interface LocationPickerProps {
  value: GeoPoint | null;
  onChange: (location: GeoPoint | null) => void;
  countryCode?: string;
  departmentCode?: string;
  city?: string;
  cityCustom?: string;
  className?: string;
}

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Permiso de ubicación denegado. Actívalo en el navegador o elige el punto en el mapa.";
    case 2:
      return "No se pudo obtener la ubicación. Intenta de nuevo o marca el punto en el mapa.";
    case 3:
      return "La solicitud de ubicación tardó demasiado. Intenta de nuevo.";
    default:
      return "No se pudo obtener la ubicación actual.";
  }
}

export function LocationPicker({
  value,
  onChange,
  countryCode,
  departmentCode,
  city,
  cityCustom,
  className,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(Boolean(value));

  const resolvedCityName =
    city && city !== OTHER_ROUTE_CITY_VALUE
      ? city.trim()
      : cityCustom?.trim() ?? "";

  const baseMapView = useMemo(
    () =>
      getLocationMapView({
        countryCode,
        departmentCode,
        city,
        cityCustom,
      }),
    [countryCode, departmentCode, city, cityCustom],
  );

  const [mapView, setMapView] = useState<LocationMapView>(baseMapView);

  useEffect(() => {
    if (value) return;

    setMapView(baseMapView);

    const needsGeocode =
      Boolean(countryCode) &&
      Boolean(departmentCode) &&
      city === OTHER_ROUTE_CITY_VALUE &&
      Boolean(resolvedCityName) &&
      baseMapView.zoom < 13;

    if (!needsGeocode || !countryCode || !departmentCode) {
      setIsGeocoding(false);
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    void geocodeCityLocation({
      countryCode,
      departmentCode,
      cityName: resolvedCityName,
    }).then((point) => {
      if (cancelled || value) return;
      if (point) {
        setMapView({
          center: point,
          zoom: 13,
          label: resolvedCityName,
        });
      }
      setIsGeocoding(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    baseMapView,
    city,
    countryCode,
    departmentCode,
    resolvedCityName,
    value,
  ]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización. Usa el mapa para elegir la ubicación.");
      setShowMap(true);
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setShowMap(true);
        setIsLocating(false);
      },
      (positionError) => {
        setError(geolocationErrorMessage(positionError.code));
        setShowMap(true);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  }, [onChange]);

  const mapCenter = value ?? mapView.center;
  const mapZoom = value ? 16 : mapView.zoom;

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Ubicación en mapa
      </label>
      <p className="mb-3 text-xs text-slate-500">
        El mapa se centra en la ciudad seleccionada arriba. Guarda tu ubicación
        actual o elige un punto específico manualmente.
      </p>

      {countryCode && departmentCode && resolvedCityName ? (
        <p className="mb-3 text-xs text-brand-700">
          {isGeocoding
            ? `Buscando ${resolvedCityName} en el mapa…`
            : `Mapa centrado en ${mapView.label ?? resolvedCityName}.`}
        </p>
      ) : (
        <p className="mb-3 text-xs text-amber-700">
          Selecciona país, departamento y ciudad para centrar el mapa en esa zona.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="rounded-lg border border-brand-600 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
        >
          {isLocating ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
        </button>
        <button
          type="button"
          onClick={() => setShowMap((current) => !current)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          {showMap ? "Ocultar mapa" : "Elegir en el mapa"}
        </button>
        {value && (
          <>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Quitar ubicación
            </button>
            <a
              href={buildGoogleMapsUrl(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-brand-700 hover:bg-slate-50"
            >
              Abrir en Google Maps
            </a>
          </>
        )}
      </div>

      {value && (
        <p className="mt-2 text-xs text-slate-600">
          Ubicación seleccionada: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {showMap && (
        <div className="mt-3 h-56 overflow-hidden rounded-lg border border-slate-200 sm:h-64">
          <LocationMap
            center={mapCenter}
            zoom={mapZoom}
            value={value}
            onChange={(location) => {
              setError(null);
              onChange(location);
            }}
          />
        </div>
      )}

      {showMap && !value && (
        <p className="mt-2 text-xs text-slate-500">
          Haz clic en el mapa para colocar el marcador. También puedes arrastrarlo
          después de colocarlo.
        </p>
      )}
    </div>
  );
}
