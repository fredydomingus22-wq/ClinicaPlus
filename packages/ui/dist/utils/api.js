"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTemplateBySpecialty = fetchTemplateBySpecialty;
async function fetchTemplateBySpecialty(clinicId, specialtyId) {
    const baseUrl = import.meta.env.VITE_API_URL ?? '';
    const url = `${baseUrl}/clinicas/${clinicId}/templates/${specialtyId}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    return response.json();
}
//# sourceMappingURL=api.js.map