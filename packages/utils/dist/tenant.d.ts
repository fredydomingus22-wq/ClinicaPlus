/**
 * Utilitários para resolução de tenant (clínica) baseada em subdomínio.
 *
 * Em produção, o hostname será algo como `nutrimacho.clinicaplus.ao`.
 * Em desenvolvimento, usa-se query param `?tenant=slug` ou configuração explícita.
 */
/** Slugs reservados que não podem ser usados como subdomínio de tenant. */
export declare const RESERVED_SLUGS: ReadonlySet<string>;
/**
 * Configuração do resolver de tenant.
 * O frontend deve passar estas opções baseadas nas variáveis de ambiente Vite.
 */
export interface TenantResolverOptions {
    /** Domínio base (ex: `clinicaplus.ao`). Usa o padrão se omitido. */
    baseDomain?: string;
    /** Slug de tenant de fallback para desenvolvimento local. */
    devTenantSlug?: string;
}
/**
 * Extrai o slug do tenant a partir do hostname do browser.
 *
 * Ordem de resolução:
 * 1. Subdomínio real (ex: `nutrimacho.clinicaplus.ao` → `nutrimacho`)
 * 2. Query param `?tenant=slug` (dev/local only)
 * 3. Fallback `devTenantSlug` das opções (dev/local only)
 *
 * @param options - Configuração opcional do resolver.
 * @returns O slug do tenant ou `null` se estiver no domínio principal.
 */
export declare const getTenantSlugFromURL: (options?: TenantResolverOptions) => string | null;
/**
 * Verifica se o slug informado é um slug reservado do sistema.
 *
 * @param slug - O slug a ser verificado.
 * @returns `true` se o slug for reservado.
 */
export declare const isReservedSlug: (slug: string) => boolean;
/**
 * Constrói a URL completa de um tenant dado o slug.
 *
 * @param slug - Slug da clínica (ex: `nutrimacho`).
 * @param baseDomain - Domínio base (padrão: `clinicaplus.ao`).
 * @returns A URL completa (ex: `https://nutrimacho.clinicaplus.ao`).
 */
export declare const buildTenantURL: (slug: string, baseDomain?: string) => string;
//# sourceMappingURL=tenant.d.ts.map