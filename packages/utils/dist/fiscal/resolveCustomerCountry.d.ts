/**
 * Resolve ISO 3166-1 alpha-2 customer country for AGT FE payloads.
 * Explicit value wins; otherwise infer from VAT-style NIF prefix (e.g. PT987654321).
 */
export declare function resolveCustomerCountry(nif?: string | null, explicit?: string | null): string;
//# sourceMappingURL=resolveCustomerCountry.d.ts.map