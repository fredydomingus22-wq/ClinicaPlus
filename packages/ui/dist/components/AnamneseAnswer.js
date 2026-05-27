"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnamneseAnswer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const Select_1 = require("./Select");
const SelectionToggle_1 = require("./SelectionToggle");
const Input_1 = require("./Input");
const cn_1 = require("../utils/cn");
/**
 * Unified answer component used by the dynamic anamnese form.
 * It re‑uses the existing UI building blocks (`SelectionToggle`, `Select`, `Input`, `Textarea`)
 * to avoid any duplicated markup or styling while keeping the premium glass‑morphic look.
 */
const AnamneseAnswer = ({ label, type, value, onChange, options, comObservacao, labelObservacao, observacao, onObservacaoChange, error, disabled, }) => {
    // Helper to render the appropriate control based on `type`
    const renderControl = () => {
        switch (type) {
            case 'boolean':
                return ((0, jsx_runtime_1.jsx)(SelectionToggle_1.SelectionToggle, { label: label, value: value, onChange: onChange, type: "boolean", comObservacao: comObservacao, labelObservacao: labelObservacao, observacao: observacao, onObservacaoChange: onObservacaoChange, error: error, disabled: disabled }));
            case 'select':
                return ((0, jsx_runtime_1.jsx)(Select_1.Select, { label: label, value: value ?? '', onChange: onChange, options: options ?? [], error: error, disabled: disabled }));
            case 'text':
                return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium text-slate-700", children: label }), (0, jsx_runtime_1.jsx)(Input_1.Input, { value: value ?? '', onChange: e => onChange(e.target.value), placeholder: "Descreva aqui...", disabled: disabled, className: "md:max-w-xs" }), error && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-red-500 mt-1", children: error })] }));
            case 'date':
                return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium text-slate-700", children: label }), (0, jsx_runtime_1.jsx)(Input_1.Input, { type: "date", value: value ?? '', onChange: e => onChange(e.target.value), disabled: disabled, className: "md:max-w-xs" }), error && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-red-500 mt-1", children: error })] }));
            case 'multi_date':
                // For now we reuse a single date input – the backend will treat the value as a string of ISO dates.
                return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium text-slate-700", children: label }), (0, jsx_runtime_1.jsx)(Input_1.Input, { type: "date", value: value ?? '', onChange: e => onChange(e.target.value), disabled: disabled, className: "md:max-w-xs" }), error && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-red-500 mt-1", children: error })] }));
            default:
                return null;
        }
    };
    // The outer container follows the same glass‑morphic style as SelectionToggle for visual consistency.
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors', disabled && 'opacity-60 cursor-not-allowed'), children: renderControl() }));
};
exports.AnamneseAnswer = AnamneseAnswer;
//# sourceMappingURL=AnamneseAnswer.js.map