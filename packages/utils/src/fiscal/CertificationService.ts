import * as crypto from 'crypto';
import { AppError } from '../errors';

/**
 * Serviço responsável por assinaturas digitais RSA-2048.
 * Gere duas identidades:
 * 1. Produtor (ClinicaPlus): Para jwsSoftwareSignature (fixa global).
 * 2. Contribuinte (Clínica): Para jwsDocumentSignature e jwsSignature (específica por tenant).
 */
export class CertificationService {
  private producerPrivateKey: string;
  private tenantPrivateKey: string | undefined;
  private tenantPublicKey: string | undefined;

  constructor(keys?: { 
    producerPrivateKey?: string | undefined, 
    tenantPrivateKey?: string | undefined,
    tenantPublicKey?: string | undefined 
  }) {
    // Carrega a chave do produtor do ambiente por defeito
    const rawProducerKey = (keys?.producerPrivateKey || process.env.AGT_PRIVATE_KEY || '');
    this.producerPrivateKey = rawProducerKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();
    
    // Chaves do tenant (passadas dinamicamente do banco de dados)
    const rawTenantPrivateKey = (keys?.tenantPrivateKey || '');
    this.tenantPrivateKey = rawTenantPrivateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim() || undefined;
    
    const rawTenantPublicKey = (keys?.tenantPublicKey || '');
    this.tenantPublicKey = rawTenantPublicKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim() || undefined;
  }

  private validateKeySize(key: string, label: string): void {
    try {
      const keyObj = crypto.createPrivateKey(key);
      const { modulusLength } = (keyObj as any).asymmetricKeyDetails || {};
      if (modulusLength && modulusLength < 2048) {
        throw new AppError(`A chave privada do ${label} deve ter no mínimo 2048 bits.`, 400);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Chave privada do ${label} inválida ou mal formatada.`, 400);
    }
  }

  private ensureProducerKey(): string {
    if (!this.producerPrivateKey || this.producerPrivateKey.length < 32) {
      throw new AppError('Chave privada do produtor não configurada ou inválida (AGT_PRIVATE_KEY)', 500);
    }
    // Validate RSA key size (>=2048 bits)
    this.validateKeySize(this.producerPrivateKey, 'produtor');
    return this.producerPrivateKey;
  }

  private ensureTenantKey(): string {
    if (!this.tenantPrivateKey || this.tenantPrivateKey.length < 32) {
      if (process.env.AGT_MOCK === 'true') {
        // Em modo MOCK, se não houver chave do tenant, usamos a do produtor como fallback
        // para evitar erros 400 em desenvolvimento.
        return this.producerPrivateKey;
      }
      throw new AppError('Chave privada da clínica (contribuinte) não configurada ou inválida para esta conta', 400);
    }
    // Validate RSA key size (>=2048 bits)
    this.validateKeySize(this.tenantPrivateKey, 'tenant');
    return this.tenantPrivateKey;
  }

  /**
   * Converte um objeto para JSON sem espaços e com chaves ordenadas (JSON Canónico)
   */
  private canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalStringify(item)).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj).sort();
    const result = sortedKeys.map(key => {
      return `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`;
    });

    return '{' + result.join(',') + '}';
  }

  /**
   * Assinatura JWS genérica com uma chave específica
   */
  private signWithKey(payload: any, privateKey: string): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const jsonHeader = this.canonicalStringify(header);
    const jsonPayload = this.canonicalStringify(payload);

    const encodedHeader = Buffer.from(jsonHeader).toString('base64url');
    const encodedPayload = Buffer.from(jsonPayload).toString('base64url');
    
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(`${encodedHeader}.${encodedPayload}`);
      sign.end();
      
      const signature = sign.sign(privateKey, 'base64url');
      
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error: any) {
      throw new AppError(`Erro ao gerar assinatura JWS: ${error.message}`, 500);
    }
  }

  /**
   * jwsSoftwareSignature: Assina com a chave do PRODUTOR
   */
  public signSoftwareJWS(data: { productId: string, productVersion: string, softwareValidationNumber: string, signatureVersion?: number }): string {
    const key = this.ensureProducerKey();
    return this.signWithKey(data, key);
  }

  /**
   * jwsDocumentSignature: Assina com a chave do TENANT (Contribuinte)
   */
  public signDocumentJWS(data: any): string {
    const key = this.ensureTenantKey();
    return this.signWithKey(data, key);
  }

  /**
   * jwsSignature: Assina com a chave do TENANT (Contribuinte)
   */
  public signRequestJWS(data: { taxRegistrationNumber: string, requestID: string } | any): string {
    const key = this.ensureTenantKey();
    return this.signWithKey(data, key);
  }

  /**
   * Assinatura legada para SAF-T e Hash Chain (faturas.fiscalHash)
   * Usa a chave do TENANT.
   */
  public assinarDocumento(params: {
    dataEmissao: Date;
    dataDocumento: Date;
    numero: string;
    total: number;
    hashAnterior: string;
  }): { hash: string; hashControl: string } {
    const key = this.ensureTenantKey();
    const { dataEmissao, dataDocumento, numero, total, hashAnterior } = params;

    const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
    const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
    const totalFinal = (total).toFixed(2);

    const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;

    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(payload);
      sign.end();
      
      const signature = sign.sign(key, 'base64');
      
      return {
        hash: signature,
        hashControl: '1' 
      };
    } catch (error: any) {
      throw new AppError(`Erro ao assinar documento fiscal: ${error.message}`, 500);
    }
  }

  /**
   * Verifica a validade de um hash (Usa chave pública do TENANT)
   */
  public verificarAssinatura(params: {
    dataEmissao: Date;
    dataDocumento: Date;
    numero: string;
    total: number;
    hashAnterior: string;
    signatureBase64: string;
  }): boolean {
    const publicKey = this.tenantPublicKey || process.env.AGT_PUBLIC_KEY;
    if (!publicKey) return false;
    
    const { dataEmissao, dataDocumento, numero, total, hashAnterior, signatureBase64 } = params;
    
    const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
    const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
    const totalFinal = (total).toFixed(2);
    
    const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;
    
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(payload);
      verify.end();
      return verify.verify(publicKey, signatureBase64, 'base64');
    } catch (error) {
      return false;
    }
  }
}

// Singleton global (Produtor apenas)
export const certificationService = new CertificationService();
