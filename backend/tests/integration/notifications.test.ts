import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, authHeader } from '../helpers/factory';
import { Notification } from '../../src/models/Notification';

describe('GET /api/v1/me/notifications', () => {
  it('returns notifications addressed to the caller only', async () => {
    const app = await getApp();
    const { user: alice, accessToken: aliceToken } = await makeUser();
    const { user: bob } = await makeUser();

    await Notification.create({
      userId: alice._id,
      type: 'initiative.approved',
      title: 'Yours was approved',
    });
    await Notification.create({
      userId: bob._id,
      type: 'initiative.approved',
      title: "Bob's was approved",
    });

    const res = await request(app).get('/api/v1/me/notifications').set(authHeader(aliceToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toMatch(/yours/i);
  });

  it('PATCH /:nid/read marks the notification read', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const n = await Notification.create({
      userId: user._id,
      type: 'community.role_changed',
      title: 'Role updated',
    });
    const res = await request(app)
      .patch(`/api/v1/me/notifications/${n._id}/read`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.readAt).toBeTruthy();
    // Idempotent: a second call returns 404 because we filter for unread only.
    const second = await request(app)
      .patch(`/api/v1/me/notifications/${n._id}/read`)
      .set(authHeader(accessToken));
    expect(second.status).toBe(404);
  });

  it('cannot mark another user notification as read', async () => {
    const app = await getApp();
    const { user: alice } = await makeUser();
    const { accessToken: bobToken } = await makeUser();
    const n = await Notification.create({
      userId: alice._id,
      type: 'community.welcome',
      title: 'Welcome',
    });
    const res = await request(app)
      .patch(`/api/v1/me/notifications/${n._id}/read`)
      .set(authHeader(bobToken));
    expect(res.status).toBe(404);
  });
});
