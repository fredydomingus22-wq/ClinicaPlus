"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGreeting = getGreeting;
/**
 * Returns a Portuguese greeting based on the current hour.
 *
 * 05:00 - 11:59 -> Bom dia
 * 12:00 - 17:59 -> Boa tarde
 * 18:00 - 04:59 -> Boa noite
 *
 * @returns {string} The appropriate greeting
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    }
    if (hour >= 12 && hour < 18) {
        return 'Boa tarde';
    }
    return 'Boa noite';
}
//# sourceMappingURL=greeting.js.map