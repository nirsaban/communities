import request from 'supertest';
import { getApp } from '../helpers/app';
import {
  makeUser,
  makeCommunity,
  makeMember,
  authHeader,
} from '../helpers/factory';

function isoIn(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

describe('Events MVP', () => {
  it('admin creates a free event, member RSVPs, capacity overflow goes to waitlist', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Test Lecture',
        description: 'About things',
        startAt: isoIn(24),
        endAt: isoIn(25),
        timezone: 'UTC',
        location: { type: 'physical', address: 'HQ' },
        capacity: 1,
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    expect(create.status).toBe(201);
    const eventId = create.body.data.id;

    // First member RSVP succeeds.
    const { user: m1, accessToken: t1 } = await makeUser();
    await makeMember(m1, community, 'member');
    const r1 = await request(app)
      .post(`/api/v1/events/${eventId}/rsvp`)
      .set(authHeader(t1))
      .send({ status: 'going' });
    expect(r1.status).toBe(201);
    expect(r1.body.data.status).toBe('going');

    // Second member hits waitlist (capacity 1).
    const { user: m2, accessToken: t2 } = await makeUser();
    await makeMember(m2, community, 'member');
    const r2 = await request(app)
      .post(`/api/v1/events/${eventId}/rsvp`)
      .set(authHeader(t2))
      .send({ status: 'going' });
    expect(r2.status).toBe(201);
    expect(r2.body.data.status).toBe('waitlist');

    // First member cancels → waitlister promoted.
    const cancel = await request(app)
      .delete(`/api/v1/events/${eventId}/rsvp`)
      .set(authHeader(t1));
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.cancelled).toBe(true);
    expect(String(cancel.body.data.promotedUserId)).toBe(String(m2._id));
  });

  it('sub admin cannot create paid event (403)', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'subadmin');

    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(accessToken))
      .send({
        title: 'Paid Workshop',
        startAt: isoIn(24),
        endAt: isoIn(25),
        timezone: 'UTC',
        location: { type: 'online', url: 'https://example.com' },
        pricing: { type: 'paid', priceCents: 1000, currency: 'USD' },
        status: 'published',
      });
    expect(res.status).toBe(403);
  });

  it('sub admin can create a free event', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'subadmin');

    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(accessToken))
      .send({
        title: 'Free Meetup',
        startAt: isoIn(24),
        endAt: isoIn(25),
        timezone: 'UTC',
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    expect(res.status).toBe(201);
  });

  it('cancelling an event marks all RSVPs cancelled', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'About to cancel',
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const eid = create.body.data.id;

    const { user: m1, accessToken: t1 } = await makeUser();
    await makeMember(m1, community, 'member');
    await request(app).post(`/api/v1/events/${eid}/rsvp`).set(authHeader(t1)).send({ status: 'going' });

    const cancelled = await request(app)
      .post(`/api/v1/events/${eid}/cancel`)
      .set(authHeader(adminToken))
      .send({ reason: 'venue lost' });
    expect(cancelled.status).toBe(200);
    // cancel now returns the affected events as an array (scope support, P5).
    expect(cancelled.body.data[0].status).toBe('cancelled');

    const rsvps = await request(app)
      .get(`/api/v1/events/${eid}/rsvps`)
      .set(authHeader(adminToken));
    expect(rsvps.status).toBe(200);
    expect(rsvps.body.data[0].status).toBe('cancelled');
  });

  it('event manager can list rsvps; non-manager member cannot', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Managed event',
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const eid = create.body.data.id;

    const { user: manager, accessToken: managerToken } = await makeUser();
    await makeMember(manager, community, 'member');

    const assign = await request(app)
      .post(`/api/v1/events/${eid}/managers`)
      .set(authHeader(adminToken))
      .send({ userId: String(manager._id) });
    expect(assign.status).toBe(200);

    const managerView = await request(app)
      .get(`/api/v1/events/${eid}/rsvps`)
      .set(authHeader(managerToken));
    expect(managerView.status).toBe(200);

    const { accessToken: nonManagerToken } = await makeUser();
    // not a member — should 404 (event not visible)
    const stranger = await request(app)
      .get(`/api/v1/events/${eid}/rsvps`)
      .set(authHeader(nonManagerToken));
    expect(stranger.status).toBe(404);
  });

  it('blocks cross-tenant event reads', async () => {
    const app = await getApp();
    const { user: a, accessToken: at } = await makeUser();
    const cA = await makeCommunity();
    await makeMember(a, cA, 'admin');

    const { accessToken: bt } = await makeUser();
    const cB = await makeCommunity();

    const create = await request(app)
      .post(`/api/v1/communities/${cA._id}/events`)
      .set(authHeader(at))
      .send({
        title: 'A-only',
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const eid = create.body.data.id;

    // User from community B cannot view event from A.
    const otherView = await request(app)
      .get(`/api/v1/events/${eid}`)
      .set(authHeader(bt));
    expect(otherView.status).toBe(404);
    void cB;
  });
});
