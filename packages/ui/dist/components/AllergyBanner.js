"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllergyBanner = AllergyBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
/**
 * AllergyBanner displays a warning if patient has allergies.
 * Null-safe: does not render if no allergies.
 */
function AllergyBanner({ alergias }) {
    if (!alergias || alergias.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-50 border border-red-100 p-4 flex items-start gap-3 animate-shake", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-10 w-10 bg-red-100 flex items-center justify-center shrink-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-5 w-5 text-red-600" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-red-900 uppercase tracking-widest", children: "Alerta de Alergias" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-red-700 font-medium mt-1", children: "Este paciente reportou as seguintes alergias:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2 mt-2", children: alergias.map((a, i) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider", children: a }, i))) })] })] }));
}
//# sourceMappingURL=AllergyBanner.js.map