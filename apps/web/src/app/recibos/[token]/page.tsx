"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import { fetchPublicReceipt } from "@/lib/api/receipts";
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

export default function PublicReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-receipt", token],
    queryFn: () => fetchPublicReceipt(token),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Comprobante de pago
          </h1>
          <p className="mt-1 text-sm text-slate-600">Daily Payment System</p>
        </div>

        {isLoading && (
          <p className="text-center text-sm text-slate-600">Cargando recibo…</p>
        )}

        {error && (
          <Alert variant="error">
            {error instanceof ApiError ? error.message : "Recibo no disponible."}
          </Alert>
        )}

        {data && (
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Número</dt>
              <dd className="font-medium">{data.receiptNumber}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Fecha</dt>
              <dd>{formatDateTime(data.date)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Monto</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatMoney(data.amount)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Método</dt>
              <dd>
                {PAYMENT_METHOD_LABELS[data.paymentMethod as PaymentMethod] ??
                  data.paymentMethod}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Cliente</dt>
              <dd>{data.clientFirstName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Cobrador</dt>
              <dd>{data.collectorFirstName}</dd>
            </div>
          </dl>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Vista pública con datos mínimos. No incluye documento de identidad ni
          dirección.
        </p>
      </div>
    </div>
  );
}
