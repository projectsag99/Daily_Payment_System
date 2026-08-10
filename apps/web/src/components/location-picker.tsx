"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import {
  buildGoogleMapsUrl,
  getCountryMapCenter,
  type GeoPoint,
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
  className,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(Boolean(value));

  const mapCenter = getCountryMapCenter(countryCode);

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

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Ubicación en mapa
      </label>
      <p className="mb-3 text-xs text-slate-500">
        Guarda la ubicación actual del dispositivo o elige un punto manualmente en el mapa.
      </p>

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
            center={value ?? mapCenter}
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
          Haz clic en el mapa para colocar el marcador. También puedes arrastrarlo después de colocarlo.
        </p>
      )}
    </div>
  );
}
