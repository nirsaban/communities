import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, makeSuperAdmin, makeCommunity, authHeader } from '../helpers/factory';

describe('Super Admin routes', () => {
  describe('access control', () => {
    it('returns 401 without token', async () => {
      const app = await getApp();
      const res = await request(app).get('/api/v1/super/communities');
      expect(res.status).toBe(401);
    });

    it('returns 403 for a regular user', async () => {
      const app = await getApp();
      const { accessToken } = await makeUser();
      const res = await request(app).get('/api/v1/super/communities').set(authHeader(accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/super/communities', () => {
    it('creates a community + initial admin invitation', async () => {
      const app = await getApp();
      const { accessToken } = await makeSuperAdmin();
      const res = await request(app)
        .post('/api/v1/super/communities')
        .set(authHeader(accessToken))
        .send({
          name: 'Acme Community',
          description: 'Test',
          category: 'professional',
          privacy: 'invite_only',
          initialAdminEmail: 'first-admin@example.com',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.community.name).toBe('Acme Community');
      expect(res.body.data.invitation.email).toBe('first-admin@example.com');
      expect(res.body.data.invitation.role).toBe('admin');
      expect(res.body.data.invitation.token).toEqual(expect.any(String));
    });

    it('rejects invalid input', async () => {
      const app = await getApp();
      const { accessToken } = await makeSuperAdmin();
      const res = await request(app)
        .post('/api/v1/super/communities')
        .set(authHeader(accessToken))
        .send({ name: 'X' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET / suspend / restore / delete', () => {
    it('paginates, filters, and supports lifecycle actions', async () => {
      const app = await getApp();
      const { accessToken } = await makeSuperAdmin();

      const c1 = await makeCommunity({ name: 'Alpha' });
      const c2 = await makeCommunity({ name: 'Beta' });

      const list = await request(app)
        .get('/api/v1/super/communities?limit=10')
        .set(authHeader(accessToken));
      expect(list.status).toBe(200);
      expect(list.body.data.length).toBe(2);

      const suspend = await request(app)
        .post(`/api/v1/super/communities/${c1._id}/suspend`)
        .set(authHeader(accessToken));
      expect(suspend.status).toBe(200);
      expect(suspend.body.data.status).toBe('suspended');

      const restore = await request(app)
        .post(`/api/v1/super/communities/${c1._id}/restore`)
        .set(authHeader(accessToken));
      expect(restore.status).toBe(200);
      expect(restore.body.data.status).toBe('active');

      const del = await request(app)
        .delete(`/api/v1/super/communities/${c2._id}`)
        .set(authHeader(accessToken));
      expect(del.status).toBe(200);
      expect(del.body.data.status).toBe('deleted');

      const listAfter = await request(app)
        .get('/api/v1/super/communities?limit=10')
        .set(authHeader(accessToken));
      // soft-deleted communities filtered out by deletedAt:null filter
      expect(listAfter.body.data.length).toBe(1);
    });
  });
});
