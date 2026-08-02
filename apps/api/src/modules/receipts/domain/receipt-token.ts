import { randomBytes } from "crypto";

const TOKEN_BYTE_LENGTH = 32;

export function generateReceiptPublicToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

export function buildReceiptPublicUrl(baseUrl: string, token: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/r/${token}`;
}

export function addDaysFromNow(days: number): Date {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt;
}

export function isLinkExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
