import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Badge, 
  Tabs, 
  Input,
  Spinner,
  ErrorMessage,
  EmptyState
} from '@clinicaplus/ui';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  ExternalLink,
  Plus,
  Download,
  Copy
} from 'lucide-react';
import { 
  useSeriesAgt, 
  useSolicitarSerieAgt,
  useHistoricoAgt,
  useValidarDocumentoAgt,
  useAuditHashChain,
  useExportarSaft,
  useConsultarFaturaAgt
} from '../../hooks/useFiscal';
import type { AgtHistoricoItem } from '../../api/fiscal';
import { formatKwanza } from '@clinicaplus/utils';
import { toast } from 'react-hot-toast';

interface AgtSerie {
  id: string;
  serieCode: string;
  documentType: string;
  authorizedQuantity: number;
  availableQuantity: number;
  status: string;
}

export default function ConsolaFiscalPage() {
  const [activeTab, setActiveTab] = useState('series');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]!,
    endDate: new Date().toISOString().split('T')[0]!
  });

  const { data: series, isLoading: loadingSeries, error: errorSeries } = useSeriesAgt();
  const { data: historico, isLoading: loadingHist, error: errorHist, refetch: refetchHist } = useHistoricoAgt(dateRange);
  
  const exportarSaftMutation = useExportarSaft();
  
  const [faturaIdParaValidar, setFaturaIdParaValidar] = useState('');
  const validarDocMutation = useValidarDocumentoAgt();
  
  const auditHashMutation = useAuditHashChain();

  const [numeroFaturaConsulta, setNumeroFaturaConsulta] = useState('');
  const consultarFaturaAgtMutation = useConsultarFaturaAgt();

  const solicitarSerieMutation = useSolicitarSerieAgt();

  const handleSolicitarSerie = async () => {
    try {
      await solicitarSerieMutation.mutateAsync({
        serieCode: 'A',
        authorizedQuantity: 1000,
        documentType: 'FT'
      });
      toast.success('Solicitação de série enviada com sucesso!');
    } catch (err: unknown) {
      const error = err as any;
      toast.error(error.response?.data?.error || 'Erro ao solicitar série');
    }
  };

  const handleExportSaft = async () => {
    try {
      const blob = await exportarSaftMutation.mutateAsync({
        dataInicio: dateRange.startDate,
        dataFim: dateRange.endDate
      });
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `saft_ao_${dateRange.startDate}_${dateRange.endDate}.xml`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Ficheiro SAF-T (AO) exportado com sucesso!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error('Erro ao exportar ficheiro SAF-T.');
    }
  };

  const handleValidarDoc = async () => {
    if (!faturaIdParaValidar.trim()) {
      toast.error('Informe o ID local da fatura.');
      return;
    }
    try {
      await validarDocMutation.mutateAsync(faturaIdParaValidar);
      toast.success('Validação processada. Consulte o log (Network) para detalhes completos.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error('Ocorreu um erro ao validar documento. Verifique se o ID existe.');
    }
  };

  const handleAuditHash = async () => {
    try {
      const response = await auditHashMutation.mutateAsync();
      if (response.valida) {
        toast.success(`Cadeia de Hashes válida! ${response.totalDocumentos} documentos testados.`);
      } else {
        toast.error(`Falha na cadeia. ${response.falhas.length} problemas encontrados.`);
      }
    } catch {
      toast.error('Falha ao processar auditoria.');
    }
  };

  const handleConsultarFaturaAgt = async () => {
    if (!numeroFaturaConsulta.trim()) {
      toast.error('Informe o número da fatura (ex: FT 2024/1).');
      return;
    }
    try {
      await consultarFaturaAgtMutation.mutateAsync(numeroFaturaConsulta);
      toast.success('Documento obtido da AGT.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(
        error.response?.data?.error ||
          'Erro na consulta. O documento pode não existir na AGT ou o NIF difere.',
      );
    }
  };

  const copyJson = async (value: unknown, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      toast.success(successMessage);
    } catch {
      toast.error('Não foi possível copiar para a área de transferência.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 mt-4">
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => refetchHist()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'series', label: 'Séries Autorizadas' },
          { id: 'historico', label: 'Histórico na AGT' },
          { id: 'saft', label: 'Ficheiro SAF-T' },
          { id: 'ferramentas', label: 'Ferramentas de Depuração' }
        ]}
      />

      <div className="mt-6">
        {activeTab === 'series' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Séries Ativas</h3>
              <Button size="sm" onClick={handleSolicitarSerie} loading={solicitarSerieMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Solicitar Nova Série
              </Button>
            </div>

            {loadingSeries ? (
              <div className="flex justify-center p-12"><Spinner /></div>
            ) : errorSeries ? (
              <ErrorMessage error={errorSeries} />
            ) : (
              <Card className="p-0 overflow-hidden">
                <Table<AgtSerie>
                  columns={[
                    { header: 'Cód. Série', accessor: 'serieCode' },
                    { header: 'Tipo Doc.', accessor: 'documentType' },
                    { header: 'Qtd. Autorizada', accessor: 'authorizedQuantity' },
                    { header: 'Disponível', accessor: 'availableQuantity' },
                    { 
                      header: 'Estado', 
                      accessor: (row) => (
                        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {row.status === 'ACTIVE' ? 'Ativa' : 'Expirada'}
                        </Badge>
                      ) 
                    },
                  ]}
                  data={series?.items || []}
                  keyExtractor={(row) => row.id}
                  emptyContent={<EmptyState title="Nenhuma série encontrada" description="Nenhuma série encontrada na AGT." />}
                />
              </Card>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            <Card className="p-4 flex flex-wrap gap-4 items-end bg-neutral-50/50 border-neutral-100">
              <div className="flex-1 min-w-[200px]">
                <Input 
                  label="Início" 
                  type="date" 
                  value={dateRange.startDate} 
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input 
                  label="Fim" 
                  type="date" 
                  value={dateRange.endDate} 
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <Button onClick={() => refetchHist()}>
                <Search className="h-4 w-4 mr-2" /> Consultar AGT
              </Button>
            </Card>

            {loadingHist ? (
              <div className="flex justify-center p-12"><Spinner /></div>
            ) : errorHist ? (
              <ErrorMessage error={errorHist} />
            ) : (
              <Card className="p-0 overflow-hidden">
                <Table<AgtHistoricoItem>
                  columns={[
                    { header: 'Data', accessor: (row) => new Date(row.submissionTimeStamp).toLocaleDateString() },
                    { header: 'Número', accessor: 'documentNo', className: 'font-mono' },
                    { header: 'NIF Cliente', accessor: 'customerTaxID' },
                    { header: 'Total s/ IVA', accessor: (row) => (row.totalWithoutTax === null ? '—' : formatKwanza(row.totalWithoutTax)) },
                    { header: 'IVA', accessor: (row) => (row.taxAmount === null ? '—' : formatKwanza(row.taxAmount)) },
                    { header: 'Total Bruto', accessor: (row) => (row.grossTotal === null ? '—' : <span className="font-bold">{formatKwanza(row.grossTotal)}</span>) },
                    {
                      header: 'Dados',
                      accessor: (row) => (
                        <Badge variant={row.hasPartialData ? 'warning' : 'success'}>
                          {row.hasPartialData ? 'Parcial' : 'Completo'}
                        </Badge>
                      )
                    },
                    { 
                      header: 'Acções', 
                      accessor: () => (
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )
                    }
                  ]}
                  data={historico?.items || []}
                  keyExtractor={(row) => row.submissionUUID}
                  emptyContent={<EmptyState title="Sem histórico" description="Nenhum documento encontrado na AGT para este período." />}
                />
              </Card>
            )}
          </div>
        )}

        {activeTab === 'saft' && (
          <div className="space-y-4">
            <Card className="p-6">
               <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Exportação XML SAF-T (AO)</h4>
                  <p className="text-xs text-neutral-500">Gere o Ficheiro Standard de Auditoria Tributária para submissão no Portal TPA.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-end bg-neutral-50/50 border border-neutral-100 p-4 rounded-xl">
                <div className="flex-1 min-w-[200px]">
                  <Input 
                    label="Data Inicial" 
                    type="date" 
                    value={dateRange.startDate} 
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input 
                    label="Data Final" 
                    type="date" 
                    value={dateRange.endDate} 
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
                <Button 
                   onClick={handleExportSaft} 
                   loading={exportarSaftMutation.isPending}
                   className="w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" /> Exportar Ficheiro (.xml)
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'ferramentas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Validação de Documento</h4>
                  <p className="text-xs text-neutral-500">Verifique se um documento local existe e é válido na AGT.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input 
                   placeholder="ID Local da Fatura" 
                   value={faturaIdParaValidar}
                   onChange={e => setFaturaIdParaValidar(e.target.value)}
                />
                <Button 
                   fullWidth 
                   variant="outline" 
                   onClick={handleValidarDoc} 
                   loading={validarDocMutation.isPending}
                >
                   Validar na AGT
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Auditoria Hash Chain</h4>
                  <p className="text-xs text-neutral-500">Valida a cadeia de bloqueio e assinaturas RSA de todos os documentos.</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-6 italic">
                A ferramenta irá ler todas as facturas em memória, reconstruir a hash message e aplicar verificação cruzada com a chave pública.
              </p>
              <Button 
                fullWidth 
                variant="secondary" 
                onClick={handleAuditHash} 
                loading={auditHashMutation.isPending}
              >
                Auditar Integridade
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Consultar Fatura na AGT</h4>
                  <p className="text-xs text-neutral-500">Busca os dados de uma fatura específica diretamente no servidor da AGT usando o Webservice.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input 
                   placeholder="Número da Fatura (ex: FT 2024/1)" 
                   value={numeroFaturaConsulta}
                   onChange={e => setNumeroFaturaConsulta(e.target.value)}
                />
                <Button 
                   fullWidth 
                   variant="outline" 
                   onClick={handleConsultarFaturaAgt} 
                   loading={consultarFaturaAgtMutation.isPending}
                >
                   Buscar Detalhes
                </Button>
                <Button
                  fullWidth
                  variant="ghost"
                  onClick={() => copyJson({ documentNo: numeroFaturaConsulta.trim() }, 'Payload copiado.')}
                  disabled={!numeroFaturaConsulta.trim()}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar Payload
                </Button>
                {consultarFaturaAgtMutation.error && (
                  <Card className="p-4 border-danger-200 bg-danger-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-danger-700">Erro AGT</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="error">
                          {String((consultarFaturaAgtMutation.error as { response?: { data?: { code?: string | number } } }).response?.data?.code || 'N/A')}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyJson((consultarFaturaAgtMutation.error as { response?: { data?: unknown } }).response?.data || {}, 'Erro AGT copiado.')}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-danger-700">
                      {(consultarFaturaAgtMutation.error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Falha ao consultar documento na AGT.'}
                    </p>
                  </Card>
                )}
                {consultarFaturaAgtMutation.data && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-neutral-800">Resultado da AGT</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={consultarFaturaAgtMutation.data.documentStatus === 'V' ? 'success' : 'warning'}>
                          {consultarFaturaAgtMutation.data.documentStatus || 'Sem status'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyJson(consultarFaturaAgtMutation.data, 'Resposta AGT copiada.')}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-neutral-500">Documento:</span> {consultarFaturaAgtMutation.data.documentNo || consultarFaturaAgtMutation.data.document?.documentNo || '—'}</div>
                      <div><span className="text-neutral-500">Tipo:</span> {consultarFaturaAgtMutation.data.document?.documentType || '—'}</div>
                      <div><span className="text-neutral-500">Data:</span> {consultarFaturaAgtMutation.data.document?.documentDate ? new Date(consultarFaturaAgtMutation.data.document.documentDate).toLocaleDateString() : '—'}</div>
                      <div><span className="text-neutral-500">Validação:</span> {consultarFaturaAgtMutation.data.validationStatus || '—'}</div>
                      <div><span className="text-neutral-500">NIF Cliente:</span> {consultarFaturaAgtMutation.data.document?.customerTaxID || '—'}</div>
                      <div><span className="text-neutral-500">Cliente:</span> {consultarFaturaAgtMutation.data.document?.companyName || '—'}</div>
                      <div><span className="text-neutral-500">Líquido:</span> {consultarFaturaAgtMutation.data.document?.documentTotals?.netTotal ? formatKwanza(Number(consultarFaturaAgtMutation.data.document.documentTotals.netTotal)) : '—'}</div>
                      <div><span className="text-neutral-500">Imposto:</span> {consultarFaturaAgtMutation.data.document?.documentTotals?.taxPayable ? formatKwanza(Number(consultarFaturaAgtMutation.data.document.documentTotals.taxPayable)) : '—'}</div>
                      <div><span className="text-neutral-500">Bruto:</span> {consultarFaturaAgtMutation.data.document?.documentTotals?.grossTotal ? formatKwanza(Number(consultarFaturaAgtMutation.data.document.documentTotals.grossTotal)) : '—'}</div>
                    </div>
                    {Array.isArray(consultarFaturaAgtMutation.data.errorList) && consultarFaturaAgtMutation.data.errorList.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {consultarFaturaAgtMutation.data.errorList.map((item, idx) => (
                          <div key={`${item.idError}-${idx}`} className="text-xs text-warning-700 bg-warning-50 border border-warning-200 rounded px-2 py-1">
                            {item.idError}: {item.descriptionError}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
