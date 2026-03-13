import { PrismaClient } from '@prisma/client';

declare global {
   
  var __prisma: PrismaClient | undefined;
}

const logLevels: ('query' | 'info' | 'warn' | 'error')[] = 
  process.env.NODE_ENV === 'production' 
    ? ['warn', 'error'] 
    : ['query', 'info', 'warn', 'error'];

export const prisma = global.__prisma ?? new PrismaClient({
  log: logLevels,
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
