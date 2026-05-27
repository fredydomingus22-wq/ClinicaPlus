"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KpiCard = KpiCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const Card_1 = require("./Card");
const cn_1 = require("../utils/cn");
/**
 * Premium KPI Card for Dashboards.
 * Follows ClinicaPlus visual system tokens.
 */
function KpiCard({ label, title, value, icon: Icon, color = 'blue', loading = false, trend, badgeText = 'Estável', className }) {
    const displayLabel = label || title || '';
    const colorMap = {
        blue: {
            bg: 'bg-[var(--estado-confirmado-bg)]',
            icon: 'text-[var(--estado-confirmado-text)]',
            num: 'text-[var(--color-primary-600)]',
            badge: 'bg-[var(--estado-confirmado-bg)] text-[var(--estado-confirmado-text)]'
        },
        amber: {
            bg: 'bg-[var(--estado-pendente-bg)]',
            icon: 'text-[var(--estado-pendente-text)]',
            num: 'text-[var(--color-warning-700)]',
            badge: 'bg-[var(--estado-pendente-bg)] text-[var(--estado-pendente-text)]'
        },
        green: {
            bg: 'bg-[var(--estado-em-progresso-bg)]',
            icon: 'text-[var(--estado-em-progresso-text)]',
            num: 'text-[var(--color-success-700)]',
            badge: 'bg-[var(--estado-em-progresso-bg)] text-[var(--estado-em-progresso-text)]'
        },
        slate: {
            bg: 'bg-[var(--color-neutral-100)]',
            icon: 'text-[var(--color-neutral-600)]',
            num: 'text-[var(--color-neutral-900)]',
            badge: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]'
        },
        red: {
            bg: 'bg-[var(--estado-cancelado-bg)]',
            icon: 'text-[var(--estado-cancelado-text)]',
            num: 'text-[var(--color-danger-700)]',
            badge: 'bg-[var(--estado-cancelado-bg)] text-[var(--estado-cancelado-text)]'
        },
    };
    // Mapeamento de apelidos para cores base
    const aliases = {
        primary: 'blue',
        secondary: 'slate',
        success: 'green',
        danger: 'red',
        warning: 'amber',
        info: 'blue'
    };
    const resolvedColor = (aliases[color] || color);
    const styles = (colorMap[resolvedColor] || colorMap.blue);
    return ((0, jsx_runtime_1.jsxs)(Card_1.Card, { className: (0, cn_1.cn)("p-5 relative", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between mb-4", children: [(0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("h-9 w-9 flex items-center justify-center shrink-0", styles.bg), children: (0, jsx_runtime_1.jsx)(Icon, { className: (0, cn_1.cn)("h-5 w-5", styles.icon) }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-widest", styles.badge), children: badgeText })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold text-[#525252] uppercase tracking-[0.2em] font-mono leading-none mb-2", children: displayLabel }), loading ? ((0, jsx_runtime_1.jsx)("div", { className: "h-7 w-20 bg-[#f5f5f5] animate-pulse" })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: (0, cn_1.cn)("text-2xl font-bold font-mono tabular-nums tracking-tight", styles.num), children: typeof value === 'number' ? value.toLocaleString('pt-AO') : value }), trend && ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)("flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5", trend.isPositive ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#fef2f2] text-[#991b1b]'), children: [trend.isPositive ? '↑' : '↓', " ", trend.value, "%"] }))] }))] })] }));
}
//# sourceMappingURL=KpiCard.js.map