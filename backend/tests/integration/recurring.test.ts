import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, makeCommunity, makeMember, authHeader } from '../helpers/factory';
import { EventModel } from '../../src/models/Event';
import { materializeAllRecurringParents } from '../../src/jobs/recurringEvents.job';

function isoIn(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

describe('Recurring events', () => {
  it('weekly count=4 produces 4 instances on create', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Weekly Meetup',
        type: 'recurring',
        recurrenceRule: { freq: 'weekly', interval: 1, endType: 'count', count: 4 },
        startAt: isoIn(24),
        endAt: isoIn(25),
        timezone: 'UTC',
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('recurring_parent');
    const parentId = res.body.data.id;
    const instances = await EventModel.find({ parentEventId: parentId });
    expect(instances.length).toBeGreaterThanOrEqual(3); // first occurrence is the seed; 3 more within horizon
    expect(instances.length).toBeLessThanOrEqual(4);
  });

  it('cron job is idempotent (re-running creates no duplicates)', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Daily Standup',
        type: 'recurring',
        recurrenceRule: { freq: 'daily', interval: 1, endType: 'count', count: 5 },
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const before = await EventModel.countDocuments({ type: 'recurring_instance' });
    const result = await materializeAllRecurringParents();
    expect(result.parentsScanned).toBe(1);
    expect(result.instancesCreated).toBe(0); // already materialized
    const after = await EventModel.countDocuments({ type: 'recurring_instance' });
    expect(after).toBe(before);
  });

  it('PATCH with scope=all updates parent + all materialized instances', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Series',
        type: 'recurring',
        recurrenceRule: { freq: 'weekly', interval: 1, endType: 'count', count: 3 },
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const parentId = create.body.data.id;

    const patch = await request(app)
      .patch(`/api/v1/events/${parentId}?scope=all`)
      .set(authHeader(adminToken))
      .send({ title: 'Series (renamed)' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.length).toBeGreaterThan(1);
    const titles = patch.body.data.map((e: { title: string }) => e.title);
    expect(titles.every((t: string) => t === 'Series (renamed)')).toBe(true);
  });

  it('POST /cancel with scope=all cancels every event in the series', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Doomed',
        type: 'recurring',
        recurrenceRule: { freq: 'weekly', interval: 1, endType: 'count', count: 3 },
        startAt: isoIn(24),
        endAt: isoIn(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const parentId = create.body.data.id;
    const cancel = await request(app)
      .post(`/api/v1/events/${parentId}/cancel?scope=all`)
      .set(authHeader(adminToken))
      .send({ reason: 'venue gone' });
    expect(cancel.status).toBe(200);
    const all = await EventModel.find({
      $or: [{ _id: parentId }, { parentEventId: parentId }],
    });
    expect(all.every((e) => e.status === 'cancelled')).toBe(true);
  });
});
