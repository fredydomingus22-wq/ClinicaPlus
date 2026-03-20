# Sprint 2 — Real-Time (Socket.io)

**Skill:** `SKILL-websocket.md`
**Risco:** Zero — WS é adicional. REST continua igual.

---

## Prompt 2.1 — Socket.io Backend

```
Lê SKILL-websocket.md na íntegra.
Lê docs/BACKEND_v2.md (secções 4, 5).

1. Instala em apps/api: socket.io @socket.io/redis-adapter

2. Cria apps/api/src/lib/socket.ts:
   - setupSocket(httpServer): configura Socket.io no path /ws
   - io.use: verificar JWT no handshake (auth.token) — AppError se inválido
   - io.on('connection'): join rooms clinica:X, user:Y, medico:Y (se papel MEDICO), paciente:Y (se PACIENTE)
   - emitir 'auth:expired' se JWT expirar durante sessão
   - redisSub.subscribe('cp:eventos') → io.to(room).emit(event, data)

3. Cria apps/api/src/lib/eventBus.ts:
   export async function publishEvent(room, event, data):
     await redis.publish('cp:eventos', JSON.stringify({ room, event, data }))

4. Actualiza apps/api/src/server.ts:
   - Substituir app.listen por:
     const httpServer = createServer(app);
     setupSocket(httpServer);
     httpServer.listen(config.PORT, ...);

5. Adiciona publishEvent() em agendamentosService:
   - create():        publishEvent(`clinica:${clinicaId}`, 'agendamento:criado', {...})
   - updateEstado():  publishEvent(`clinica:${clinicaId}`, 'agendamento:estado', {...})
   - updateTriagem(): publishEvent(`clinica:${clinicaId}`, 'agendamento:triagem', {...})
   Sempre DEPOIS do prisma confirmar. Envolver em try/catch (falha no pub/sub não deve reverter mutação).

6. Escreve teste unitário para publishEvent() com redis mockado

7. Corre: pnpm build --filter=api && pnpm test --run --filter=api

Testa manualmente:
   pnpm dev --filter=api
   wscat -c "ws://localhost:3001/ws" --header "Authorization: Bearer <token>"
   → deve conectar; mudar estado de agendamento via PATCH → deve receber evento WS
```

---

## Prompt 2.2 — Socket.io Frontend + Badge

```
Lê SKILL-websocket.md.
Lê docs/FRONTEND_v2.md (secções 2, 3, 4, 5).

1. Instala em apps/web: socket.io-client

2. Cria apps/web/src/hooks/useSocket.ts (singleton pattern — ver FRONTEND_v2.md secção 2)
   - Conecta quando accessToken existe
   - Desconecta ao fazer logout
   - Emite 'auth:expired' → reconecta após silent refresh

3. Cria apps/web/src/hooks/useSocketEvent.ts — hook genérico para subscrever eventos

4. Cria apps/web/src/hooks/useAgendamentosRealtime.ts:
   - useSocketEvent('agendamento:criado', () => qc.invalidateQueries(agendamentosKeys.hoje()))
   - useSocketEvent('agendamento:estado', () => qc.invalidateQueries(agendamentosKeys.lists()))
   - useSocketEvent('agendamento:triagem', () => qc.invalidateQueries(agendamentosKeys.hoje()))

5. Cria apps/web/src/components/RealtimeBadge.tsx (ver FRONTEND_v2.md secção 4)
   - Ponto verde quando connected, cinzento quando não
   - Texto "Tempo real" / "A reconectar..."

6. Actualiza HojePage.tsx:
   - Adicionar useAgendamentosRealtime() (uma linha)
   - Adicionar <RealtimeBadge /> no header
   - Remover refetchInterval se existia

7. Em App.tsx ou no provider principal:
   - socket.on('connect', () => queryClient.invalidateQueries())

8. Corre: pnpm build --filter=web && pnpm typecheck --filter=web

Testa com dois browsers:
   Browser 1: recepcionista → HojePage → badge verde "Tempo real"
   Browser 2: médico → confirmar agendamento
   → Browser 1 actualiza em < 2s sem refresh

Checkpoint Sprint 2:
   - [ ] Badge verde quando WS conectado, cinzento quando não
   - [ ] Actualização de estado em < 2s em outro browser
   - [ ] Reconexão automática após 10s offline
   - [ ] pnpm typecheck zero erros
```
