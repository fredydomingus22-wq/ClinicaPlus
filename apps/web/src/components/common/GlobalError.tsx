import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  RefreshCcw, 
  Home, 
  ChevronLeft,
  ShieldAlert,
  Frown
} from 'lucide-react';
import { Button, Card } from '@clinicaplus/ui';

export function GlobalError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Ocorreu um erro inesperado";
  let message = "Pedimos desculpa pelo incómodo. A nossa equipa foi notificada e estamos a trabalhar na resolução.";
  let status = "500";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Página não encontrada";
      message = "A página que procura não existe ou foi movida.";
      status = "404";
    } else if (error.status === 401) {
      title = "Acesso não autorizado";
      message = "Não tem permissão para aceder a esta área. Por favor, faça login novamente.";
      status = "401";
    } else if (error.status === 503) {
      title = "Serviço indisponível";
      message = "O sistema está em manutenção. Por favor, tente novamente mais tarde.";
      status = "503";
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-sans antialiased text-[#1a1a1a]">
      <div className="max-w-md w-full animate-fade-in">
        <Card className="p-8 border-neutral-200/60 shadow-xl rounded-[2.5rem] bg-white overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-50 rounded-full blur-2xl opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-danger-50 flex items-center justify-center text-danger-600 shadow-sm border border-danger-100">
              {status === "404" ? <Frown className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-danger-600 bg-danger-50 px-2 py-0.5 rounded">Erro {status}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900">{title}</h1>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                {message}
              </p>
            </div>

            <div className="grid grid-cols-1 w-full gap-3 pt-4">
              <Button 
                onClick={() => window.location.reload()}
                className="font-bold bg-neutral-900 hover:bg-black text-white h-12 rounded-2xl flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> Tentar Novamente
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="secondary"
                  onClick={() => navigate(-1)}
                  className="font-bold h-12 rounded-2xl border-neutral-200 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="font-bold h-12 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" /> Início
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 w-full">
              <div className="flex items-center justify-center gap-2 text-neutral-400 group cursor-help">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Suporte Técnico ClinicaPlus</span>
              </div>
            </div>
          </div>
        </Card>
        
        <p className="text-center mt-8 text-[10px] font-bold text-neutral-400 uppercase tracking-widest animate-pulse">
          Sistema de Proteção Ativo v1.0
        </p>
      </div>
    </div>
  );
}
