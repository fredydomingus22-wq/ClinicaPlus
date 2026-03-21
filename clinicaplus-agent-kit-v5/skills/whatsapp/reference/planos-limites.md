# Reference — Limites, Planos e Enforcement WhatsApp

## Tabela definitiva de limites

| Recurso | BASICO | PRO | ENTERPRISE |
|---------|--------|-----|------------|
| Instâncias WhatsApp (números) | 0 | 1 | ilimitado |
| Automação: Marcação de consultas | ❌ | ✅ | ✅ |
| Automação: Lembrete 24h | ❌ | ✅ | ✅ |
| Automação: Lembrete 2h | ❌ | ✅ | ✅ |
| Automação: Confirmação/Cancelamento | ❌ | ✅ | ✅ |
| Automação: Boas-vindas | ❌ | ✅ | ✅ |
| Histórico de conversas | ❌ | 7 dias | 90 dias |
| Feed de actividade | ❌ | últimas 20 | ilimitado |
| Badge "WA" na agenda | ❌ | ✅ | ✅ |
| Filtro por canal nos relatórios | ❌ | ✅ | ✅ |

## Enforcement no backend — mapa completo

```typescript
// routes/whatsapp.ts — every route must have these guards

// POST /api/whatsapp/instancias — criar instância
router.post('/instancias',
  authenticate,
  requirePlan('PRO'),                          // ← BASICO: 402
  requirePermission('whatsapp', 'manage'),     // ← não-ADMIN: 403
  async (req, res) => {
    // Verificação adicional no service: PRO máx 1 instância
    const contagem = await prisma.waInstancia.count({ where: { clinicaId } });
    if (clinica.plano === 'PRO' && contagem >= 1) {
      throw new AppError('Plano PRO permite 1 número WhatsApp. Upgrade para Enterprise.', 402, 'WA_LIMIT_REACHED');
    }
    // ENTERPRISE: sem verificação de contagem
  }
);

// GET /api/whatsapp/instancias/estado
router.get('/instancias/estado',
  authenticate,
  requirePlan('PRO'),     // ← retorna 402 para BASICO
  obterEstadoInstancia    // ← sem verificação extra
);

// DELETE /api/whatsapp/instancias
router.delete('/instancias',
  authenticate,
  requirePlan('PRO'),
  requirePermission('whatsapp', 'manage'),
  desligarInstancia
);

// POST /api/whatsapp/automacoes/:id/activar
router.post('/automacoes/:id/activar',
  authenticate,
  requirePlan('PRO'),
  requirePermission('whatsapp', 'manage'),
  activarAutomacao   // ← service verifica instância CONECTADA internamente
);
```

## Enforcement no frontend — PlanGate hierarchy

```tsx
// WhatsappPage.tsx — estrutura de PlanGate

export function WhatsappPage() {
  return (
    <PlanGate
      planoMinimo="PRO"
      fallback={<WaUpgradeBanner />}  // ← BASICO vê este componente
    >
      {/* PRO e ENTERPRISE chegam aqui */}
      <WaConexaoCard />
      <WaAutomacoesSection />  {/* só activa se CONECTADO */}
      <WaActividadeRecente />
    </PlanGate>
  );
}

// WaUpgradeBanner — o que BASICO vê
function WaUpgradeBanner() {
  return (
    <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center">
      <span className="text-4xl">💬</span>
      <h3 className="mt-3 text-lg font-semibold text-blue-900">
        Automações WhatsApp — Plano PRO
      </h3>
      <p className="mt-2 text-sm text-blue-700 max-w-md mx-auto">
        Liga o WhatsApp da tua clínica e permite que pacientes marquem consultas,
        recebam lembretes e confirmem pelo telemóvel — sem intervenção da recepcionista.
      </p>
      <ul className="mt-4 text-sm text-blue-700 space-y-1.5 text-left max-w-xs mx-auto">
        {[
          'Marcações automáticas 24/7',
          'Lembretes antes das consultas',
          'Confirmação por resposta (SIM/NÃO)',
          'Mensagem de boas-vindas automática',
        ].map(f => (
          <li key={f} className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button className="mt-6" onClick={() => navigate('/configuracoes/subscricao')}>
        Ver planos e fazer upgrade
      </Button>
    </div>
  );
}
```

