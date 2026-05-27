"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialtyTemplateSelector = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// packages/ui/src/components/SpecialtyTemplateSelector.tsx
const react_1 = require("react");
const Select_1 = require("./Select");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../../utils/api");
/**
 * Dropdown allowing clinicians to choose a specialty and load its anamnese template.
 * The component fetches the template via `/api/templates/:especialidadeId` and
 * invokes the `onTemplateLoad` callback with the retrieved data.
 */
const SpecialtyTemplateSelector = ({ clinicId, onTemplateLoad, }) => {
    const [selected, setSelected] = (0, react_1.useState)('');
    const specialties = [
        { id: 'CARDIOLOGIA', label: 'Cardiologia' },
        { id: 'ODONTOLOGIA', label: 'Odontologia' },
        { id: 'PEDIATRIA', label: 'Pediatria' },
        { id: 'GINECOLOGIA', label: 'Ginecologia' },
    ];
    const { data, refetch, isFetching } = (0, react_query_1.useQuery)(['anamneseTemplate', selected], () => (0, api_1.fetchTemplateBySpecialty)(clinicId, selected), { enabled: false, staleTime: Infinity });
    (0, react_1.useEffect)(() => {
        if (data) {
            onTemplateLoad(data);
        }
    }, [data, onTemplateLoad]);
    const handleChange = (value) => {
        setSelected(value);
        if (value) {
            refetch();
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "mb-4", children: (0, jsx_runtime_1.jsx)(Select_1.Select, { label: "Especialidade", placeholder: "Selecione a especialidade", options: specialties.map((s) => ({ value: s.id, label: s.label })), value: selected, onChange: handleChange, disabled: isFetching }) }));
};
exports.SpecialtyTemplateSelector = SpecialtyTemplateSelector;
//# sourceMappingURL=SpecialtyTemplateSelector.js.map