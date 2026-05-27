"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const eventBus_1 = require("../../lib/eventBus");
const redis_1 = require("../../lib/redis");
// Mock the redis client
vitest_1.vi.mock('../../lib/redis', () => ({
    redis: {
        publish: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('eventBus', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('publishEvent', () => {
        (0, vitest_1.it)('should publish a JSON event to the cp:eventos channel', async () => {
            const room = 'clinica:123';
            const event = 'agendamento:criado';
            const data = { id: 'agg_456', status: 'CONFIRMADO' };
            await (0, eventBus_1.publishEvent)(room, event, data);
            (0, vitest_1.expect)(redis_1.redis.publish).toHaveBeenCalledWith('cp:eventos', JSON.stringify({ room, event, data }));
        });
        (0, vitest_1.it)('should handle complex data objects', async () => {
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
            await (0, eventBus_1.publishEvent)(room, event, data);
            (0, vitest_1.expect)(redis_1.redis.publish).toHaveBeenCalledWith('cp:eventos', JSON.stringify({ room, event, data }));
        });
    });
});
