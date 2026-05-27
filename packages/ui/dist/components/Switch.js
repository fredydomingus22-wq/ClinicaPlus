"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Switch = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Switch = ({ checked, onCheckedChange, label, description, className, disabled, ...props }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)("flex items-center justify-between gap-4", className), children: [(label || description) && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [label && (0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-bold text-[#1a1a1a] leading-tight font-mono uppercase tracking-tight", children: label }), description && (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-[#737373] font-mono", children: description })] })), (0, jsx_runtime_1.jsx)("button", { type: "button", role: "switch", "aria-checked": checked, disabled: disabled, onClick: () => !disabled && onCheckedChange(!checked), className: (0, cn_1.cn)("relative inline-flex h-5 w-10 shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none", checked ? "bg-[#10b981]" : "bg-[#e5e5e5]", disabled && "opacity-50 cursor-not-allowed"), children: (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, cn_1.cn)("pointer-events-none inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out", checked ? "translate-x-5" : "translate-x-0") }) }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "sr-only", checked: checked, onChange: (e) => onCheckedChange(e.target.checked), disabled: disabled, ...props })] }));
};
exports.Switch = Switch;
//# sourceMappingURL=Switch.js.map