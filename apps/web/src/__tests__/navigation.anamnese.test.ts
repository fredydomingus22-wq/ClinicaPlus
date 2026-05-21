import { describe, it, expect } from 'vitest';
import { Papel } from '@clinicaplus/types';
import { getNavItems } from '../lib/navigation';

describe('Navigation - anamnese templates entries', () => {
  it('deve incluir Templates de Anamnese no menu do admin', () => {
    const items = getNavItems(Papel.ADMIN);
    expect(items.some((item) => item.to === '/admin/anamneses/templates')).toBe(true);
  });

  it('deve incluir Templates de Anamnese no menu do medico', () => {
    const items = getNavItems(Papel.MEDICO);
    expect(items.some((item) => item.to === '/medico/anamneses/templates')).toBe(true);
  });
});
