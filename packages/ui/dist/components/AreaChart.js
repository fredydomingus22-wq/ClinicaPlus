"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AreaChart = AreaChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Card_1 = require("./Card");
const cn_1 = require("../utils/cn");
/**
 * High-fidelity SVG Area Chart component.
 * Uses cubic curves for smoothing and CSS transitions for flair.
 */
function AreaChart({ title, subtitle, data, height = 240, className, isLoading = false }) {
    const [hoveredIdx, setHoveredIdx] = (0, react_1.useState)(null);
    const maxVal = (0, react_1.useMemo)(() => Math.max(...data.map(d => d.value), 1), [data]);
    // Chart dimensions & padding
    const paddingX = 40;
    const paddingY = 20;
    const chartWidth = 800; // Reference width for SVG coordinate system
    const chartHeight = 200;
    // Calculate SVG points
    const points = (0, react_1.useMemo)(() => {
        if (!data || data.length < 2)
            return [];
        return data.map((d, i) => {
            const x = paddingX + (i / (data.length - 1)) * (chartWidth - 2 * paddingX);
            const y = chartHeight - paddingY - (d.value / maxVal) * (chartHeight - 2 * paddingY);
            return { x, y };
        });
    }, [data, maxVal]);
    // Generate cubic Bezier path for smooth line
    const d = (0, react_1.useMemo)(() => {
        if (!points || points.length < 2)
            return "";
        // Safety check for first point
        const firstPoint = points[0];
        if (!firstPoint)
            return "";
        let path = `M ${firstPoint.x} ${firstPoint.y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            if (!curr || !next)
                continue;
            // Midpoint-based smoothing
            const cp1x = curr.x + (next.x - curr.x) / 3;
            const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
            path += ` C ${cp1x} ${curr.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
        }
        return path;
    }, [points]);
    // Path for the filled area (must close back to bottom)
    const areaD = (0, react_1.useMemo)(() => {
        if (!d || !points || points.length < 2)
            return "";
        const bottom = chartHeight - paddingY;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        if (!firstPoint || !lastPoint)
            return "";
        return `${d} L ${lastPoint.x} ${bottom} L ${firstPoint.x} ${bottom} Z`;
    }, [d, points]);
    return ((0, jsx_runtime_1.jsxs)(Card_1.Card, { className: (0, cn_1.cn)("flex flex-col p-6", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-neutral-900 text-lg leading-tight", children: title }), subtitle && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-neutral-500 mt-1 font-medium", children: subtitle })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 relative min-h-0", style: { height }, children: isLoading ? ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-full bg-neutral-50 animate-pulse flex items-center justify-center", children: (0, jsx_runtime_1.jsx)("div", { className: "w-1/2 h-4 bg-neutral-100" }) })) : !data || data.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-full flex items-center justify-center text-neutral-400 text-sm italic", children: "Sem dados para apresentar" })) : ((0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${chartWidth} ${chartHeight}`, preserveAspectRatio: "none", className: "w-full h-full overflow-visible", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: "areaGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: "#1d4ed8", stopOpacity: "0.1" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: "#1d4ed8", stopOpacity: "0" })] }) }), [0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                            const y = chartHeight - paddingY - p * (chartHeight - 2 * paddingY);
                            return ((0, jsx_runtime_1.jsx)("line", { x1: paddingX, y1: y, x2: chartWidth - paddingX, y2: y, stroke: "#e5e5e5", strokeWidth: "1" }, i));
                        }), areaD && (0, jsx_runtime_1.jsx)("path", { d: areaD, fill: "url(#areaGradient)", className: "transition-all duration-500" }), d && ((0, jsx_runtime_1.jsx)("path", { d: d, fill: "none", stroke: "#1d4ed8", strokeWidth: "2", strokeLinecap: "square", strokeLinejoin: "miter", className: "transition-all duration-500" })), points.map((p, i) => {
                            const prevX = i > 0 ? (points[i - 1]?.x ?? paddingX) : paddingX;
                            const nextX = i < points.length - 1 ? (points[i + 1]?.x ?? chartWidth - paddingX) : chartWidth - paddingX;
                            const leftX = i === 0 ? paddingX : (prevX + p.x) / 2;
                            const rightX = i === points.length - 1 ? chartWidth - paddingX : (nextX + p.x) / 2;
                            return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("rect", { x: leftX, y: 0, width: Math.max(rightX - leftX, 0), height: chartHeight, fill: "transparent", className: "cursor-crosshair z-30", onMouseEnter: () => setHoveredIdx(i), onMouseLeave: () => setHoveredIdx(null) }), hoveredIdx === i && ((0, jsx_runtime_1.jsx)("line", { x1: p.x, y1: p.y, x2: p.x, y2: chartHeight - paddingY, stroke: "#1d4ed8", strokeWidth: "1", strokeDasharray: "4 4", className: "opacity-50 pointer-events-none z-10" })), (0, jsx_runtime_1.jsx)("circle", { cx: p.x, cy: p.y, r: hoveredIdx === i ? 5 : 3, fill: "#ffffff", stroke: "#1d4ed8", strokeWidth: "2", className: "transition-all pointer-events-none z-20" }), (0, jsx_runtime_1.jsx)("text", { x: p.x, y: chartHeight - 2, textAnchor: "middle", className: "text-[9px] font-bold fill-[#737373] uppercase tracking-wider font-mono pointer-events-none", children: data[i]?.label })] }, `node-${i}`));
                        }), hoveredIdx !== null && points[hoveredIdx] && ((0, jsx_runtime_1.jsx)("foreignObject", { x: Math.max(0, Math.min(points[hoveredIdx].x - 45, chartWidth - 90)), y: Math.max(0, points[hoveredIdx].y - 35), width: "90", height: "35", className: "pointer-events-none z-50 overflow-visible", children: (0, jsx_runtime_1.jsx)("div", { className: "bg-[#1a1a1a] text-white text-[10px] font-bold py-1.5 px-3 border border-[#333] rounded-sm text-center font-mono whitespace-nowrap shadow-lg", children: data[hoveredIdx]?.value }) }))] })) })] }));
}
//# sourceMappingURL=AreaChart.js.map