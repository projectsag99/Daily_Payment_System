import { z } from "zod";
import {
  CLIENT_STATUSES,
  NOTIFY_CHANNELS,
  RULE_TYPES,
  SHIFT_TYPES,
} from "@/lib/constants";
import {
  ROUTE_CITIES_BY_COUNTRY,
  ROUTE_COUNTRY_CODES,
  RouteCountryCode,
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

export const createClientSchema = z.object({
  code: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  nationalId: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine: z.string().optional(),
  city: z.string().max(100).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export type CreateClientFormValues = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  nationalId: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine: z.string().optional(),
  city: z.string().max(100).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  notes: z.string().optional(),
});

export type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

export const createRouteSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(100),
    country: z.enum(ROUTE_COUNTRY_CODES, {
      errorMap: () => ({ message: "Selecciona un país" }),
    }),
    city: z.string().min(1, "Selecciona una ciudad").max(100),
    description: z.string().optional(),
    collectorId: z
      .union([z.literal(""), z.string().uuid("Selecciona un cobrador válido")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    const cities = ROUTE_CITIES_BY_COUNTRY[data.country as RouteCountryCode];
    if (!cities.includes(data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ciudad no válida para el país seleccionado",
        path: ["city"],
      });
    }
  });

export type CreateRouteFormValues = z.infer<typeof createRouteSchema>;

export const updateRouteSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    shift: z.enum(SHIFT_TYPES).optional(),
    dayOfWeek: z.coerce.number().min(0).max(6).nullable().optional(),
    isActive: z.boolean().optional(),
    description: z.string().nullable().optional(),
    country: z
      .union([z.literal(""), z.enum(ROUTE_COUNTRY_CODES)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    city: z
      .union([z.literal(""), z.string().min(1).max(100)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    if (data.country && data.city) {
      const cities = ROUTE_CITIES_BY_COUNTRY[data.country as RouteCountryCode];
      if (!cities.includes(data.city)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ciudad no válida para el país seleccionado",
          path: ["city"],
        });
      }
    }
  });

export type UpdateRouteFormValues = z.infer<typeof updateRouteSchema>;

export const assignCollectorSchema = z.object({
  collectorId: z.string().uuid(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
});

export type AssignCollectorFormValues = z.infer<typeof assignCollectorSchema>;

export const createCreditSchema = z.object({
  principalAmount: z.coerce.number().min(0.01),
  totalInstallments: z.coerce.number().int().min(1).max(3650),
  installmentAmount: z.coerce.number().min(0.01),
  startDate: z.string().min(1),
  interestRate: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type CreateCreditFormValues = z.infer<typeof createCreditSchema>;

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
