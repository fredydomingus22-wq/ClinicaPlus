import * as crypto from 'crypto';
import { AppError } from '../errors';
import { Logger } from './types';

/**
 * Serviço responsável pela Assinatura Digital RSA-2048 e
 * integridade da Hash Chain exigida pela certificação da AGT.
 */
export class CertificationService {
  private privateKey: string;
  private publicKey: string;

  constructor(keys?: { privateKey?: string, publicKey?: string }) {
    // Proteção contra ambiente browser (Vite/Bundler)
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    this.privateKey = keys?.privateKey || env.AGT_PRIVATE_KEY || '';
    this.publicKey = keys?.publicKey || env.AGT_PUBLIC_KEY || '';

    if (this.privateKey) this.privateKey = this.privateKey.replace(/\\n/g, '\n');
    if (this.publicKey) this.publicKey = this.publicKey.replace(/\\n/g, '\n');
  }

  private ensureKeys() {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    if (!this.privateKey) this.privateKey = (env.AGT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!this.publicKey) this.publicKey = (env.AGT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

    if (!this.privateKey) {
      throw new AppError('Chave privada da AGT não configurada', 500);
    }
  }

  /**
   * Constrói e assina o payload do documento gerando um Hash RSA-256
   * em Base64 com exatamente 172 caracteres.
   */
  assinarDocumento(params: {
    dataEmissao: Date;
    dataDocumento: Date;
    numero: string; // Ex: FT CPLS/1
    total: number;
    hashAnterior: string;
  }): { hash: string; hashControl: string } {
    this.ensureKeys();
    const { dataEmissao, dataDocumento, numero, total, hashAnterior } = params;

    const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
    const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
    const totalFinal = (total).toFixed(2);

    const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;

    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(payload);
      sign.end();
      
      const signature = sign.sign(this.privateKey, 'base64');
      
      return {
        hash: signature,
        hashControl: '1' 
      };
    } catch (error: any) {
      throw new AppError(`Erro ao assinar documento fiscal: ${error.message}`, 500);
    }
  }

  /**
   * Assinatura JWS para integração real-time com a AGT (SaaS mode)
   */
  signJWS(payload: any): string {
    this.ensureKeys();
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${encodedHeader}.${encodedPayload}`);
    sign.end();
    
    const signature = sign.sign(this.privateKey, 'base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Função utilitária para verificar validade do hash
   */
  verificarAssinatura(params: {
    dataEmissao: Date;
    dataDocumento: Date;
    numero: string;
    total: number;
    hashAnterior: string;
    signatureBase64: string;
  }): boolean {
    const { dataEmissao, dataDocumento, numero, total, hashAnterior, signatureBase64 } = params;
    
    const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
    const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
    const totalFinal = (total).toFixed(2);
    
    const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;
    
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(payload);
      verify.end();
      return verify.verify(this.publicKey, signatureBase64, 'base64');
    } catch (error) {
      return false;
    }
  }
}

// Singleton apenas disponível em ambientes Node.js (API/Worker).
export const certificationService: CertificationService = 
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.versions?.node)
    ? new CertificationService()
    : (null as unknown as CertificationService);

