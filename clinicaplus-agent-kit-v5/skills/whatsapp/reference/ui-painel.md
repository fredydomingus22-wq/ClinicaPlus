# Reference — UI WhatsApp: Estados, Comportamentos e Componentes

## 1. Árvore de estados da UI

```
WhatsappPage
├── PlanGate (planoMinimo="PRO")
│   ├── [BASICO] → UpgradeBanner + preview bloqueado
│   └── [PRO/ENTERPRISE] →
│       ├── WaConexaoCard
│       │   ├── estado: DESCONECTADO → BotaoCriar
│       │   ├── estado: AGUARDA_QR  → QrCodeDisplay + Countdown + BotaoCancelar
│       │   ├── estado: CONECTADO   → NumeroConectado + BotaoDesligar
│       │   └── estado: ERRO        → ErroCard + BotaoTentarNovamente
│       │
│       ├── WaAutomacoesSection (só visível se CONECTADO)
│       │   ├── WaAutomacaoCard[MARCACAO_CONSULTA]
│       │   ├── WaAutomacaoCard[LEMBRETE_24H]
│       │   ├── WaAutomacaoCard[LEMBRETE_2H]
│       │   ├── WaAutomacaoCard[CONFIRMACAO_CANCELAMENTO]
│       │   └── WaAutomacaoCard[BOAS_VINDAS]
│       │
│       └── WaActividadeRecente (só visível se PRO/ENTERPRISE)
```

---

## 2. WaConexaoCard — especificação completa por estado

### Estado: DESCONECTADO

```tsx
<Card className="border-2 border-dashed border-gray-200 bg-gray-50">
  <CardContent className="py-8 flex flex-col items-center gap-4 text-center">

    {/* Ícone WhatsApp cinzento */}
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
      <WhatsappIcon className="w-8 h-8 text-gray-400" />
    </div>

    <div>
      <h3 className="font-semibold text-gray-700">WhatsApp não ligado</h3>
      <p className="text-sm text-gray-500 mt-1">
        Liga um número WhatsApp para activar as automações da clínica.
      </p>
    </div>

    {/* Botão principal */}
    <Button
      onClick={handleCriarInstancia}
      loading={isCriando}
      className="bg-green-600 hover:bg-green-700 text-white gap-2"
    >
      <WhatsappIcon className="w-4 h-4" />
      Conectar WhatsApp
    </Button>

    {/* Info sobre o que vai acontecer */}
    <p className="text-xs text-gray-400">
      Vai aparecer um QR code para escanear com o teu telemóvel.
    </p>

  </CardContent>
</Card>
```

---

### Estado: AGUARDA_QR

```tsx
<Card className="border-2 border-amber-200 bg-amber-50">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <CardTitle className="text-sm font-medium text-amber-800">
          A aguardar scan do QR Code
        </CardTitle>
      </div>
      {/* Countdown */}
      <QrCountdown
        expiresAt={instancia.qrExpiresAt}
        onExpired={() => {/* QR é auto-renovado via WebSocket — nada a fazer */}}
      />
    </div>
  </CardHeader>

  <CardContent className="flex flex-col lg:flex-row gap-6 items-start">

    {/* QR Code */}
    <div className="flex-shrink-0">
      {instancia.qrCodeBase64 ? (
        <img
          src={instancia.qrCodeBase64}
          alt="QR Code WhatsApp"
          className="w-48 h-48 rounded-lg border border-amber-200"
        />
      ) : (
        <div className="w-48 h-48 rounded-lg border border-amber-200 bg-white flex items-center justify-center">
          <Spinner className="w-8 h-8 text-amber-500" />
        </div>
      )}
    </div>

    {/* Instruções */}
    <div className="flex-1 space-y-3">
      <p className="text-sm font-medium text-amber-900">Como escanear:</p>
      <ol className="space-y-2">
        {[
          'Abre o WhatsApp no teu telemóvel',
          'Toca em ⋮ (menu) ou em Definições',
          'Selecciona "Dispositivos ligados"',
          'Toca em "Ligar um dispositivo"',
          'Aponta a câmara para o QR Code',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center flex-shrink-0 font-bold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancelar}
        className="text-amber-700 hover:text-amber-900 mt-2"
      >
        Cancelar
      </Button>
    </div>

  </CardContent>
</Card>
```

