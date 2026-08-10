"use client";

import dynamic from "next/dynamic";
import {
  buildGoogleMapsUrl,
  formatRouteLocation,
} from "@/lib/constants/route-locations";
import { CLIENT_STATUS_LABELS } from "@/lib/constants";
import { Client } from "@/lib/types/clients";
import { formatDateTime } from "@/lib/utils/format";

const LocationMap = dynamic(
  () => import("@/components/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Cargando mapa…
      </div>
    ),
  },
);

function displayValue(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value;
}

export function ClientProfileCard({ client }: { client: Client }) {
  const locationLabel = formatRouteLocation(
    client.country,
    client.department,
    client.city,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Información del cliente</h2>

      <dl className="grid gap-4 sm:grid-cols-2">
        <ProfileField label="Código" value={client.code} mono />
        <ProfileField
          label="Estado"
          value={CLIENT_STATUS_LABELS[client.status]}
        />
        <ProfileField label="Nombre" value={client.firstName} />
        <ProfileField label="Apellido" value={client.lastName} />
        <ProfileField label="Cédula" value={displayValue(client.nationalId)} />
        <ProfileField label="Teléfono" value={displayValue(client.phone)} />
        <ProfileField label="Correo" value={displayValue(client.email)} />
        <ProfileField label="País, departamento y ciudad" value={locationLabel} />
        <ProfileField
          label="Dirección"
          value={displayValue(client.addressLine)}
          className="sm:col-span-2"
        />
        <ProfileField
          label="Registrado"
          value={formatDateTime(client.createdAt)}
        />
        <ProfileField
          label="Última actualización"
          value={formatDateTime(client.updatedAt)}
        />
        {client.notes?.trim() && (
          <ProfileField
            label="Notas"
            value={client.notes}
            className="sm:col-span-2"
          />
        )}
      </dl>

      {client.location && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Ubicación en mapa</h3>
              <p className="text-xs text-slate-500">
                {client.location.lat.toFixed(6)}, {client.location.lng.toFixed(6)}
              </p>
            </div>
            <a
              href={buildGoogleMapsUrl(client.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Abrir en Google Maps
            </a>
          </div>
          <div className="h-48 overflow-hidden rounded-lg border border-slate-200">
            <LocationMap
              center={client.location}
              zoom={16}
              value={client.location}
              onChange={() => undefined}
              readOnly
            />
          </div>
        </div>
      )}

      {!client.location && (
        <p className="mt-4 text-sm text-slate-500">
          Sin ubicación en mapa registrada.
        </p>
      )}
    </section>
  );
}

function ProfileField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-slate-900 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
