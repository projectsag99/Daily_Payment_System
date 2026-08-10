import { ClientRow, GeoPoint } from "../domain/client.types";

export interface ClientResponse {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  country: string | null;
  department: string | null;
  city: string | null;
  location: GeoPoint | null;
  status: string;
  notes: string | null;
  activeCreditsCount: number;
  overdueInstallmentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function mapClientRow(row: ClientRow): ClientResponse {
  const hasLocation = row.lat !== null && row.lng !== null;
  return {
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    nationalId: row.national_id,
    phone: row.phone,
    email: row.email,
    addressLine: row.address_line,
    country: row.country,
    department: row.department,
    city: row.city,
    location: hasLocation ? { lat: Number(row.lat), lng: Number(row.lng) } : null,
    status: row.status,
    notes: row.notes,
    activeCreditsCount: Number(row.active_credits_count ?? 0),
    overdueInstallmentsCount: Number(row.overdue_installments_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseNearParam(near?: string): GeoPoint | undefined {
  if (!near) {
    return undefined;
  }
  const parts = near.split(",").map((p) => p.trim());
  if (parts.length !== 2) {
    return undefined;
  }
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return undefined;
  }
  return { lat, lng };
}
