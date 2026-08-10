import { z } from "zod";
import { computeCreditTerms } from "@/lib/domain/credit-calculator";
import {
  CLIENT_STATUSES,
  NOTIFY_CHANNELS,
  RULE_TYPES,
} from "@/lib/constants";
import {
  OTHER_ROUTE_CITY_VALUE,
  ROUTE_COUNTRY_CODES,
  formatPhoneWithCountryPrefix,
  resolveRouteCityValue,
} from "@/lib/constants/route-locations";

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(10, "Mínimo 10 caracteres"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const rejectCollectorSchema = z.object({
  reason: z.string().min(3, "Indica el motivo del rechazo").max(1000),
});

export type RejectCollectorFormValues = z.infer<typeof rejectCollectorSchema>;

export const approveCollectorSchema = z.object({
  employeeCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export type ApproveCollectorFormValues = z.infer<typeof approveCollectorSchema>;

const locationSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export const createClientSchema = z
  .object({
    firstName: z.string().min(1, "El nombre es obligatorio").max(100),
    lastName: z.string().min(1, "El apellido es obligatorio").max(100),
    nationalId: z.string().max(50).optional(),
    phoneLocal: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal("")),
    addressLine: z.string().optional(),
    country: z.enum(ROUTE_COUNTRY_CODES, {
      errorMap: () => ({ message: "Selecciona un país" }),
    }),
    department: z.string().min(1, "Selecciona un departamento").max(10),
    city: z.string().min(1, "Selecciona una ciudad").max(100),
    cityCustom: z.string().max(100).optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.city === OTHER_ROUTE_CITY_VALUE && !data.cityCustom?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe el nombre de la ciudad",
        path: ["cityCustom"],
      });
    }
  });

export type CreateClientFormValues = z.infer<typeof createClientSchema>;

const creditTermsFieldsSchema = z
  .object({
    creditAmount: z.coerce.number().min(0.01, "Ingresa el monto del crédito"),
    creditInterestPercent: z.coerce
      .number()
      .min(0, "El porcentaje no puede ser negativo")
      .max(100, "El porcentaje no puede superar 100"),
    creditInstallments: z.coerce
      .number()
      .int("Las cuotas deben ser un número entero")
      .min(1, "Mínimo 1 cuota")
      .max(3650, "Máximo 3650 cuotas"),
    creditStartDate: z.string().min(1, "Selecciona la fecha del crédito"),
    creditAmountAlreadyPaid: z.coerce
      .number()
      .min(0, "El saldo pagado no puede ser negativo")
      .optional(),
    notes: z.string().optional(),
    routeId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const paid = data.creditAmountAlreadyPaid ?? 0;
    if (paid <= 0) {
      return;
    }

    const terms = computeCreditTerms({
      amount: data.creditAmount,
      interestPercent: data.creditInterestPercent,
      totalInstallments: data.creditInstallments,
      amountAlreadyPaid: paid,
    });

    if (paid > terms.totalToPay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El saldo pagado no puede superar el total a pagar",
        path: ["creditAmountAlreadyPaid"],
      });
    }
  });

export const creditTermsFormSchema = creditTermsFieldsSchema;

export type CreditTermsFormValues = z.infer<typeof creditTermsFormSchema>;

export const createClientWithCreditSchema =
  creditTermsFieldsSchema.and(createClientSchema);

export type CreateClientWithCreditFormValues = z.infer<
  typeof createClientWithCreditSchema
>;

export const CREATE_CREDIT_DEFAULTS = {
  creditInterestPercent: 20,
  creditInstallments: 24,
  creditAmountAlreadyPaid: 0,
  creditStartDate: () => new Date().toISOString().slice(0, 10),
} as const;

export const CREATE_CREDIT_INSTALLMENT_PRESETS = [24, 30] as const;

/** @deprecated Use CREATE_CREDIT_DEFAULTS */
export const CREATE_CLIENT_CREDIT_DEFAULTS = CREATE_CREDIT_DEFAULTS;

/** @deprecated Use CREATE_CREDIT_INSTALLMENT_PRESETS */
export const CREATE_CLIENT_INSTALLMENT_PRESETS = CREATE_CREDIT_INSTALLMENT_PRESETS;

export type CreateClientPayload = Omit<
  CreateClientFormValues,
  "cityCustom" | "phoneLocal"
> & {
  city: string;
  phone?: string;
};

