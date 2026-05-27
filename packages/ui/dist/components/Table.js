"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = Table;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
function Table({ columns, data, keyExtractor, isLoading, emptyMessage = 'Nenhum registo encontrado', emptyContent, className, onRowHover, onRowClick, renderExpandedRow, tableTestId, itemTestId }) {
    const safeData = Array.isArray(data) ? data : [];
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("overflow-x-auto border", className), style: { backgroundColor: 'var(--table-bg)', borderColor: 'var(--table-border)' }, "data-testid": tableTestId, children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-sm border-collapse", children: [(0, jsx_runtime_1.jsx)("thead", { className: "border-b", style: { backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border)' }, children: (0, jsx_runtime_1.jsx)("tr", { children: columns.map((col, idx) => ((0, jsx_runtime_1.jsx)("th", { className: (0, cn_1.cn)("px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-left font-mono", col.className), style: { color: 'var(--table-text-muted)' }, children: col.header }, idx))) }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y", style: { borderColor: 'var(--table-border)' }, children: isLoading ? (
                    // Skeletons
                    Array.from({ length: 4 }).map((_, i) => ((0, jsx_runtime_1.jsx)("tr", { className: "animate-pulse", style: { backgroundColor: 'var(--table-bg)' }, children: columns.map((_, j) => ((0, jsx_runtime_1.jsx)("td", { className: "px-5 py-4", children: (0, jsx_runtime_1.jsx)("div", { className: "h-4 w-full", style: { backgroundColor: 'var(--table-header-bg)' } }) }, j))) }, i)))) : safeData.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: columns.length, className: "px-5 py-12 text-center font-medium", style: { color: 'var(--table-text-muted)' }, children: emptyContent || emptyMessage }) })) : (safeData.map((item) => ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [(0, jsx_runtime_1.jsx)("tr", { className: (0, cn_1.cn)("transition-colors duration-200", onRowClick && "cursor-pointer hover:bg-neutral-50"), style: { backgroundColor: 'var(--table-bg)' }, onClick: onRowClick ? () => onRowClick(item) : undefined, onMouseEnter: onRowHover ? () => onRowHover(item) : undefined, "data-testid": typeof itemTestId === 'function' ? itemTestId(item) : itemTestId, children: columns.map((col, idx) => ((0, jsx_runtime_1.jsx)("td", { className: (0, cn_1.cn)("px-5 py-4 font-medium", col.className), style: { color: 'var(--table-text)' }, children: typeof col.accessor === 'function'
                                        ? col.accessor(item)
                                        : item[col.accessor] }, idx))) }), renderExpandedRow && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: columns.length, className: "p-0 border-none", children: renderExpandedRow(item) }) }))] }, keyExtractor(item))))) })] }) }));
}
//# sourceMappingURL=Table.js.map