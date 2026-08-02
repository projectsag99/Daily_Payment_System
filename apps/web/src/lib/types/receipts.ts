import { PaginationMeta } from "@/lib/types/clients";

export interface ReceiptPublicView {
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  collectorFirstName: string;
  clientFirstName: string;
}

export interface ReceiptLinkSummary {
  id: string;
  publicUrl: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface ReceiptMetadata {
  id: string;
  paymentId: string;
  receiptNumber: string;
  status: string;
  generatedAt: string | null;
}

export interface ReceiptDownloadUrl {
  url: string;
  expiresAt: string;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: PaginationMeta;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  payload: Record<string, unknown> | null;
  sentAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  createdAt: string;
}
