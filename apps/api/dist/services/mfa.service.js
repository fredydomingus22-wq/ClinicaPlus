"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mfaService = exports.MfaService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
class MfaService {
    /**
     * Encripta um texto (secret)
     */
    _encrypt(text) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
        return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    }
    /**
     * Decripta um texto (secret)
     */
    _decrypt(encrypted) {
        const [ivHex, content] = encrypted.split(':');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), Buffer.from(ivHex, 'hex'));
        return decipher.update(content, 'hex', 'utf8') + decipher.final('utf8');
    }
    /**
     * Setup inicial (forçado no 1º login de SUPER_ADMIN)
     */
    async setup(userId) {
        const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: userId } });
        if (!user)
            throw new AppError_1.AppError('Utilizador não encontrado', 404);
        const secret = otplib_1.authenticator.generateSecret();
        const encryptedSecret = this._encrypt(secret);
        await prisma_1.prisma.utilizador.update({
            where: { id: userId },
            data: {
                mfaSecret: encryptedSecret,
                mfaPending: true,
            },
        });
        const appName = process.env.APP_NAME || 'ClinicaPlus';
        const otpauth = otplib_1.authenticator.keyuri(user.email, appName, secret);
        const qrCodeUrl = await qrcode_1.default.toDataURL(otpauth);
        return {
            secret,
            qrCodeUrl,
        };
    }
    /**
     * Activa o MFA após verificação do código no primeiro setup
     */
    async activate(userId, token) {
        const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: userId } });
        if (!user || !user.mfaSecret)
            throw new AppError_1.AppError('Setup MFA não iniciado', 400);
        const secret = this._decrypt(user.mfaSecret);
        const isValid = otplib_1.authenticator.check(token, secret);
        if (!isValid)
            throw new AppError_1.AppError('Código MFA inválido', 400);
        await prisma_1.prisma.utilizador.update({
            where: { id: userId },
            data: {
                mfaPending: false,
                mfaActivatedAt: new Date(),
            },
        });
        return true;
    }
    /**
     * Verifica o TOTP para logins subsequentes
     */
    async verify(userId, token) {
        const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: userId } });
        if (!user || !user.mfaSecret || !user.mfaActivatedAt)
            return false;
        const secret = this._decrypt(user.mfaSecret);
        return otplib_1.authenticator.check(token, secret);
    }
}
exports.MfaService = MfaService;
exports.mfaService = new MfaService();
