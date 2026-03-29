import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { ShieldAlert, QrCode as QrCodeIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function SuperAdminMFASetupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [qrCodeData, setQrCodeData] = useState<{ qrCodeUrl: string; secret: string } | null>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/superadmin/login');
      return;
    }

    const fetchMfaSetup = async () => {
      try {
        const response = await authApi.mfaSetup(token);
        setQrCodeData(response);
      } catch {
        setError('O token de configuração expirou ou é inválido. Por favor, volte a fazer login.');
      }
    };

    fetchMfaSetup();
  }, [token, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || pin.length !== 6) return;

    setVerifying(true);
    try {
      await authApi.mfaActivate(token, pin);
      toast.success('MFA ativado com sucesso! Por favor, inicie sessão agora com o seu novo código.');
      navigate('/superadmin/login');
    } catch {
      toast.error('O código introduzido está incorreto.');
    } finally {
      setVerifying(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen superadmin-theme bg-sa-background flex flex-col items-center justify-center p-4">
        <div className="bg-sa-surface border border-sa-destructive border-opacity-30 p-8 rounded-lg text-center max-w-md w-full">
          <ShieldAlert className="w-12 h-12 text-sa-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro de Configuração</h2>
          <p className="text-sa-text-muted text-sm">{error}</p>
          <button
            onClick={() => navigate('/superadmin/login')}
            className="mt-6 w-full py-2 bg-sa-primary/10 hover:bg-sa-primary hover:text-white text-sa-primary text-sm font-bold uppercase transition-colors rounded"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (!qrCodeData) {
    return (
      <div className="min-h-screen superadmin-theme bg-sa-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sa-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen superadmin-theme bg-[#050505] flex items-center justify-center p-4 selection:bg-sa-primary/30 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,#050505_100%)] pointer-events-none z-10" />
      
      <div className="w-full max-w-md z-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sa-primary to-[#050505] border border-sa-primary/30 shadow-[0_0_40px_rgba(20,184,166,0.2)] mb-6">
            <QrCodeIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-sans">Segurança Reforçada</h1>
          <p className="text-neutral-400 text-sm max-w-xs mx-auto">
            É exigido um segundo fator de autenticação para as permissões de <strong className="text-sa-primary font-bold">ROOT</strong>.
          </p>
        </div>

        <div className="bg-sa-surface border border-sa-border rounded-lg overflow-hidden relative shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-sa-primary to-transparent opacity-50 absolute top-0" />
          
          <div className="p-8">
            <div className="flex flex-col items-center">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-4">
                1. Digitalize o Código QR
              </p>
              <div className="w-48 h-48 bg-white p-2 rounded-lg flex items-center justify-center shadow-lg relative mb-3">
                <img 
                  src={qrCodeData.qrCodeUrl} 
                  alt="QR Code MFA" 
                  className="max-w-full h-auto object-contain Mix-blend-multiply"
                />
              </div>
              <p className="text-[10px] text-neutral-600 block mb-8 cursor-help hover:text-sa-primary transition-colors text-center" title={qrCodeData.secret}>
                ou cole o código manualmente no Authenticator
              </p>

              <form onSubmit={handleVerify} className="w-full">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-4 text-center">
                  2. Introduza o PIN (6 Dígitos)
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    autoFocus
                    placeholder="000 000"
                    disabled={verifying}
                    className="w-full bg-[#111] border border-sa-border focus:border-sa-primary text-white text-3xl font-mono text-center tracking-[0.3em] py-4 rounded transition-colors outline-none placeholder:text-neutral-800"
                  />
                  <button
                    type="submit"
                    disabled={verifying || pin.length !== 6}
                    className="w-full py-4 text-sm font-bold tracking-widest uppercase transition-all duration-300 rounded disabled:opacity-50
                      bg-white text-black hover:bg-neutral-200 disabled:bg-[#222] disabled:text-neutral-500"
                  >
                    {verifying ? 'A Verificar...' : 'Confirmar e Ativar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
