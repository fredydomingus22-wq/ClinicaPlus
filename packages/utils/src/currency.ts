/**
 * Formata valor inteiro de Kwanza para string: "5.000 Kz"
 */
export function formatKwanza(amount: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' Kz';
}

/**
 * Converte string de Kwanza para número
 */
export function parseKwanza(str: string): number {
  const normalized = str.replace(/[^\d]/g, '');
  return parseInt(normalized || '0', 10);
}
