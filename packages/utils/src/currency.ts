/**
 * Formata valor inteiro de Kwanza para string: "5.000 Kz"
 */
export function formatKwanza(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' Kz';
}

/**
 * Converte string de Kwanza para número
 */
export function parseKwanza(str: string): number {
  const normalized = str.replace(/[^\d]/g, '');
  return parseInt(normalized || '0', 10);
}
