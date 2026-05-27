import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    clinicaSlug: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    clinicaSlug: string;
}, {
    email: string;
    password: string;
    clinicaSlug: string;
}>;
export declare const ForgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    clinicaSlug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    clinicaSlug?: string | undefined;
}, {
    email: string;
    clinicaSlug?: string | undefined;
}>;
export declare const ResetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const SuperAdminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    mfaToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    mfaToken?: string | undefined;
}, {
    email: string;
    password: string;
    mfaToken?: string | undefined;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type SuperAdminLoginInput = z.infer<typeof SuperAdminLoginSchema>;
//# sourceMappingURL=auth.schema.d.ts.map