"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = Avatar;
const jsx_runtime_1 = require("react/jsx-runtime");
const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
};
function Avatar({ src, initials, size = 'md', className = '' }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: `
      relative inline-flex items-center justify-center shrink-0 bg-primary-100 text-primary-700 font-semibold overflow-hidden border border-primary-200 rounded-full
      ${sizeStyles[size]}
      ${className}
    `, children: src ? ((0, jsx_runtime_1.jsx)("img", { src: src, alt: initials, className: "h-full w-full object-cover" })) : ((0, jsx_runtime_1.jsx)("span", { children: initials })) }));
}
//# sourceMappingURL=Avatar.js.map