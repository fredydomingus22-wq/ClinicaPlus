import React, { useState } from 'react';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
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
  cn,
} from '@clinicaplus/ui';
import {
  Wifi, CheckCircle2, AlertTriangle, Info, Save, FileText, Settings, ShieldCheck, X, Edit, RotateCw, List,
} from 'lucide-react';
import { useConfiguracaoFiscal, useGuardarConfiguracaoFiscal, useTestarConexaoAgt } from '../../hooks/useFiscal';
import { type ConfiguracaoFiscalInput } from '../../api/fiscal';

const ConfiguracaoFiscalSchema = z.object({
  tipoEntidade: z.enum(['SINGULAR', 'EMPRESA']).default('EMPRESA'),
  nif: z.string().min(9, 'NIF inválido').max(13, 'NIF inválido'),
  razaoSocial: z.string().max(200).optional(),
  enderecoPostal: z.string().max(300).optional(),
  regimeFiscal: z.enum(['GERAL', 'SIMPLIFICADO', 'EXUSA']).optional(),
  serieDocFiscal: z.string().optional(),
  agtPrivateKey: z.string().optional(),
  agtPublicKey: z.string().optional(),
}).refine(data => {
  if (data.tipoEntidade === 'EMPRESA') return !data.nif || data.nif.length === 10;
  if (data.tipoEntidade === 'SINGULAR') return !data.nif || data.nif.length === 13;
  return true;
}, {
  message: 'NIF incompatível com tipo de entidade (Empresa: 10, Singular: 13)',
  path: ['nif'],
});

type FormValues = z.infer<typeof ConfiguracaoFiscalSchema>;

const REGIME_FISCAL_OPTIONS = [
  { value: 'GERAL', label: 'Regime Geral (IVA 14%)' },
  { value: 'SIMPLIFICADO', label: 'Regime Simplificado (IVA 7%)' },
  { value: 'EXUSA', label: 'Exclusão / Isento' },
];

const ENTIDADE_TIPO_OPTIONS = [
  { value: 'EMPRESA', label: 'Empresa (NIF 10 dígitos)' },
  { value: 'SINGULAR', label: 'Singular (NIF 13 dígitos)' },
];

