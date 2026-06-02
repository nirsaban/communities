import request from 'supertest';
import { getApp } from '../helpers/app';

describe('GET /api/v1/health', () => {
  it('returns ok with db status and uptime', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.version).toBe('string');
  });
});
