"use client";

import { useAuth } from "@/lib/auth/auth-context";

export default function AccountSuspendedPage() {
  const { logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <h1 className="text-xl font-semibold text-red-900">Cuenta suspendida</h1>
      <p className="mt-3 text-sm text-red-800">
        Tu cuenta de cobrador está suspendida. Contacta al administrador para
        más información.
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-900 hover:bg-red-100"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
