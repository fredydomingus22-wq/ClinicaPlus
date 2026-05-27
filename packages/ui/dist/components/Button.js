"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
function Button({ variant = 'primary', size = 'md', loading = false, fullWidth = false, children, className, disabled, ...props }) {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-900 disabled:opacity-40 disabled:pointer-events-none outline-none text-[13px] tracking-tight';
    const variants = {
        primary: 'bg-[#1a1a1a] text-white hover:bg-black border border-transparent',
        secondary: 'bg-white text-[#1a1a1a] border border-[#d4d4d4] hover:bg-[#f5f5f5]',
        danger: 'bg-[#991b1b] text-white hover:bg-[#7f1d1d] border border-transparent',
        ghost: 'bg-transparent text-[#404040] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]',
        outline: 'bg-white text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#f5f5f5]',
    };
    const sizes = {
        sm: 'h-7 px-3 text-[11px]',
        md: 'h-9 px-4 text-[13px]',
        lg: 'h-10 px-6 text-sm',
    };
    return ((0, jsx_runtime_1.jsx)("button", { className: (0, cn_1.cn)(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className), disabled: disabled || loading, ...props, children: loading ? ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-current", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), (0, jsx_runtime_1.jsx)("span", { children: "A processar..." })] })) : children }));
}
//# sourceMappingURL=Button.js.map