"use strict";
/**
 * Utilitários para resolução de tenant (clínica) baseada em subdomínio.
 *
 * Em produção, o hostname será algo como `nutrimacho.clinicaplus.ao`.
 * Em desenvolvimento, usa-se query param `?tenant=slug` ou configuração explícita.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTenantURL = exports.isReservedSlug = exports.getTenantSlugFromURL = exports.RESERVED_SLUGS = void 0;
/** Slugs reservados que não podem ser usados como subdomínio de tenant. */
exports.RESERVED_SLUGS = new Set([
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
const getTenantSlugFromURL = (options) => {
    if (typeof window === 'undefined')
        return null;
    const hostname = window.location.hostname;
    const baseDomain = options?.baseDomain ?? DEFAULT_BASE_DOMAIN;
    // --- Caso 1: Produção — subdomínio real ---
    if (hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.replace(`.${baseDomain}`, '');
        if (subdomain && !exports.RESERVED_SLUGS.has(subdomain)) {
            return subdomain;
        }
        return null;
    }
    // --- Caso 2: Desenvolvimento local ---
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal)
        return null;
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
exports.getTenantSlugFromURL = getTenantSlugFromURL;
/**
 * Verifica se o slug informado é um slug reservado do sistema.
 *
 * @param slug - O slug a ser verificado.
 * @returns `true` se o slug for reservado.
 */
const isReservedSlug = (slug) => {
    return exports.RESERVED_SLUGS.has(slug.toLowerCase());
};
exports.isReservedSlug = isReservedSlug;
/**
 * Constrói a URL completa de um tenant dado o slug.
 *
 * @param slug - Slug da clínica (ex: `nutrimacho`).
 * @param baseDomain - Domínio base (padrão: `clinicaplus.ao`).
 * @returns A URL completa (ex: `https://nutrimacho.clinicaplus.ao`).
 */
const buildTenantURL = (slug, baseDomain) => {
    const domain = baseDomain ?? DEFAULT_BASE_DOMAIN;
    return `https://${slug}.${domain}`;
};
exports.buildTenantURL = buildTenantURL;
//# sourceMappingURL=tenant.js.map