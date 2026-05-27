"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const jsx_runtime_1 = require("react/jsx-runtime");
const Button_1 = require("./Button");
const cn_1 = require("../utils/cn");
function EmptyState({ icon: Icon, title, description, action, className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)("flex flex-col items-center justify-center text-center p-12", className), children: [Icon && ((0, jsx_runtime_1.jsx)("div", { className: "h-16 w-16 bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center mb-6", children: (0, jsx_runtime_1.jsx)(Icon, { className: "h-8 w-8 text-[#a3a3a3]" }) })), (0, jsx_runtime_1.jsxs)("div", { className: "max-w-xs mx-auto space-y-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[14px] font-bold text-[#1a1a1a] tracking-tight uppercase font-mono", children: title }), (0, jsx_runtime_1.jsx)("p", { className: "text-[#737373] text-[13px] leading-relaxed font-mono", children: description })] }), action && ((0, jsx_runtime_1.jsx)("div", { className: "mt-8", children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: action.variant || 'secondary', size: "sm", className: "px-8", onClick: action.onClick, children: action.label }) }))] }));
}
//# sourceMappingURL=EmptyState.js.map