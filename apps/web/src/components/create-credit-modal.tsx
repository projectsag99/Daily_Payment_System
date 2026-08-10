"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  CreditFormFields,
  CreditSummaryPanel,
} from "@/components/credit-form-fields";
import { ApiError } from "@/lib/api-client";
import { fetchClientRoutes } from "@/lib/api/clients";
import { createCredit } from "@/lib/api/credits";
import { getCurrencyForCountry } from "@/lib/constants/currencies";
import { buildCreateCreditPayload } from "@/lib/domain/credit-calculator";
import {
  CREATE_CREDIT_DEFAULTS,
  CreditTermsFormValues,
  creditTermsFormSchema,
} from "@/lib/schemas/auth.schema";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui-classes";

export function CreateCreditModal({
  clientId,
  clientCountry,
  onClose,
  onSuccess,
}: {
  clientId: string;
  clientCountry: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routesQuery = useQuery({
    queryKey: ["client-routes", clientId],
    queryFn: () => fetchClientRoutes(clientId),
  });

  const routes = routesQuery.data ?? [];
  const requiresRouteSelection = routes.length > 1;
  const singleRoute = routes.length === 1 ? routes[0] : null;

  const form = useForm<CreditTermsFormValues>({
    resolver: zodResolver(creditTermsFormSchema),
    defaultValues: {
      creditInterestPercent: CREATE_CREDIT_DEFAULTS.creditInterestPercent,
      creditInstallments: CREATE_CREDIT_DEFAULTS.creditInstallments,
      creditAmountAlreadyPaid: CREATE_CREDIT_DEFAULTS.creditAmountAlreadyPaid,
      creditStartDate: CREATE_CREDIT_DEFAULTS.creditStartDate(),
    },
  });

  const selectedRouteId = form.watch("routeId");
  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? singleRoute;
  const currency =
    selectedRoute?.currency ??
    (clientCountry ? getCurrencyForCountry(clientCountry) ?? "COP" : "COP");

  const creditAmount = form.watch("creditAmount");
  const creditInterestPercent = form.watch("creditInterestPercent");
  const creditInstallments = form.watch("creditInstallments");
  const creditStartDate = form.watch("creditStartDate");
  const creditAmountAlreadyPaid = form.watch("creditAmountAlreadyPaid");

  useEffect(() => {
    if (singleRoute) {
      form.setValue("routeId", singleRoute.id);
    }
  }, [singleRoute, form]);

  async function handleSubmit(values: CreditTermsFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const payload = buildCreateCreditPayload(values, currency);
      await createCredit(clientId, payload);
      onSuccess?.();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Error al crear crédito",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const routeSelector = routesQuery.isLoading ? (
    <p className="text-sm text-slate-600">Cargando rutas…</p>
  ) : requiresRouteSelection ? (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Ruta *
      </label>
      <select
        className={inputClass}
        {...form.register("routeId", { required: true })}
        onChange={(event) => form.setValue("routeId", event.target.value)}
      >
        <option value="">Selecciona una ruta</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.name}
            {route.city ? ` · ${route.city}` : ""}
          </option>
        ))}
      </select>
      {form.formState.errors.routeId && (
        <p className="mt-1 text-sm text-red-600">
          Selecciona la ruta del crédito
        </p>
      )}
    </div>
  ) : singleRoute ? (
    <input type="hidden" {...form.register("routeId")} />
  ) : null;

  return (
    <Modal title="Nuevo crédito" onClose={onClose} wide>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        <CreditFormFields
          register={form.register}
          watch={form.watch}
          setValue={form.setValue}
          errors={form.formState.errors}
          currency={currency}
          routeSelector={routeSelector}
        />

        <CreditSummaryPanel
          creditAmount={creditAmount}
          creditInterestPercent={creditInterestPercent}
          creditInstallments={creditInstallments}
          creditStartDate={creditStartDate}
          creditAmountAlreadyPaid={creditAmountAlreadyPaid}
          currency={currency}
        />

        {submitError && <Alert variant="error">{submitError}</Alert>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || routesQuery.isLoading}
            className={btnPrimary}
          >
            {isSubmitting ? "Creando…" : "Crear crédito"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
