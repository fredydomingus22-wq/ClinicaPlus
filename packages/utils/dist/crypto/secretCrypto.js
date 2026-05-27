"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = __importDefault(require("crypto"));
const PREFIX = 'v1:';
function deriveKey(material) {
    return crypto_1.default.createHash('sha256').update(material).digest();
}
function encryptSecret(value, keyMaterial) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', deriveKey(keyMaterial), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}
function decryptSecret(value, keyMaterial) {
    if (!value.startsWith(PREFIX)) {
        return value;
    }
    const [ivBase64, tagBase64, encryptedBase64] = value.slice(PREFIX.length).split(':');
    if (!ivBase64 || !tagBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted secret format');
    }
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', deriveKey(keyMaterial), Buffer.from(ivBase64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedBase64, 'base64')),
        decipher.final()
    ]).toString('utf8');
}
//# sourceMappingURL=secretCrypto.js.map