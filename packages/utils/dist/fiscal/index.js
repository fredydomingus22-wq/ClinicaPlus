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
// calculo e types são seguros para o browser (sem dependências Node.js)
__exportStar(require("./calculo"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./constants"), exports);
// CertificationService e AgtApiClient usam Node.js `crypto` — NÃO exportar aqui.
// Importar directamente em server-side: import { CertificationService } from '@clinicaplus/utils/fiscal/CertificationService';
//# sourceMappingURL=index.js.map