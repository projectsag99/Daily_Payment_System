import { getAccessToken } from "@/lib/auth/session";

export function authHeaders() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No hay sesión activa");
  }
  return { token };
}
