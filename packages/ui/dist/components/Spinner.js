"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = Spinner;
const jsx_runtime_1 = require("react/jsx-runtime");
const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
};
function Spinner({ size = 'md', className = '' }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-testid": "loading", className: `
      animate-spin rounded-full border-solid border-transparent border-t-primary-600
      ${sizeStyles[size]}
      ${className}
    ` }));
}
//# sourceMappingURL=Spinner.js.map