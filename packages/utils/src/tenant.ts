/**
 * Utilitários para resolução de tenant (clínica) baseada em subdomínio.
 *
 * Em produção, o hostname será algo como `nutrimacho.clinicaplus.ao`.
 * Em desenvolvimento, usa-se query param `?tenant=slug` ou configuração explícita.
 */

/** Slugs reservados que não podem ser usados como subdomínio de tenant. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'www',
  'api',
  'app',
  'admin',
  'superadmin',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'assets',
  'static',
  'docs',
  'help',
  'support',
  'status',
  'blog',
  'staging',
  'dev',
  'test',
  'demo',
]);

/** Domínio base por defeito para produção. */
const DEFAULT_BASE_DOMAIN = 'clinicaplus.ao';

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
export const getTenantSlugFromURL = (options?: TenantResolverOptions): string | null => {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  const baseDomain = options?.baseDomain ?? DEFAULT_BASE_DOMAIN;

  // --- Caso 1: Produção — subdomínio real ---
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.replace(`.${baseDomain}`, '');
    if (subdomain && !RESERVED_SLUGS.has(subdomain)) {
      return subdomain;
    }
    return null;
  }

  // --- Caso 2: Desenvolvimento local ---
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal) return null;

  // 2a. Query param: http://localhost:5173/login?tenant=nutrimacho
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');
  if (tenantParam && /^[a-z0-9-]+$/.test(tenantParam)) {
    return tenantParam;
  }

  // 2b. Fallback configurado pelo chamador (normalmente via VITE_DEV_TENANT_SLUG)
  const devSlug = options?.devTenantSlug;
  if (devSlug && devSlug.trim() !== '') {
    return devSlug.trim();
  }

  return null;
};

/**
 * Verifica se o slug informado é um slug reservado do sistema.
 *
 * @param slug - O slug a ser verificado.
 * @returns `true` se o slug for reservado.
 */
export const isReservedSlug = (slug: string): boolean => {
  return RESERVED_SLUGS.has(slug.toLowerCase());
};

/**
 * Constrói a URL completa de um tenant dado o slug.
 *
 * @param slug - Slug da clínica (ex: `nutrimacho`).
 * @param baseDomain - Domínio base (padrão: `clinicaplus.ao`).
 * @returns A URL completa (ex: `https://nutrimacho.clinicaplus.ao`).
 */
export const buildTenantURL = (slug: string, baseDomain?: string): string => {
  const domain = baseDomain ?? DEFAULT_BASE_DOMAIN;
  return `https://${slug}.${domain}`;
};
