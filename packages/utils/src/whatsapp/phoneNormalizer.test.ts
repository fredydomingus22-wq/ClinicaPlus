import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  toWhatsAppJid,
  isValidAngolaPhone,
  extractCountryCode,
} from './phoneNormalizer';

describe('phoneNormalizer', () => {
  describe('normalizePhoneNumber', () => {
    it('deve normalizar número com código de país Angola (+244)', () => {
      expect(normalizePhoneNumber('+244923456789')).toBe('+244923456789');
    });

    it('deve normalizar número com 00 antes do código', () => {
      expect(normalizePhoneNumber('00244923456789')).toBe('+244923456789');
    });

    it('deve adicionar código de país ao número de 9 dígitos', () => {
      expect(normalizePhoneNumber('923456789')).toBe('+244923456789');
    });

    it('deve remover sufixo @s.whatsapp.net', () => {
      expect(normalizePhoneNumber('923456789@s.whatsapp.net')).toBe('+244923456789');
    });

    it('deve remover sufixo @c.us', () => {
      expect(normalizePhoneNumber('923456789@c.us')).toBe('+244923456789');
    });

    it('deve remover caracteres não numéricos', () => {
      expect(normalizePhoneNumber('(923) 456-789')).toBe('+244923456789');
    });

    it('deve lançar erro quando número é vazio', () => {
      expect(() => normalizePhoneNumber('')).toThrow('Número de telefone é obrigatório');
    });

    it('deve usar código de país customizado quando fornecido', () => {
      expect(normalizePhoneNumber('912345678', '351')).toBe('+351912345678');
    });
  });

  describe('toWhatsAppJid', () => {
    it('deve converter número normalizado para JID', () => {
      expect(toWhatsAppJid('+244923456789')).toBe('244923456789@s.whatsapp.net');
    });

    it('deve remover + do número ao criar JID', () => {
      expect(toWhatsAppJid('+244923456789')).not.toContain('+');
    });
  });

  describe('isValidAngolaPhone', () => {
    it('deve validar número válido de Angola', () => {
      expect(isValidAngolaPhone('+244923456789')).toBe(true);
      expect(isValidAngolaPhone('923456789')).toBe(true);
    });

    it('deve rejeitar número inválido de Angola', () => {
      expect(isValidAngolaPhone('+244823456789')).toBe(false); // não começa com 9
      expect(isValidAngolaPhone('+24492345678')).toBe(false); // 8 dígitos
      expect(isValidAngolaPhone('+2449234567890')).toBe(false); // 10 dígitos
    });

    it('deve rejeitar número de outro país', () => {
      expect(isValidAngolaPhone('+351912345678')).toBe(false);
    });
  });

  describe('extractCountryCode', () => {
    it('deve extrair código de país de número normalizado', () => {
      expect(extractCountryCode('+244923456789')).toBe('244');
    });

    it('deve retornar código padrão Angola quando não consegue extrair', () => {
      expect(extractCountryCode('923456789')).toBe('244');
    });
  });
});