**QrCountdown component:**
```tsx
function QrCountdown({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSegundos(diff);
      if (diff === 0) onExpired();
    };

    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={`text-xs font-mono ${segundos < 15 ? 'text-red-600' : 'text-amber-600'}`}>
      {segundos > 0 ? `Expira em ${segundos}s` : 'A renovar...'}
    </span>
  );
}
```

---

### Estado: CONECTADO

```tsx
<Card className="border-2 border-green-200 bg-green-50">
  <CardContent className="py-4">
    <div className="flex items-center justify-between">

      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <WhatsappIcon className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-semibold text-green-800">Conectado</span>
          </div>
          <p className="text-sm text-green-700 font-mono">
            {formatarTelefone(instancia.numeroTelefone)}
          </p>
          <p className="text-xs text-green-600">
            Desde {formatarDataCurta(instancia.actualizadoEm)}
          </p>
        </div>
      </div>

      {/* Acções */}
      <div className="flex items-center gap-2">
        {/* Stats rápidas */}
        <div className="text-right text-xs text-green-700 mr-4">
          <p><strong>{stats.marcacoesHoje}</strong> marcações hoje</p>
          <p><strong>{stats.lembretesEnviados}</strong> lembretes enviados</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirmDesligar(true)}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          Desligar
        </Button>
      </div>

    </div>
  </CardContent>
</Card>

{/* Modal de confirmação para desligar */}
<ConfirmModal
  open={showConfirmDesligar}
  onClose={() => setShowConfirmDesligar(false)}
  onConfirm={handleDesligar}
  title="Desligar WhatsApp"
  description="Desligar irá pausar todas as automações activas. As conversas em curso serão interrompidas. Confirmas?"
  confirmText="Sim, desligar"
  confirmVariant="danger"
/>
```

---

### Estado: ERRO

