import { z } from "zod";

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
