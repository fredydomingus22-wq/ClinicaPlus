import { z } from 'zod';

export const LoginSchema = z.object({
  clinicaSlug: z
    .string()
    .min(1, 'Introduz o nome da tua clínica')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  email: z
    .string()
    .min(1, 'Email obrigatório')
    .email('Introduz um email válido'),
  password: z
    .string()
    .min(1, 'Palavra-passe obrigatória'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const SuperAdminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email obrigatório')
    .email('Introduz um email válido'),
  password: z
    .string()
    .min(1, 'Palavra-passe obrigatória'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type SuperAdminLoginInput = z.infer<typeof SuperAdminLoginSchema>;
