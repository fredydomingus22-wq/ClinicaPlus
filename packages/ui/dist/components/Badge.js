"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
const jsx_runtime_1 = require("react/jsx-runtime");
const variantStyles = {
    success: { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)', border: 'var(--badge-success-border)' },
    warning: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', border: 'var(--badge-warning-border)' },
    error: { bg: 'var(--badge-error-bg)', text: 'var(--badge-error-text)', border: 'var(--badge-error-border)' },
    info: { bg: 'var(--badge-info-bg)', text: 'var(--badge-info-text)', border: 'var(--badge-info-border)' },
    neutral: { bg: 'var(--badge-neutral-bg)', text: 'var(--badge-neutral-text)', border: 'var(--badge-neutral-border)' },
    outline: { bg: 'transparent', text: 'inherit', border: 'currentColor' },
};
function Badge({ variant = 'neutral', children, className = '' }) {
    const styles = variantStyles[variant] || variantStyles.neutral;
    return ((0, jsx_runtime_1.jsx)("span", { className: `inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wide border ${className}`, style: {
            backgroundColor: styles.bg,
            color: styles.text,
            borderColor: styles.border
        }, children: children }));
}
//# sourceMappingURL=Badge.js.map