```tsx
<Card className="border-2 border-red-200 bg-red-50">
  <CardContent className="py-6 flex flex-col items-center gap-4 text-center">
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
      <AlertCircleIcon className="w-6 h-6 text-red-500" />
    </div>
    <div>
      <h3 className="font-semibold text-red-800">Erro na conexão</h3>
      <p className="text-sm text-red-600 mt-1">{instancia.erroMensagem ?? 'Ocorreu um erro inesperado.'}</p>
    </div>
    <div className="flex gap-2">
      <Button onClick={handleTentarNovamente} variant="outline" className="border-red-300 text-red-700">
        Tentar novamente
      </Button>
      <Button onClick={handleEliminarERecriar} variant="ghost" size="sm" className="text-red-500">
        Reconectar com novo QR
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 3. WaAutomacaoCard — especificação completa

```tsx
// Configuração visual por tipo
const AUTOMACAO_META: Record<WaTipoAutomacao, {
  icone:    string;
  titulo:   string;
  descricao:string;
  badge?:   string;  // badge de aviso de dependência
}> = {
  MARCACAO_CONSULTA:        { icone: '🗓', titulo: 'Marcação de Consultas',     descricao: 'Pacientes marcam consultas via WhatsApp 24/7' },
  LEMBRETE_24H:             { icone: '🔔', titulo: 'Lembrete 24h antes',        descricao: 'Mensagem automática na véspera da consulta' },
  LEMBRETE_2H:              { icone: '⏰', titulo: 'Lembrete 2h antes',         descricao: 'Segundo lembrete 2 horas antes da consulta' },
  CONFIRMACAO_CANCELAMENTO: { icone: '✅', titulo: 'Confirmação por resposta',   descricao: 'Paciente responde SIM/NÃO ao lembrete', badge: 'Requer lembrete activo' },
  BOAS_VINDAS:              { icone: '👋', titulo: 'Mensagem de boas-vindas',   descricao: 'Primeira mensagem para números desconhecidos' },
};
```

```tsx
function WaAutomacaoCard({ automacao, instanciaConectada }: WaAutomacaoCardProps) {
  const meta    = AUTOMACAO_META[automacao.tipo];
  const [config, setConfig] = useState(automacao.configuracao);
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);

  const activarMutation   = useActivarAutomacao();
  const desactivarMutation = useDesactivarAutomacao();
  const guardarMutation    = useGuardarConfigAutomacao();

  const handleToggle = async () => {
    if (!instanciaConectada) return;  // disabled — não deve chegar aqui

    if (automacao.ativo) {
      await desactivarMutation.mutateAsync(automacao.id);
    } else {
      await activarMutation.mutateAsync(automacao.id);
    }
  };

  return (
    <Card className={cn(
      'transition-all',
      automacao.ativo ? 'border-green-200 bg-green-50/30' : 'border-gray-200',
      !instanciaConectada && 'opacity-60'
    )}>
      <CardContent className="py-4">

        {/* Header: ícone + título + toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">{meta.icone}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{meta.titulo}</p>
                {meta.badge && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {meta.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{meta.descricao}</p>
            </div>
          </div>

          {/* Toggle com loading state */}
          <Tooltip
            content={!instanciaConectada ? 'Liga o WhatsApp primeiro' : undefined}
            disabled={instanciaConectada}
          >
            <Toggle
              checked={automacao.ativo}
              onChange={handleToggle}
              disabled={!instanciaConectada || activarMutation.isPending || desactivarMutation.isPending}
              loading={activarMutation.isPending || desactivarMutation.isPending}
            />
          </Tooltip>
        </div>

        {/* Campos de configuração — só visíveis quando activo */}
        {automacao.ativo && (
          <div className="mt-4 pt-4 border-t border-green-100 space-y-3">
            <ConfigFields
              tipo={automacao.tipo}
              config={config}
              onChange={(key, value) => {
                setConfig(prev => ({ ...prev, [key]: value }));
                setDirty(true);
              }}
            />

            {/* Botão guardar — só aparece com alterações */}
            {dirty && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-amber-600">⚠ Alterações não guardadas</p>
                <Button
                  size="sm"
                  onClick={async () => {
                    setSaving(true);
                    await guardarMutation.mutateAsync({ id: automacao.id, configuracao: config });
                    setDirty(false);
                    setSaving(false);
                  }}
                  loading={saving}
                >
                  Guardar configuração
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Erro de activação */}
        {activarMutation.isError && (
          <p className="mt-2 text-xs text-red-600">
            {activarMutation.error?.message ?? 'Não foi possível activar. Tenta novamente.'}
          </p>
        )}

      </CardContent>
    </Card>
  );
}
```

---

## 4. ConfigFields — campos por tipo de automação

```tsx
function ConfigFields({ tipo, config, onChange }: ConfigFieldsProps) {
  const vars = {
    LEMBRETE: '{nome}, {data}, {hora}, {medico}, {especialidade}, {clinica}',
    MARCACAO: '{inicio}, {fim}',
    CONFIRMACAO: '{nome}',
  };

  switch (tipo) {
    case 'MARCACAO_CONSULTA':
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Horário início">
              <input type="time" value={config.horarioInicio ?? '08:00'}
                onChange={e => onChange('horarioInicio', e.target.value)}
                className={inputClass()} />
            </FormField>
            <FormField label="Horário fim">
              <input type="time" value={config.horarioFim ?? '18:00'}
                onChange={e => onChange('horarioFim', e.target.value)}
                className={inputClass()} />
            </FormField>
          </div>
          <FormField label="Dias activos">
            <DiasSemanaToggle
              value={config.diasAtivos ?? [1,2,3,4,5]}
              onChange={v => onChange('diasAtivos', v)} />
          </FormField>
          <TextareaField
            label="Mensagem fora do horário"
            value={config.msgForaHorario}
            onChange={v => onChange('msgForaHorario', v)}
            vars={vars.MARCACAO}
            placeholder="Olá! O bot de marcações está disponível das {inicio} às {fim}." />
        </>
      );

    case 'LEMBRETE_24H':
    case 'LEMBRETE_2H':
      return (
        <TextareaField
          label="Mensagem de lembrete"
          value={config.template}
          onChange={v => onChange('template', v)}
          vars={vars.LEMBRETE}
          placeholder="Olá {nome}! Lembrete da consulta {data} às {hora} com {medico}. Confirmas? 1-SIM 2-NÃO" />
      );

    case 'CONFIRMACAO_CANCELAMENTO':
      return (
        <>
          <TextareaField label="Mensagem ao confirmar" value={config.msgConfirmado}
            onChange={v => onChange('msgConfirmado', v)} vars={vars.CONFIRMACAO}
            placeholder="✅ Consulta confirmada! Até logo, {nome}." />
          <TextareaField label="Mensagem ao cancelar" value={config.msgCancelado}
            onChange={v => onChange('msgCancelado', v)} vars={vars.CONFIRMACAO}
            placeholder="Consulta cancelada. Para remarcar escreve *marcar*." />
        </>
      );

    case 'BOAS_VINDAS':
      return (
        <TextareaField label="Mensagem de boas-vindas" value={config.mensagem}
          onChange={v => onChange('mensagem', v)} vars="{clinica}"
          placeholder="Olá! 👋 Bem-vindo a {clinica}. Para marcar consulta escreve *marcar*." />
      );
  }
}

