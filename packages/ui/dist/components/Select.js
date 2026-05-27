"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
exports.Select = react_1.default.forwardRef(({ label, error, helperText, options, placeholder, required, className, ...props }, ref) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5 w-full", children: [label && ((0, jsx_runtime_1.jsxs)("label", { className: "text-[10px] font-bold uppercase tracking-[0.15em] font-mono", style: { color: 'var(--select-label)' }, children: [label, " ", required && (0, jsx_runtime_1.jsx)("span", { className: "text-danger-500", "aria-hidden": "true", children: "*" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("select", { ref: ref, className: (0, cn_1.cn)("h-9 px-3 pr-10 text-[13px] border w-full transition-colors duration-150 outline-none appearance-none cursor-pointer", error
                            ? "border-danger-500 focus:border-danger-600"
                            : "focus:border-[#1a1a1a] hover:border-[#a3a3a3]", "disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:border-[#e5e5e5] disabled:text-[#a3a3a3]", className), style: {
                            backgroundColor: 'var(--select-bg)',
                            borderColor: 'var(--select-border)',
                            color: 'var(--select-text)'
                        }, "aria-invalid": !!error, ...props, children: [placeholder && ((0, jsx_runtime_1.jsx)("option", { value: "", disabled: true, className: "bg-white text-neutral-400", children: placeholder })), options.map((opt) => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, className: "bg-white text-neutral-800", children: opt.label }, opt.value)))] }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none", children: (0, jsx_runtime_1.jsx)("svg", { className: "w-4 h-4 opacity-70", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", style: { color: 'var(--select-chevron)' }, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M19 9l-7 7-7-7" }) }) })] }), error && (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-medium text-danger-600 font-mono mt-0.5", children: error }), !error && helperText && (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-neutral-500 font-sans mt-0.5", children: helperText })] }));
});
exports.Select.displayName = 'Select';
//# sourceMappingURL=Select.js.map