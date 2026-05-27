/**
 * Dropdown allowing clinicians to choose a specialty and load its anamnese template.
 * The component fetches the template via `/api/templates/:especialidadeId` and
 * invokes the `onTemplateLoad` callback with the retrieved data.
 */
export declare const SpecialtyTemplateSelector: ({ clinicId, onTemplateLoad, }: {
    clinicId: string;
    onTemplateLoad: (template: any) => void;
}) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SpecialtyTemplateSelector.d.ts.map