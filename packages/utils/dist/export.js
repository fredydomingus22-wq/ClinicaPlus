"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToCsv = exportToCsv;
/**
 * Export data to a CSV file.
 * Handles BOM for Excel compatibility and uses semicolon as separator.
 */
function exportToCsv(filename, headers, rows) {
    const BOM = '\uFEFF'; // BOM for UTF-8 — Excel Angola opens correctly
    const csvContent = [
        headers.join(';'), // semicolon separator (PT standard)
        ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
// WhatsApp utilities
__exportStar(require("./whatsapp/phoneNormalizer"), exports);
__exportStar(require("./whatsapp/contactResolver"), exports);
__exportStar(require("./whatsapp/templates"), exports);
//# sourceMappingURL=export.js.map