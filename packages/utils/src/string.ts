/**
 * Obtém iniciais de um nome: "Carlos Silva" -> "CS"
 */
export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return (parts[0] || '').substring(0, 2).toUpperCase();
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  const firstChar = first[0] || '';
  const lastChar = last !== first ? (last[0] || '') : '';
  return (firstChar + lastChar).toUpperCase();
}

/**
 * Cria slug a partir de string: "Clínica Multipla" -> "clinica-multipla"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Trunca string com reticências
 */
export function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  return str.substring(0, max).trim() + '...';
}

/**
 * Capitaliza primeira letra
 */
export function capitalize(str: string): string {
  if (!str || str.length === 0) return '';
  return (str[0] || '').toUpperCase() + str.substring(1).toLowerCase();
}
