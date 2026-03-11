import request from 'supertest';
import { app } from '../../server';

export function createTestApp() {
  return request(app);
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