export default function ConfiguracaoFiscalPage() {
  const { data: config, isLoading } = useConfiguracaoFiscal();
  const guardarMutation = useGuardarConfiguracaoFiscal();
  const testarConexaoMutation = useTestarConexaoAgt();
  const [conexaoStatus, setConexaoStatus] = useState<'idle' | 'ok' | 'erro'>('idle');
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(ConfiguracaoFiscalSchema) as Resolver<FormValues>,
    defaultValues: {
      tipoEntidade: 'EMPRESA',
      nif: '',
      razaoSocial: '',
      enderecoPostal: '',
      regimeFiscal: 'GERAL',
      serieDocFiscal: '',
      agtPrivateKey: '',
      agtPublicKey: '',
    },
  });

  // Actualiza o formulário quando os dados chegam
  React.useEffect(() => {
    if (config) {
      reset({
        tipoEntidade: (config.tipoEntidade as 'SINGULAR' | 'EMPRESA') || 'EMPRESA',
        nif: config.nif || '',
        razaoSocial: config.razaoSocial || '',
        enderecoPostal: config.enderecoPostal || '',
        regimeFiscal: (config.regimeFiscal as 'GERAL' | 'SIMPLIFICADO' | 'EXUSA') || 'GERAL',
        serieDocFiscal: config.serieDocFiscal || '',
        // Por segurança o backend não devolve as chaves depois de guardadas.
        // Para substituir, o admin deve colar novamente e guardar.
        agtPrivateKey: '',
        agtPublicKey: '',
      });
    }
  }, [config, reset]);

  const tipoEntidade = watch('tipoEntidade');

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const { agtPrivateKey, agtPublicKey, ...rest } = data;
      const dataToSave: ConfiguracaoFiscalInput = {
        ...(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as ConfiguracaoFiscalInput),
        ...(agtPrivateKey && agtPrivateKey.trim() ? { agtPrivateKey: agtPrivateKey.trim() } : {}),
        ...(agtPublicKey && agtPublicKey.trim() ? { agtPublicKey: agtPublicKey.trim() } : {}),
      };

      await guardarMutation.mutateAsync(dataToSave);
      toast.success('Configuração fiscal guardada com sucesso.');
      setIsEditing(false);
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
      toast.error('Erro ao testar conexão. Verifique as credenciais AGT.');
    }
  };

  const nifConfigurado = config?.nif && (config.nif.length === 10 || config.nif.length === 13);

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
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Editar Dados
            </Button>
          ) : (
            <>
               <Button variant="secondary" onClick={() => { setIsEditing(false); reset(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                loading={guardarMutation.isPending}
                disabled={!isDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Banner de aviso — sem NIF */}
      {!nifConfigurado && !isEditing && (
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

      {/* VIEW MODE: Summary */}
      {!isEditing && config?.nif ? (
        <div className="space-y-6">
          <Card className="p-6">
             <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Dados do Contribuinte
                </h2>
                <Badge className={config.nif ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                  {config.nif ? 'Configurado' : 'Pendente'}
                </Badge>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Tipo de Entidade</p>
                  <p className="text-sm font-medium text-neutral-700">
                    {config.tipoEntidade === 'SINGULAR' ? 'Singular / Individual' : 'Empresa / Colectiva'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">NIF</p>
                  <p className="text-sm font-medium text-neutral-900 font-mono tracking-wider">{config.nif}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Razão Social</p>
                  <p className="text-sm font-medium text-neutral-700">{config.razaoSocial || 'Não configurada'}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Endereço Postal</p>
                  <p className="text-sm font-medium text-neutral-700">{config.enderecoPostal || 'Não configurado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Regime Fiscal</p>
                  <Badge variant="neutral" className="capitalize">{config.regimeFiscal?.toLowerCase() || 'Não definido'}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Série Documental</p>
                  <p className="text-sm font-medium text-neutral-900">{config.serieDocFiscal || 'CPLS'}</p>
                </div>
             </div>
          </Card>

          <Card className="p-6">
             <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
                <ShieldCheck className="h-4 w-4" />
                Integração e Certificação
             </h2>
             <div className="space-y-4">
                <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <ShieldCheck className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 tracking-tight">Software Certificado por AGT</p>
                        <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">
                          Nº 0/AGT/2026
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                   <div className="flex items-center gap-2">
                      <Wifi className={cn("h-4 w-4", conexaoStatus === 'ok' ? 'text-green-500' : conexaoStatus === 'erro' ? 'text-red-500' : 'text-neutral-400')} />
                      <span className="text-xs text-neutral-600 font-medium">Link Directo com AGT</span>
                   </div>
                   <Button size="sm" variant="outline" onClick={handleTestarConexao} loading={testarConexaoMutation.isPending}>
                      Testar Conexão
                   </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-xs text-neutral-600 font-medium">Chave Privada (RSA)</span>
                    <Badge className={config.agtPrivateKeyConfigured ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}>
                      {config.agtPrivateKeyConfigured ? 'Configurada' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-xs text-neutral-600 font-medium">Chave Pública (RSA)</span>
                    <Badge className={config.agtPublicKeyConfigured ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}>
                      {config.agtPublicKeyConfigured ? 'Configurada' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
             </div>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1 — Dados do Contribuinte */}
          <Card className="p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Settings className="h-4 w-4" />
              Dados do Contribuinte
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Select
                  label="Tipo de Entidade"
                  options={ENTIDADE_TIPO_OPTIONS}
                  {...register('tipoEntidade')}
                />
              </div>

              <div>
                <Input
                  label={`NIF (${tipoEntidade === 'EMPRESA' ? '10 dígitos' : '13 dígitos'})`}
                  placeholder="0000000000"
                  maxLength={tipoEntidade === 'EMPRESA' ? 10 : 13}
                  {...register('nif')}
                  error={errors.nif?.message}
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Introduza o NIF {tipoEntidade === 'EMPRESA' ? 'da empresa' : 'singular'}.
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
                  placeholder="Rua, nº, Bairro, Cidade"
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

          {/* Card 3 — Certificação e Chaves RSA */}
          <Card className="p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <ShieldCheck className="h-4 w-4" />
              Certificação e Chaves RSA
            </h2>
            
            <div className="space-y-4">
              <Input
                label="Série Documental"
                placeholder="Ex: CPLS, 2026, A"
                {...register('serieDocFiscal')}
                error={errors.serieDocFiscal?.message}
              />
              <p className="text-[10px] text-neutral-400 italic">
                A série identifica os seus documentos de forma única nesta clínica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Chave Privada (PEM)</label>
                <textarea
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  rows={3}
                  className="w-full border border-neutral-200 rounded-lg px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                  {...register('agtPrivateKey')}
                />
                <p className="text-[10px] text-neutral-400">
                  Por segurança, a chave não é exibida depois de guardada. Cole aqui apenas se quiser substituir.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Chave Pública (PEM)</label>
                <textarea
                  placeholder="-----BEGIN PUBLIC KEY-----"
                  rows={3}
                  className="w-full border border-neutral-200 rounded-lg px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                  {...register('agtPublicKey')}
                />
                <p className="text-[10px] text-neutral-400">
                  Cole aqui a chave pública correspondente (apenas se quiser substituir).
                </p>
              </div>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
