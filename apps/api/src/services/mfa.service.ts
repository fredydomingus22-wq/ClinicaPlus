import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes

export class MfaService {
  /**
   * Encripta um texto (secret)
   */
  _encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY as string, 'utf8'), iv);
    return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  }

  /**
   * Decripta um texto (secret)
   */
  _decrypt(encrypted: string): string {
    const [ivHex, content] = encrypted.split(':') as [string, string];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY as string, 'utf8'), Buffer.from(ivHex as string, 'hex'));
    return decipher.update(content, 'hex', 'utf8') + decipher.final('utf8');
  }

  /**
   * Setup inicial (forçado no 1º login de SUPER_ADMIN)
   */
  async setup(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await prisma.utilizador.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Utilizador não encontrado', 404);

    const secret = authenticator.generateSecret();
    const encryptedSecret = this._encrypt(secret);

    await prisma.utilizador.update({
      where: { id: userId },
      data: {
        mfaSecret: encryptedSecret,
        mfaPending: true,
      },
    });

    const appName = process.env.APP_NAME || 'ClinicaPlus';
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * Activa o MFA após verificação do código no primeiro setup
   */
  async activate(userId: string, token: string): Promise<boolean> {
    const user = await prisma.utilizador.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new AppError('Setup MFA não iniciado', 400);

    const secret = this._decrypt(user.mfaSecret);
    const isValid = authenticator.check(token, secret);

    if (!isValid) throw new AppError('Código MFA inválido', 400);

    await prisma.utilizador.update({
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
  async verify(userId: string, token: string): Promise<boolean> {
    const user = await prisma.utilizador.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret || !user.mfaActivatedAt) return false;

    const secret = this._decrypt(user.mfaSecret);
    return authenticator.check(token, secret);
  }
}

export const mfaService = new MfaService();
