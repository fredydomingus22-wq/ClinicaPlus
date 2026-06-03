import type { AxiosError } from 'axios';

/**
 * Extracts and translates API error messages for the user.
 * Always returns a string in Portuguese (pt-AO).
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  const axiosError = error as AxiosError<any>;
  const data = axiosError?.response?.data;
  
  // Extrair o código do erro e a mensagem do payload estruturado do ClinicaPlus
  const errorCode = data?.error?.code || data?.code;
  const rawMessage = data?.error?.message || data?.message;

  // 1. Mapear códigos de erro do domínio do ClinicaPlus para mensagens detalhadas e amigáveis
  if (errorCode) {
    switch (errorCode) {
      case 'PLAN_LIMIT_REACHED': {
        const msgLower = (rawMessage || '').toLowerCase();
        if (msgLower.includes('médico') || msgLower.includes('medico')) {
          return 'Atingiu o limite de médicos ativos permitidos no seu plano de subscrição atual. Para registar novos profissionais, desative um médico que já não esteja em atividade ou solicite o upgrade do seu plano.';
        }
        if (msgLower.includes('consulta')) {
          return 'Atingiu o limite mensal de consultas incluído no seu plano. Para continuar a agendar consultas, fale com o administrador para realizar o upgrade da subscrição.';
        }
        if (msgLower.includes('paciente')) {
          return 'Atingiu o limite máximo de pacientes registados no seu plano. Por favor, solicite a alteração do plano de subscrição para poder cadastrar mais utentes.';
        }
        return rawMessage || 'Limite do plano de subscrição atingido para esta operação. Faça upgrade para continuar.';
      }

      case 'FEATURE_NOT_AVAILABLE':
        return 'Esta funcionalidade (como integração de API ou relatórios avançados) não está incluída no seu plano atual. Solicite o upgrade da sua subscrição para a ativar.';

      case 'DUPLICATE_ENTRY':
        return 'Esta informação (como o e-mail, NIF, telefone ou código) já se encontra registada no sistema. Por favor, verifique se já existe um registo idêntico.';

      case 'VALIDATION_ERROR':
        return 'Os dados fornecidos são inválidos ou estão incompletos. Por favor, valide os campos obrigatórios assinalados antes de submeter.';

      case 'FISCAL_IMMUTABILITY':
        return 'Este documento fiscal já foi emitido e certificado, não podendo ser alterado. Por favor, gere uma Nota de Crédito para anulação ou Nota de Débito para correções positivas.';

      case 'CLINICA_NOT_FOUND':
        return 'A clínica solicitada não foi encontrada no nosso sistema. Verifique o endereço digitado.';

      case 'CLINICA_INACTIVE':
        return 'A sua clínica está temporariamente inativa. Por favor, contacte o suporte do ClinicaPlus para regularizar o estado do seu plano.';

      case 'INVALID_CREDENTIALS':
        return 'O e-mail ou a palavra-passe introduzidos estão incorretos. Por favor, verifique os seus dados de acesso e tente novamente.';

      case 'SESSION_EXPIRED':
      case 'UNAUTHENTICATED':
      case 'INVALID_TOKEN':
        return 'A sua sessão expirou ou não está autorizado a realizar esta operação. Por favor, saia e inicie sessão novamente.';
        
      case 'SLOT_TAKEN':
        return 'O horário selecionado já se encontra ocupado por outra consulta ou agendamento. Escolha outra hora disponível.';
    }
  }

  // 2. Se houver mensagem do backend mas o código de erro não foi explicitamente mapeado acima, exibimos a mensagem do backend
  if (rawMessage) {
    return rawMessage;
  }

  // 3. Mapear códigos de estado HTTP se não houver payload detalhado
  const status = axiosError?.response?.status;
  if (status === 401) {
    return 'Sessão expirada ou acesso não autorizado. Por favor, volte a iniciar sessão.';
  }
  if (status === 403) {
    return 'Não tem permissão de acesso para realizar esta ação.';
  }
  if (status === 404) {
    return 'O registo ou recurso solicitado não foi localizado.';
  }
  if (status === 409) {
    return 'Conflito de dados. Esta informação já existe no sistema.';
  }
  if (status === 402) {
    return 'Limite do plano atingido. Por favor, realize o upgrade da sua subscrição.';
  }
  if (status === 429) {
    return 'Muitos pedidos seguidos. Por favor, aguarde alguns instantes.';
  }
  if (status && status >= 500) {
    return 'Erro interno no servidor. O nosso suporte técnico foi notificado e já se encontra a analisar.';
  }

  // 4. Tratar erros de rede gerais do Axios
  if (axiosError?.message) {
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Erro de ligação: Não foi possível contactar o servidor. Verifique a sua ligação à internet.';
    }
    return axiosError.message;
  }

  return fallback;
}
