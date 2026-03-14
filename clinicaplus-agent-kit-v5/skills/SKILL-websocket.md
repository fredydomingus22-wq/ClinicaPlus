# SKILL: WebSocket (Socket.io)

Lê antes de qualquer tarefa com tempo real, eventos, rooms, ou Socket.io.

---

## Regra Fundamental

```
WebSocket = PUSH de eventos do servidor para o cliente.
NÃO usar para substituir REST — mutações continuam a ser POST/PATCH.

Fluxo correcto:
  PATCH /agendamentos/:id/estado → service.update() → prisma.update() → redis.publish()
                                                                      → Socket.io emite
```

## Publicar Evento

```typescript
// eventBus.ts — sempre chamar DEPOIS do commit no DB
import { redis } from './redis';

export async function publishEvent(room: string, event: string, data: unknown) {
  await redis.publish('cp:eventos', JSON.stringify({ room, event, data }));
}

// Uso:
await publishEvent(`clinica:${clinicaId}`, 'agendamento:estado', {
  agendamentoId: updated.id,
  novoEstado: updated.estado,
});
```

## Rooms

```
clinica:{clinicaId}   todos os staff da clínica
user:{userId}         eventos pessoais
medico:{userId}       se papel === MEDICO
paciente:{userId}     se papel === PACIENTE
```

## Checklist

- [ ] Socket.io inicializado no `httpServer` (não no `app` Express)
- [ ] JWT verificado no handshake (io.use middleware)
- [ ] `redisSub` é um cliente Redis separado (ioredis não permite outros comandos durante subscribe)
- [ ] Rooms por clinicaId — nunca broadcast global
- [ ] `queryClient.invalidateQueries()` no cliente após reconexão WS
- [ ] Badge "Tempo real" verde quando connected, cinzento quando não

---