## Limites de sessão WhatsApp (Baileys) — comportamento esperado

| Situação | O que acontece | Acção do sistema |
|----------|----------------|-----------------|
| Sessão activa (normal) | Bot responde normalmente | — |
| Telemóvel sem internet > 2h | Sessão pode perder-se temporariamente | Evolution API tenta reconectar |
| Telemóvel desligado > 24h | Sessão encerra | Webhook CONNECTION_UPDATE close → estado DESCONECTADO |
| Sessão sem actividade ~14 dias | Expiração natural | Idem |
| Número banido pela Meta | Sessão terminada permanentemente | Estado ERRO, admin deve criar novo número |
| Meta actualiza protocolo | Baileys pode parar de funcionar | Upstash critico — aguardar update da Evolution API |

## Notificações ao admin quando sessão encerra

```typescript
// apps/worker/src/jobs/wa-notificar-desconexao.ts
// Chamado por waInstanciaService.processarConexao() quando state = 'close'

export async function notificarDesconexaoWhatsApp(clinicaId: string) {
  const admin = await prisma.utilizador.findFirst({
    where: { clinicaId, papel: 'ADMIN' },
    select: { email: true, nome: true },
  });
  if (!admin?.email) return;

  // Email via Resend
  await emailService.enviar({
    para: admin.email,
    assunto: 'WhatsApp da tua clínica desconectou',
    html: `
      <p>Olá ${admin.nome},</p>
      <p>O número WhatsApp da tua clínica foi desconectado.</p>
      <p>As automações estão pausadas até reconectares.</p>
      <p><a href="${config.APP_URL}/configuracoes/whatsapp">Clica aqui para reconectar</a></p>
    `,
  });

  // Push notification (se PWA configurada)
  await publishEvent(`clinica:${clinicaId}`, 'notification', {
    titulo:   '⚠ WhatsApp desconectado',
    corpo:    'As automações estão pausadas. Clica para reconectar.',
    url:      '/configuracoes/whatsapp',
    urgencia: 'alta',
  });
}
```

## Estados e transições — implementação do reducer (frontend)

```typescript
// apps/web/src/stores/whatsapp.store.ts
// Estado local derivado dos dados da API + WebSocket

type WaEstadoUI =
  | { tipo: 'SEM_PLANO' }
  | { tipo: 'DESCONECTADO' }
  | { tipo: 'AGUARDA_QR'; qrCode: string; expiresAt: string }
  | { tipo: 'CONECTADO'; numero: string; desde: string; stats: WaStats }
  | { tipo: 'ERRO'; mensagem: string }
  | { tipo: 'CARREGANDO' };

// Derivar estado UI a partir dos dados da API
export function deriveWaEstadoUI(
  plano: string,
  instancia: WaInstancia | null,
): WaEstadoUI {
  if (plano === 'BASICO') return { tipo: 'SEM_PLANO' };
  if (!instancia)         return { tipo: 'DESCONECTADO' };

  switch (instancia.estado) {
    case 'DESCONECTADO': return { tipo: 'DESCONECTADO' };
    case 'AGUARDA_QR':   return { tipo: 'AGUARDA_QR', qrCode: instancia.qrCodeBase64!, expiresAt: instancia.qrExpiresAt! };
    case 'CONECTADO':    return { tipo: 'CONECTADO', numero: instancia.numeroTelefone!, desde: instancia.actualizadoEm, stats: instancia.stats };
    case 'ERRO':         return { tipo: 'ERRO', mensagem: 'Erro de conexão. Tenta reconectar.' };
  }
}
```
