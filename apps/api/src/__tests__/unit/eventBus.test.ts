import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishEvent } from '../../lib/eventBus';
import { redis } from '../../lib/redis';

// Mock the redis client
vi.mock('../../lib/redis', () => ({
  redis: {
    publish: vi.fn(),
  },
}));

describe('eventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishEvent', () => {
    it('should publish a JSON event to the cp:eventos channel', async () => {
      const room = 'clinica:123';
      const event = 'agendamento:criado';
      const data = { id: 'agg_456', status: 'CONFIRMADO' };

      await publishEvent(room, event, data);

      expect(redis.publish).toHaveBeenCalledWith(
        'cp:eventos',
        JSON.stringify({ room, event, data })
      );
    });

    it('should handle complex data objects', async () => {
      const room = 'user:789';
      const event = 'notificacao';
      const data = { 
        type: 'ALERTA', 
        message: 'Teste', 
        meta: { 
          foo: 'bar',
          nested: [1, 2, 3]
        } 
      };

      await publishEvent(room, event, data);

      expect(redis.publish).toHaveBeenCalledWith(
        'cp:eventos',
        JSON.stringify({ room, event, data })
      );
    });
  });
});
