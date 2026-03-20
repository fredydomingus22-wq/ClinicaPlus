import { redis } from './redis';

/**
 * Publish an event to the Redis Pub/Sub channel 'cp:eventos'.
 * This will be picked up by the Socket.io server and broadcast to the relevant room.
 * 
 * @param room The room to broadcast the event to (e.g., 'clinica:123', 'user:456')
 * @param event The name of the event (e.g., 'agendamento:criado')
 * @param data The payload of the event
 */
export async function publishEvent(room: string, event: string, data: unknown): Promise<void> {
  // Publicar APENAS depois do commit no DB ter sido confirmado
  await redis.publish('cp:eventos', JSON.stringify({ room, event, data }));
}

// Eventos definidos (from @clinicaplus/events):
// 'agendamento:criado'   { agendamentoId, dataHora, pacienteNome }
// 'agendamento:estado'   { agendamentoId, novoEstado, anteriorEstado }
// 'agendamento:triagem'  { agendamentoId }
// 'fatura:emitida'       { faturaId, pacienteId, total }
// 'notificacao'          { tipo, mensagem, link? }
