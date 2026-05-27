"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroBanner = HeroBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
/**
 * Ultra-Minimalist "Spartan" Hero Header.
 * Discreet, high-density, and efficient.
 * Uses only official project tokens and fonts.
 */
function HeroBanner({ title, subtitle, action, className }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("w-full px-5 py-4 mb-6 bg-white border border-neutral-100 shadow-sm", className), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-0.5", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-bold tracking-tight text-neutral-900 leading-tight", children: title }), subtitle && ((0, jsx_runtime_1.jsx)("p", { className: "text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-90", children: subtitle }))] }), action && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center shrink-0", children: action }))] }) }));
}
//# sourceMappingURL=HeroBanner.js.map