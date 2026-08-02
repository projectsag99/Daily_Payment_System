"use client";

import { useAuth } from "@/lib/auth/auth-context";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-xl font-semibold text-amber-900">
        Cuenta pendiente de aprobación
      </h1>
      <p className="mt-3 text-sm text-amber-800">
        {user
          ? `${user.firstName}, tu registro fue recibido pero un administrador aún no ha aprobado tu cuenta de cobrador.`
          : "Tu registro fue recibido pero un administrador aún no ha aprobado tu cuenta."}
      </p>
      <p className="mt-2 text-sm text-amber-700">
        Cuando seas aprobado podrás ver tus rutas del día aquí.
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
