import request from 'supertest';
import { app } from '../../server';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createTestApp() {
  return request(app);
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
