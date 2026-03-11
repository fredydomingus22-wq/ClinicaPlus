import type { AxiosError } from 'axios';

/**
 * Extracts and translates API error messages for the user.
 * Always returns a string in Portuguese.
 */
export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: { message?: string } }>;
  
  // Custom message if we have one from the backend
  if (axiosError?.response?.data?.error?.message) {
    return axiosError.response.data.error.message;
  }

  // Fallback messages by status code
  const status = axiosError?.response?.status;
  if (status === 401) return 'Sessão expirada ou acesso não autorizado';
  if (status === 403) return 'Não tem permissão para realizar esta ação';
  if (status === 404) return 'Recurso não encontrado';
  if (status === 409) return 'Conflito de dados ou duplicado';
  if (status === 429) return 'Demasiados pedidos. Tente mais tarde.';
  if (status && status >= 500) return 'Erro interno no servidor. Contacte o suporte.';

  return 'Ocorreu um erro inesperado. Verifique a sua ligação.';
}
