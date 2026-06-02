import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, makeCommunity, makeMember, authHeader } from '../helpers/factory';

describe('Posts (community discussions)', () => {
  it('member posts a discussion; admin can pin; locked posts reject comments', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    // Member creates a discussion post.
    const created = await request(app)
      .post(`/api/v1/communities/${community._id}/posts`)
      .set(authHeader(memberToken))
      .send({ type: 'discussion', body: 'Anyone up for a hike?' });
    expect(created.status).toBe(201);
    const pid = created.body.data.id;

    // Comment from another member.
    const { user: other, accessToken: otherToken } = await makeUser();
    await makeMember(other, community, 'member');
    const c1 = await request(app)
      .post(`/api/v1/posts/${pid}/comments`)
      .set(authHeader(otherToken))
      .send({ body: 'count me in' });
    expect(c1.status).toBe(201);

    const detail = await request(app)
      .get(`/api/v1/posts/${pid}`)
      .set(authHeader(memberToken));
    expect(detail.body.data.commentCount).toBe(1);
    expect(detail.body.data.isPinned).toBe(false);

    // Admin pins.
    const pinned = await request(app)
      .post(`/api/v1/posts/${pid}/pin`)
      .set(authHeader(adminToken));
    expect(pinned.status).toBe(200);
    expect(pinned.body.data.isPinned).toBe(true);

    // Member cannot pin.
    const tryPin = await request(app)
      .post(`/api/v1/posts/${pid}/pin`)
      .set(authHeader(memberToken));
    expect(tryPin.status).toBe(403);

    // Lock + comment rejected.
    const lock = await request(app)
      .patch(`/api/v1/posts/${pid}`)
      .set(authHeader(adminToken))
      .send({ isLocked: true });
    expect(lock.status).toBe(200);
    expect(lock.body.data.isLocked).toBe(true);
    const tryComment = await request(app)
      .post(`/api/v1/posts/${pid}/comments`)
      .set(authHeader(otherToken))
      .send({ body: 'late reply' });
    expect(tryComment.status).toBe(400);
  });

  it('non-staff cannot publish an announcement', async () => {
    const app = await getApp();
    const { user: member, accessToken: memberToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(member, community, 'member');
    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/posts`)
      .set(authHeader(memberToken))
      .send({ type: 'announcement', title: 'Important!', body: 'hi' });
    expect(res.status).toBe(403);
  });

  it('list returns pinned posts first', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const p1 = await request(app)
      .post(`/api/v1/communities/${community._id}/posts`)
      .set(authHeader(adminToken))
      .send({ type: 'discussion', body: 'old' });
    const p2 = await request(app)
      .post(`/api/v1/communities/${community._id}/posts`)
      .set(authHeader(adminToken))
      .send({ type: 'discussion', body: 'new' });
    await request(app)
      .post(`/api/v1/posts/${p1.body.data.id}/pin`)
      .set(authHeader(adminToken));

    const list = await request(app)
      .get(`/api/v1/communities/${community._id}/posts`)
      .set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data[0].id).toBe(p1.body.data.id);
    expect(list.body.data[0].isPinned).toBe(true);
    expect(list.body.data[1].id).toBe(p2.body.data.id);
  });
});
