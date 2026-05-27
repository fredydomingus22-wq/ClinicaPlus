"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = decryptSecret;
const server_1 = require("@clinicaplus/utils/server");
function getKeyMaterial() {
    return process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET || null;
}
function decryptSecret(value) {
    const keyMaterial = getKeyMaterial();
    // Se não estiver encriptado, devolve como está.
    if (!value.startsWith('v1:')) {
        return value;
    }
    if (!keyMaterial) {
        throw new Error('SECRETS_ENCRYPTION_KEY/JWT_SECRET não configurado para desencriptar segredos (worker)');
    }
    return (0, server_1.decryptSecret)(value, keyMaterial);
}
