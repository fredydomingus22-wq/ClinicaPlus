import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  Spinner,
} from '@clinicaplus/ui';
import {
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertTriangle,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Settings,
} from 'lucide-react';
import { useConfiguracaoFiscal, useGuardarConfiguracaoFiscal, useTestarConexaoAgt } from '../../hooks/useFiscal';
import { type ConfiguracaoFiscalInput } from '../../api/fiscal';

const ConfiguracaoFiscalSchema = z.object({
  nif: z.string().max(9, 'NIF deve ter 9 dígitos').optional(),
  razaoSocial: z.string().max(200).optional(),
  enderecoPostal: z.string().max(300).optional(),
  regimeFiscal: z.enum(['GERAL', 'SIMPLIFICADO', 'EXUSA']).optional(),
  serieDocFiscal: z.string().optional(),
  agtApiToken: z.string().optional(),
});

type FormValues = z.infer<typeof ConfiguracaoFiscalSchema>;

const REGIME_FISCAL_OPTIONS = [
  { value: 'GERAL', label: 'Regime Geral (IVA 14%)' },
  { value: 'SIMPLIFICADO', label: 'Regime Simplificado (IVA 7%)' },
  { value: 'EXUSA', label: 'Exclusão / Isento' },
];

export default function ConfiguracaoFiscalPage() {
  const { data: config, isLoading } = useConfiguracaoFiscal();
  const guardarMutation = useGuardarConfiguracaoFiscal();
  const testarConexaoMutation = useTestarConexaoAgt();
  const [showToken, setShowToken] = useState(false);
  const [conexaoStatus, setConexaoStatus] = useState<'idle' | 'ok' | 'erro'>('idle');

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(ConfiguracaoFiscalSchema) as unknown as ReturnType<typeof zodResolver>,
    values: config ? {
      nif: config.nif ?? '',
      razaoSocial: config.razaoSocial ?? '',
      enderecoPostal: config.enderecoPostal ?? '',
      regimeFiscal: (config.regimeFiscal as FormValues['regimeFiscal']) ?? 'GERAL',
      serieDocFiscal: config.serieDocFiscal ?? '',
      agtApiToken: config.agtApiToken ?? '',
    } : {} as FormValues,
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      // Limpa valores undefined para compatibilidade com exactOptionalPropertyTypes: true
      const dataToSave = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      ) as ConfiguracaoFiscalInput;

      await guardarMutation.mutateAsync(dataToSave);
      toast.success('Configuração fiscal guardada com sucesso.');
    } catch {
      toast.error('Erro ao guardar configuração fiscal.');
    }
  };

  const handleTestarConexao = async () => {
    try {
      const result = await testarConexaoMutation.mutateAsync();
      if (result.success) {
        setConexaoStatus('ok');
        toast.success(result.message || 'Conexão com a AGT estabelecida com sucesso.');
      } else {
        setConexaoStatus('erro');
        toast.error(result.message || 'Falha na conexão com a AGT.');
      }
    } catch {
      setConexaoStatus('erro');
      toast.error('Erro ao testar conexão. Verifique o token AGT.');
    }
  };

  const nifConfigurado = config?.nif && config.nif.length === 9;

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <Link to="/admin/configuracao" className="hover:text-neutral-600">Configurações</Link>
            <span>/</span>
            <span className="text-neutral-600 font-medium">Faturação Fiscal</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary-500" />
            Configuração Fiscal
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Dados obrigatórios para emissão de documentos fiscais conformes à AGT Angola.
          </p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          loading={guardarMutation.isPending}
          disabled={!isDirty}
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      {/* Banner de aviso — sem NIF */}
      {!nifConfigurado && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Configure os dados fiscais antes de emitir facturas.</p>
            <p className="text-amber-700 text-xs mt-0.5">
              O NIF e a Razão Social são obrigatórios para a geração de documentos conformes com a legislação angolana.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1 — Dados do Contribuinte */}
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Settings className="h-4 w-4" />
            Dados do Contribuinte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="NIF (9 dígitos)"
                placeholder="000000000"
                maxLength={9}
                {...register('nif')}
                error={errors.nif?.message}
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Número de Identificação Fiscal da clínica
              </p>
            </div>

            <Input
              label="Razão Social"
              placeholder="Nome jurídico da clínica"
              {...register('razaoSocial')}
              error={errors.razaoSocial?.message}
            />

            <div className="md:col-span-2">
              <Input
                label="Endereço Postal (para SAF-T)"
                placeholder="Rua, nº, Bairro, Código Postal"
                {...register('enderecoPostal')}
                error={errors.enderecoPostal?.message}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Regime Fiscal"
                options={REGIME_FISCAL_OPTIONS}
                {...register('regimeFiscal')}
              />
            </div>
          </div>
        </Card>

        {/* Card 2 — Certificação AGT */}
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <ShieldCheck className="h-4 w-4" />
            Certificação AGT
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Status Informativo — Não editável pelo utente */}
            <div className="md:col-span-2">
               <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <ShieldCheck className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 tracking-tight">Software Certificado por AGT</p>
                      <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">
                        Certificado nº: {import.meta.env.VITE_AGT_CERTIFICATE_NUMBER || '0/AGT/2026'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Válido
                  </Badge>
               </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Série Documental Singular"
                placeholder="Ex: A, 2026, CLINICA"
                {...register('serieDocFiscal')}
                error={errors.serieDocFiscal?.message}
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                A série identifica os seus documentos de forma única nesta clínica.
              </p>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-3 text-xs text-neutral-500">
            <p>
              O ClinicaPlus é um software certificado. Os documentos emitidos por esta clínica 
              utilizam a assinatura digital oficial do sistema parceiro da AGT.
            </p>
          </div>
        </Card>

        {/* Card 3 — Integração API AGT */}
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Wifi className="h-4 w-4" />
            Integração API AGT (e-Factura)
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Token API AGT</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Bearer token da API AGT..."
                className="w-full border border-neutral-200 rounded-lg px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                {...register('agtApiToken')}
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 rounded p-2">
            <span className="text-neutral-400">URL:</span>
            <span className="font-mono text-neutral-600">
              {import.meta.env.VITE_AGT_API_URL ?? 'https://api-agt.minfin.gov.ao/efatura/v1'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestarConexao}
              loading={testarConexaoMutation.isPending}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Testar Conexão
            </Button>

            {conexaoStatus === 'ok' && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conexão OK
              </Badge>
            )}
            {conexaoStatus === 'erro' && (
              <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Falha na conexão
              </Badge>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}
