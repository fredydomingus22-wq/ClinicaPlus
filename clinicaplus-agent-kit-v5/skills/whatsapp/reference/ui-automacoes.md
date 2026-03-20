# Reference — UI do Painel de Automações WhatsApp

## WhatsappPage.tsx — estrutura completa

```tsx
// apps/web/src/pages/configuracoes/WhatsappPage.tsx

export function WhatsappPage() {
  const { clinica } = useAuthStore();
  const { data: estado }     = useQuery({ queryKey: ['wa-estado'], queryFn: fetchWaEstado, refetchInterval: 5000 });
  const { data: automacoes } = useQuery({ queryKey: ['wa-automacoes'], queryFn: fetchWaAutomacoes });
  const { data: actividade } = useQuery({ queryKey: ['wa-actividade'], queryFn: fetchWaActividade });

  // Actualizações em tempo real via WebSocket
  useSocketEvent('whatsapp:estado',   (data) => queryClient.setQueryData(['wa-estado'], data));
  useSocketEvent('whatsapp:qrcode',   (data) => queryClient.setQueryData(['wa-estado'], prev => ({ ...prev, qrCode: data.qrCode })));
  useSocketEvent('whatsapp:marcacao', () => queryClient.invalidateQueries({ queryKey: ['wa-actividade'] }));

  return (
    <PlanGate planoMinimo="PRO">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">WhatsApp & Automações</h1>
        <WaConexaoCard estado={estado} />
        {estado?.estado === 'CONECTADO' && (
          <>
            <WaAutomacoesSection automacoes={automacoes} />
            <WaActividadeRecente actividade={actividade} />
          </>
        )}
      </div>
    </PlanGate>
  );
}
```

## WaConexaoCard.tsx

```tsx
// Estado: DESCONECTADO → botão "Conectar WhatsApp"
// Estado: AGUARDA_QR   → mostrar QR code com polling
// Estado: CONECTADO    → badge verde + número + botão "Desligar"
// Estado: ERRO         → mensagem de erro + botão "Tentar novamente"

export function WaConexaoCard({ estado }: { estado: WaEstadoResponse | undefined }) {
  const conectar   = useMutation({ mutationFn: criarInstancia, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-estado'] }) });
  const desligar   = useMutation({ mutationFn: desligarInstancia });

  if (!estado || estado.estado === 'DESCONECTADO') {
    return (
      <Card>
        <CardHeader title="Ligação WhatsApp" />
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Liga o teu número WhatsApp para activar as automações.
          </p>
          <Button onClick={() => conectar.mutate()} loading={conectar.isPending}>
            Conectar WhatsApp
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (estado.estado === 'AGUARDA_QR') {
    return (
      <Card>
        <CardHeader title="Escaneia o QR Code" />
        <CardContent className="flex flex-col items-center gap-4">
          {estado.qrCode ? (
            <img src={estado.qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-muted rounded">
              <Spinner />
            </div>
          )}
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Abre o WhatsApp no teu telemóvel</li>
            <li>Toca em ⋮ → Dispositivos ligados</li>
            <li>Toca em "Ligar um dispositivo"</li>
            <li>Aponta a câmara para o QR Code acima</li>
          </ol>
        </CardContent>
      </Card>
    );
  }

  if (estado.estado === 'CONECTADO') {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-medium">Conectado</p>
              <p className="text-sm text-muted-foreground">{estado.numeroTelefone}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => desligar.mutate()}>
            Desligar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
```

## WaAutomacaoCard.tsx — card por tipo de automação