export function toCreateClientPayload(
  values: CreateClientFormValues,
): CreateClientPayload {
  const { cityCustom, phoneLocal, lat, lng, email, country, department, city, ...rest } =
    values;
  return {
    ...rest,
    country,
    department,
    city: resolveRouteCityValue(city, cityCustom),
    phone: phoneLocal?.trim()
      ? formatPhoneWithCountryPrefix(country, phoneLocal)
      : undefined,
    email: email || undefined,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

export const updateClientSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    nationalId: z.string().max(50).optional(),
    phoneLocal: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal("")),
    addressLine: z.string().optional(),
    country: z
      .union([z.literal(""), z.enum(ROUTE_COUNTRY_CODES)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    department: z
      .union([z.literal(""), z.string().min(1).max(10)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    city: z
      .union([z.literal(""), z.string().min(1).max(100)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    cityCustom: z.string().max(100).optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.city === OTHER_ROUTE_CITY_VALUE && !data.cityCustom?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe el nombre de la ciudad",
        path: ["cityCustom"],
      });
    }
  });

export type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

export type UpdateClientPayload = Omit<
  UpdateClientFormValues,
  "cityCustom" | "phoneLocal"
> & {
  city?: string;
  phone?: string;
};

export function toUpdateClientPayload(
  values: UpdateClientFormValues,
): UpdateClientPayload {
  const { cityCustom, city, phoneLocal, country, ...rest } = values;
  const payload: UpdateClientPayload = { ...rest };
  if (city !== undefined) {
    payload.city = resolveRouteCityValue(city, cityCustom);
  }
  if (phoneLocal !== undefined && country) {
    payload.phone = phoneLocal.trim()
      ? formatPhoneWithCountryPrefix(country, phoneLocal)
      : "";
  }
  return payload;
}

export const createRouteSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(100),
    country: z.enum(ROUTE_COUNTRY_CODES, {
      errorMap: () => ({ message: "Selecciona un país" }),
    }),
    department: z.string().min(1, "Selecciona un departamento").max(10),
    city: z.string().min(1, "Selecciona una ciudad").max(100),
    cityCustom: z.string().max(100).optional(),
    description: z.string().optional(),
    collectorId: z
      .union([z.literal(""), z.string().uuid("Selecciona un cobrador válido")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    if (data.city === OTHER_ROUTE_CITY_VALUE && !data.cityCustom?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe el nombre de la ciudad",
        path: ["cityCustom"],
      });
    }
  });

export type CreateRouteFormValues = z.infer<typeof createRouteSchema>;

export type CreateRoutePayload = Omit<CreateRouteFormValues, "cityCustom"> & {
  city: string;
};

export function toCreateRoutePayload(
  values: CreateRouteFormValues,
): CreateRoutePayload {
  const { cityCustom, ...rest } = values;
  return {
    ...rest,
    city: resolveRouteCityValue(values.city, cityCustom),
  };
}

export const updateRouteSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    description: z.string().nullable().optional(),
    country: z
      .union([z.literal(""), z.enum(ROUTE_COUNTRY_CODES)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    department: z
      .union([z.literal(""), z.string().min(1).max(10)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    city: z
      .union([z.literal(""), z.string().min(1).max(100)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    cityCustom: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.city === OTHER_ROUTE_CITY_VALUE && !data.cityCustom?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe el nombre de la ciudad",
        path: ["cityCustom"],
      });
    }
  });

export type UpdateRouteFormValues = z.infer<typeof updateRouteSchema>;

export type UpdateRoutePayload = Omit<UpdateRouteFormValues, "cityCustom"> & {
  city?: string;
};

export function toUpdateRoutePayload(
  values: UpdateRouteFormValues,
): UpdateRoutePayload {
  const { cityCustom, city, ...rest } = values;
  return {
    ...rest,
    ...(city !== undefined
      ? { city: resolveRouteCityValue(city, cityCustom) }
      : {}),
  };
}

export const assignCollectorSchema = z.object({
  collectorId: z.string().uuid(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
});

export type AssignCollectorFormValues = z.infer<typeof assignCollectorSchema>;

/** @deprecated Use creditTermsFormSchema */
export const createCreditSchema = creditTermsFormSchema;

/** @deprecated Use CreditTermsFormValues */
export type CreateCreditFormValues = CreditTermsFormValues;

export const regenerateInstallmentsSchema = z.object({
  startDate: z.string().min(1),
  totalInstallments: z.coerce.number().int().min(1),
  installmentAmount: z.coerce.number().min(0.01),
});

export type RegenerateInstallmentsFormValues = z.infer<
  typeof regenerateInstallmentsSchema
>;

export const createRuleSchema = z.object({
  name: z.string().min(3).max(100),
  ruleType: z.enum(RULE_TYPES),
  thresholdCount: z.coerce.number().int().min(1).optional(),
  thresholdAmount: z.coerce.number().min(0.01).optional(),
  notifyChannel: z.enum(NOTIFY_CHANNELS).default("push"),
  cooldownHours: z.coerce.number().int().min(1).max(168).default(24),
  isActive: z.boolean().default(true),
});

export type CreateRuleFormValues = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleSchema.partial().extend({
  name: z.string().min(3).max(100).optional(),
});

export type UpdateRuleFormValues = z.infer<typeof updateRuleSchema>;

export function buildRuleConfig(values: {
  ruleType: (typeof RULE_TYPES)[number];
  thresholdCount?: number;
  thresholdAmount?: number;
}): Record<string, unknown> {
  if (values.ruleType === "overdue_installments_threshold") {
    return {
      thresholdCount: values.thresholdCount ?? 1,
      scope: "assigned_collector",
    };
  }
  return {
    thresholdAmount: values.thresholdAmount ?? 1,
    scope: "assigned_collector",
  };
}

export const reversePaymentSchema = z.object({
  reason: z.string().min(3, "Indica el motivo de la reversión").max(1000),
});

export type ReversePaymentFormValues = z.infer<typeof reversePaymentSchema>;

export const suspendCollectorSchema = z.object({
  reason: z.string().min(3, "Indica el motivo de la suspensión").max(1000),
});

export type SuspendCollectorFormValues = z.infer<typeof suspendCollectorSchema>;

export const deactivateCollectorSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export type DeactivateCollectorFormValues = z.infer<
  typeof deactivateCollectorSchema
>;
