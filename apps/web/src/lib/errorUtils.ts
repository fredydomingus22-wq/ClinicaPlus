import type { AxiosError } from 'axios';

/**
 * Extracts and translates API error messages for the user.
 * Always returns a string in Portuguese (pt-AO).
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  const axiosError = error as AxiosError<any>;
  
  // 1. Tentar ler do padrão { error: { message: "..." } } (padrão global AppError do ClinicaPlus)
  if (axiosError?.response?.data?.error?.message) {
    return axiosError.response.data.error.message;
  }

  // 2. Tentar ler do padrão { message: "..." } (padrão NestJS / Express padrão)
  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }

  // 3. Tentar ler do padrão { error: "..." } se for uma string simples
  if (typeof axiosError?.response?.data?.error === 'string') {
    return axiosError.response.data.error;
  }

  // 4. Mapear códigos de estado HTTP comuns
  const status = axiosError?.response?.status;
  if (status === 401) {
    return 'Sessão expirada ou não autorizada. Por favor, inicie sessão novamente.';
  }
  if (status === 403) {
    return 'Não tem permissão para realizar esta ação.';
  }
  if (status === 404) {
    return 'O registo ou recurso solicitado não foi encontrado.';
  }
  if (status === 409) {
    return 'Esta informação já se encontra registada no sistema (conflito/duplicado).';
  }
  if (status === 402) {
    return axiosError?.response?.data?.error?.message || 'Limite do plano de subscrição atingido. Faça upgrade para continuar.';
  }
  if (status === 429) {
    return 'Demasiados pedidos. Por favor, aguarde alguns instantes.';
  }
  if (status && status >= 500) {
    return 'Erro interno no servidor. A nossa equipa de suporte técnico foi notificada.';
  }

  // 5. Mensagem de erro genérica do Axios (ex: falhas de ligação de rede)
  if (axiosError?.message) {
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Erro de ligação: Não foi possível contactar o servidor. Verifique a sua internet.';
    }
    return axiosError.message;
  }

  return fallback;
}
