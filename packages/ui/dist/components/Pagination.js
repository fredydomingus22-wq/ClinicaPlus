"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pagination = Pagination;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("./Button");
function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, className = '', }) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-center justify-between gap-4 ${className}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] font-bold text-[#737373] uppercase tracking-[0.15em] font-mono", children: ["P\u00E1gina ", (0, jsx_runtime_1.jsx)("span", { className: "text-[#1a1a1a]", children: currentPage }), " de ", (0, jsx_runtime_1.jsx)("span", { className: "text-[#1a1a1a]", children: totalPages })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "secondary", size: "sm", className: "h-8 w-8 p-0 border-[#e5e5e5]", onClick: () => onPageChange(currentPage - 1), disabled: currentPage === 1, children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-1", children: Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const pageNum = i + 1;
                            const isActive = pageNum === currentPage;
                            return ((0, jsx_runtime_1.jsx)("button", { onClick: () => onPageChange(pageNum), className: `
                  h-8 min-w-[32px] px-2 text-[11px] font-bold font-mono transition-colors border
                  ${isActive
                                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                                    : 'text-[#737373] border-[#e5e5e5] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}
                `, children: pageNum }, pageNum));
                        }) }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "secondary", size: "sm", className: "h-8 w-8 p-0 border-neutral-200", onClick: () => onPageChange(currentPage + 1), disabled: currentPage === totalPages, children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" }) })] })] }));
}
//# sourceMappingURL=Pagination.js.map