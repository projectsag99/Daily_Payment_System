import { ClientStatus } from "@/lib/constants";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Client {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  city: string | null;
  location: GeoPoint | null;
  status: ClientStatus;
  notes: string | null;
  activeCreditsCount: number;
  overdueInstallmentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedClients {
  data: Client[];
  meta: PaginationMeta;
}

export interface ClientInstallment {
  id: string;
  creditId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

export interface ClientPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  capturedAt: string;
  recordedAt: string;
}
