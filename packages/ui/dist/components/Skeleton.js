"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skeleton = Skeleton;
exports.SkeletonRow = SkeletonRow;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Skeleton component for smooth loading states.
 */
function Skeleton({ className = '', variant = 'rect' }) {
    const variantClasses = {
        text: 'h-3 w-full rounded',
        rect: 'h-20 w-full',
        circle: 'h-10 w-10 rounded-full',
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: `bg-neutral-100 animate-pulse-slow ${variantClasses[variant]} ${className}` }));
}
/**
 * Skeleton row for tables.
 */
function SkeletonRow({ cols }) {
    return ((0, jsx_runtime_1.jsx)("tr", { className: "border-b border-neutral-100", children: Array.from({ length: cols }).map((_, i) => ((0, jsx_runtime_1.jsx)("td", { className: "px-4 py-4", children: (0, jsx_runtime_1.jsx)(Skeleton, { variant: "text", className: i === 0 ? 'w-3/4' : 'w-1/2' }) }, i))) }));
}
//# sourceMappingURL=Skeleton.js.map