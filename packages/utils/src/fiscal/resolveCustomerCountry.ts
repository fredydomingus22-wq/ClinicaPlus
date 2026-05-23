/**
 * Resolve ISO 3166-1 alpha-2 customer country for AGT FE payloads.
 * Explicit value wins; otherwise infer from VAT-style NIF prefix (e.g. PT987654321).
 */
export function resolveCustomerCountry(
  nif?: string | null,
  explicit?: string | null
): string {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed.toUpperCase().slice(0, 2);
  }

  const fallback =
    (typeof process !== 'undefined' && process.env?.AGT_DEFAULT_CUSTOMER_COUNTRY) || 'AO';

  if (!nif) return fallback;

  const clean = nif.replace(/\s/g, '').toUpperCase();
  if (clean === '999999999' || clean === '999999990' || clean === 'CONSUMIDORFINAL') {
    return fallback;
  }

  const vatMatch = clean.match(/^([A-Z]{2})(\d{4,})/);
  const vatCountry = vatMatch?.[1];
  if (vatCountry && vatCountry !== 'AO') {
    return vatCountry;
  }

  return 'AO';
}
