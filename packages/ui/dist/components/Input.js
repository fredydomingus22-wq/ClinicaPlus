"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
exports.Input = react_1.default.forwardRef(({ label, error, helperText, required, className, ...props }, ref) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5 w-full", children: [label && ((0, jsx_runtime_1.jsxs)("label", { className: "text-[10px] font-bold uppercase tracking-[0.15em] font-mono", style: { color: 'var(--input-label)' }, children: [label, " ", required && (0, jsx_runtime_1.jsx)("span", { className: "text-danger-500", "aria-hidden": "true", children: "*" })] })), (0, jsx_runtime_1.jsx)("input", { ref: ref, className: (0, cn_1.cn)("h-9 px-3 text-[13px] border w-full transition-colors duration-150 outline-none", error
                    ? "border-danger-500 focus:border-danger-600"
                    : "focus:border-[#1a1a1a] hover:border-[#a3a3a3]", "disabled:bg-[#f5f5f5] disabled:border-[#e5e5e5] disabled:cursor-not-allowed disabled:text-[#a3a3a3]", className), style: {
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                }, onFocus: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--input-focus-bg)';
                    props.onFocus?.(e);
                }, onBlur: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--input-bg)';
                    props.onBlur?.(e);
                }, "aria-invalid": !!error, placeholder: label ? undefined : props.placeholder, ...props }), error && (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-medium text-danger-600 font-mono mt-0.5", children: error }), !error && helperText && (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-neutral-500 font-medium leading-tight mt-0.5", children: helperText })] }));
});
exports.Input.displayName = 'Input';
//# sourceMappingURL=Input.js.map