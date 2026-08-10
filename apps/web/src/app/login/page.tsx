"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth/auth-context";
import { getHomePath } from "@/lib/auth/session";
import { ApiError, isNetworkError } from "@/lib/api-client";
import { LoginFormValues, loginSchema } from "@/lib/schemas/auth.schema";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui-classes";

export default function LoginPage() {
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getHomePath(user));
    }
  }, [isAuthenticated, isLoading, user, router]);

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
    } catch (err) {
      let message = "No se pudo iniciar sesión";
      if (err instanceof ApiError) {
        message = err.message;
      } else if (isNetworkError(err)) {
        message =
          err instanceof Error
            ? err.message
            : "No se pudo conectar con la API. Verifica que esté activa.";
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError("root", { message });
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-card-hover">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-lg font-bold text-white shadow-md shadow-brand-600/30">
            DP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daily Payment
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Panel para administradores y cobradores
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-5"
          method="post"
        >
          <div>
            <label htmlFor="email" className={labelClass}>
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={`${btnPrimary} w-full`}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
