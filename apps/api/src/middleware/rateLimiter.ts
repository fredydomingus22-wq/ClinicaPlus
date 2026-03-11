import rateLimit from 'express-rate-limit';

// Global: 100 req/min per IP
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Demasiados pedidos. Tente novamente mais tarde.',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth: 10 req/min per IP (login, refresh, forgot/reset password)
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Demasiadas tentativas de autenticação. Tente novamente em 1 minuto.',
      code: 'AUTH_RATE_LIMIT',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking: 5 req/hour per userId or IP (prevent spamming appointments)
export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  // Keyed by userId when authenticated, IP otherwise.
  // Disable the IPv6 helper check — userId takes priority in auth'd requests
  // and in dev/prod behind a proxy req.ip is deterministic.
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
  message: {
    success: false,
    error: {
      message: 'Limite de agendamentos atingido. Tente novamente mais tarde.',
      code: 'BOOKING_RATE_LIMIT',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
