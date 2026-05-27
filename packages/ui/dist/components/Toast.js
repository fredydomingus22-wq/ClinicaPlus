"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toast = void 0;
function emit(kind, message) {
    if (typeof window === 'undefined')
        return;
    window.dispatchEvent(new CustomEvent('clinicaplus:toast', { detail: { kind, message } }));
}
exports.toast = {
    success: (message) => emit('success', message),
    error: (message) => emit('error', message),
    info: (message) => emit('info', message),
};
//# sourceMappingURL=Toast.js.map