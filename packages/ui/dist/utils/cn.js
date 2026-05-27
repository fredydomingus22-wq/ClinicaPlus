"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
/**
 * Utilitário global para fusão inteligente de classes do Tailwind CSS.
 * Permite usar condicionais elegantes (clsx) enquanto resolve
 * conflitos de classes Tailwind automaticamente (twMerge).
 *
 * Exemplo: cn('px-2 py-1', isActive && 'bg-primary-500', 'px-4')
 * Resultado: 'py-1 bg-primary-500 px-4' (px-2 foi anulado)
 */
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
//# sourceMappingURL=cn.js.map