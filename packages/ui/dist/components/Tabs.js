"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = Tabs;
const jsx_runtime_1 = require("react/jsx-runtime");
function Tabs({ items, activeTab, onChange, className = '' }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: `overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide flex items-center ${className}`, children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center min-w-full", children: items.map((item) => {
                const isActive = activeTab === item.id;
                return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onChange(item.id), className: `
                px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] font-mono transition-colors shrink-0
                ${isActive
                        ? 'text-[#1a1a1a] bg-[#f5f5f5]'
                        : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'}
              `, children: item.label }, item.id));
            }) }) }));
}
//# sourceMappingURL=Tabs.js.map