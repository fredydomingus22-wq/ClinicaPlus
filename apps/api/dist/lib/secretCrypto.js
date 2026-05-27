"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const server_1 = require("@clinicaplus/utils/server");
const config_1 = require("./config");
function encryptSecret(value) {
    const material = process.env.SECRETS_ENCRYPTION_KEY ?? config_1.config.JWT_SECRET;
    return (0, server_1.encryptSecret)(value, material);
}
function decryptSecret(value) {
    const material = process.env.SECRETS_ENCRYPTION_KEY ?? config_1.config.JWT_SECRET;
    return (0, server_1.decryptSecret)(value, material);
}