// TextareaField com hint de variáveis disponíveis
function TextareaField({ label, value, onChange, vars, placeholder }: TextareaFieldProps) {
  return (
    <FormField label={label}>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={inputClass('resize-none')} />
      <p className="text-xs text-gray-400 mt-1">
        Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{vars}</code>
      </p>
    </FormField>
  );
}
```

---

## 5. WaActividadeRecente — feed em tempo real

```tsx
export function WaActividadeRecente() {
  const { data: actividade } = useQuery({
    queryKey: ['wa-actividade'],
    queryFn:  () => fetchWaActividade({ limit: 20 }),
  });

  // Actualizar em tempo real via WebSocket
  const queryClient = useQueryClient();
  useSocketEvent('whatsapp:marcacao', () => {
    queryClient.invalidateQueries({ queryKey: ['wa-actividade'] });
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Actividade recente</CardTitle>
        <span className="text-xs text-gray-400">Via WhatsApp</span>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {actividade?.items.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            Nenhuma actividade ainda. As marcações via WhatsApp aparecem aqui.
          </p>
        )}
        {actividade?.items.map(item => (
          <ActividadeItem key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

function ActividadeItem({ item }: { item: WaActividadeItem }) {
  const icones = {
    MARCACAO:     '🗓',
    LEMBRETE:     '🔔',
    CONFIRMACAO:  '✅',
    CANCELAMENTO: '❌',
    BOAS_VINDAS:  '👋',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 hover:bg-gray-50 cursor-pointer rounded"
         onClick={() => navigate(`/admin/agendamentos/${item.agendamentoId}`)}>
      <span className="text-lg">{icones[item.tipo]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.pacienteNome}</p>
        <p className="text-xs text-gray-500">{item.descricao}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">
        {formatRelativo(item.criadoEm)}
      </span>
    </div>
  );
}
```

---

## 6. Hook useWhatsapp — estado global

```typescript
// apps/web/src/hooks/useWhatsapp.ts
// Centraliza queries, mutations e WebSocket para o módulo WhatsApp

export function useWhatsapp() {
  const queryClient = useQueryClient();

  // Queries
  const { data: estado } = useQuery({
    queryKey: ['wa-estado'],
    queryFn:  fetchWaEstado,
    refetchInterval: 30_000,  // polling de backup se WebSocket falhar
  });

  const { data: automacoes } = useQuery({
    queryKey: ['wa-automacoes'],
    queryFn:  fetchWaAutomacoes,
    enabled:  estado?.estado === 'CONECTADO',
  });

  // WebSocket — actualizações em tempo real
  useSocketEvent('whatsapp:estado',   (data: { estado: string; numeroTelefone?: string }) => {
    queryClient.setQueryData(['wa-estado'], (prev: WaEstado) => ({ ...prev, ...data }));
  });

  useSocketEvent('whatsapp:qrcode', (data: { qrCode: string; expiresAt: string }) => {
    queryClient.setQueryData(['wa-estado'], (prev: WaEstado) => ({
      ...prev,
      estado:       'AGUARDA_QR',
      qrCodeBase64: data.qrCode,
      qrExpiresAt:  data.expiresAt,
    }));
  });

  useSocketEvent('whatsapp:marcacao', () => {
    queryClient.invalidateQueries({ queryKey: ['wa-actividade'] });
    queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
  });

  // Mutations
  const criarInstancia    = useMutation({ mutationFn: postCriarInstancia,    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-estado'] }) });
  const desligarInstancia = useMutation({ mutationFn: deleteInstancia,       onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-estado'] }) });
  const activarAutomacao  = useMutation({ mutationFn: postActivarAutomacao,  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-automacoes'] }) });
  const desactivarAutomacao = useMutation({ mutationFn: postDesactivarAutomacao, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-automacoes'] }) });

  return {
    estado,
    automacoes,
    criarInstancia,
    desligarInstancia,
    activarAutomacao,
    desactivarAutomacao,
    isConectado: estado?.estado === 'CONECTADO',
  };
}
```