```tsx
// Cada tipo de automação tem o seu card com:
// - Toggle ativo/inativo
// - Campos de configuração específicos (colapsáveis)
// - Botão "Guardar" que só aparece após alteração

const AUTOMACAO_CONFIG: Record<WaTipoAutomacao, {
  titulo: string;
  descricao: string;
  campos: ConfigField[];
}> = {
  MARCACAO_CONSULTA: {
    titulo: '🗓 Marcação de Consultas',
    descricao: 'Pacientes marcam directamente pelo WhatsApp.',
    campos: [
      { key: 'horarioInicio',    label: 'Horário de início', type: 'time', default: '08:00' },
      { key: 'horarioFim',       label: 'Horário de fim',    type: 'time', default: '18:00' },
      { key: 'msgForaHorario',   label: 'Mensagem fora do horário', type: 'textarea',
        default: 'Olá! O nosso bot de marcações funciona das {inicio} às {fim}. Volta amanhã! 😊' },
    ],
  },
  LEMBRETE_24H: {
    titulo: '🔔 Lembrete 24h antes',
    descricao: 'Mensagem automática enviada na véspera da consulta.',
    campos: [
      { key: 'template', label: 'Mensagem', type: 'textarea',
        default: 'Olá {nome}! 👋 Lembrete da consulta amanhã às *{hora}* com *{medico}*.\n\nConfirmas? Responde *SIM* ou *NÃO*.' },
    ],
  },
  LEMBRETE_2H: {
    titulo: '⏰ Lembrete 2h antes',
    descricao: 'Segundo lembrete enviado 2 horas antes.',
    campos: [
      { key: 'template', label: 'Mensagem', type: 'textarea',
        default: 'Olá {nome}! A tua consulta com *{medico}* é daqui a 2 horas, às *{hora}*. Boa sorte! 🏥' },
    ],
  },
  CONFIRMACAO_CANCELAMENTO: {
    titulo: '✅ Confirmação por resposta',
    descricao: 'Paciente responde SIM/NÃO ao lembrete para confirmar ou cancelar.',
    campos: [
      { key: 'msgConfirmado', label: 'Mensagem ao confirmar', type: 'textarea',
        default: '✅ Consulta confirmada! Até logo, {nome}.' },
      { key: 'msgCancelado',  label: 'Mensagem ao cancelar', type: 'textarea',
        default: 'Consulta cancelada. Se precisares de remarcar escreve *marcar*.' },
    ],
  },
  BOAS_VINDAS: {
    titulo: '👋 Boas-vindas',
    descricao: 'Mensagem automática ao primeiro contacto de um número desconhecido.',
    campos: [
      { key: 'mensagem', label: 'Mensagem', type: 'textarea',
        default: 'Olá! 👋 Bem-vindo à nossa clínica.\nPara marcar uma consulta escreve *marcar*.' },
    ],
  },
};

export function WaAutomacaoCard({ automacao, onToggle, onSave }: WaAutomacaoCardProps) {
  const config = AUTOMACAO_CONFIG[automacao.tipo];
  const [form, setForm] = useState(automacao.configuracao);
  const [dirty, setDirty] = useState(false);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium">{config.titulo}</p>
            <p className="text-sm text-muted-foreground">{config.descricao}</p>
          </div>
          <Toggle
            checked={automacao.ativo}
            onChange={() => onToggle(automacao.id, !automacao.ativo)}
          />
        </div>

        {/* Campos de config — sempre visíveis se activo */}
        {automacao.ativo && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {config.campos.map(campo => (
              <div key={campo.key}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {campo.label}
                </label>
                {campo.type === 'textarea' ? (
                  <textarea
                    className={inputClass('mt-1 min-h-[80px]')}
                    value={(form[campo.key] as string) ?? campo.default}
                    onChange={e => { setForm(p => ({ ...p, [campo.key]: e.target.value })); setDirty(true); }}
                  />
                ) : (
                  <input
                    type={campo.type}
                    className={inputClass('mt-1')}
                    value={(form[campo.key] as string) ?? campo.default}
                    onChange={e => { setForm(p => ({ ...p, [campo.key]: e.target.value })); setDirty(true); }}
                  />
                )}
              </div>
            ))}
            {dirty && (
              <Button size="sm" onClick={() => { onSave(automacao.id, form); setDirty(false); }}>
                Guardar configuração
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Variáveis disponíveis nos templates de mensagem

Documentar no tooltip de cada campo `textarea`:

| Variável | Substituto |
|----------|-----------|
| `{nome}` | Nome do paciente |
| `{hora}` | Hora da consulta (ex: "14h30") |
| `{data}` | Data da consulta (ex: "Segunda, 14 Abril") |
| `{medico}` | Nome do médico (ex: "Dra. Ana Costa") |
| `{especialidade}` | Especialidade (ex: "Cardiologia") |
| `{clinica}` | Nome da clínica |
| `{inicio}` | Horário de início do bot |
| `{fim}` | Horário de fim do bot |
