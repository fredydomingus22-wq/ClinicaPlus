"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessage = ErrorMessage;
const jsx_runtime_1 = require("react/jsx-runtime");
function ErrorMessage({ error, className = '' }) {
    if (!error)
        return null;
    const message = typeof error === 'string'
        ? error
        : error.message || 'Ocorreu um erro inesperado';
    return ((0, jsx_runtime_1.jsx)("div", { className: `text-sm text-danger-600 bg-danger-50 border border-danger-100 p-3 animate-shake ${className}`, children: message }));
}
//# sourceMappingURL=ErrorMessage.js.map