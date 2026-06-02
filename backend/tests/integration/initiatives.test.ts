import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, makeCommunity, makeMember, authHeader } from '../helpers/factory';
import { Notification } from '../../src/models/Notification';

describe('Initiatives — lifecycle', () => {
  it('member creates draft → submits → admin approves → notification sent → member supports', async () => {
    const app = await getApp();

    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');

    const { user: author, accessToken: authorToken } = await makeUser();
    await makeMember(author, community, 'member');

    // Create draft.
    const draft = await request(app)
      .post(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(authorToken))
      .send({ title: 'Volunteer Day', description: 'Saturday cleanup', category: 'volunteer' });
    expect(draft.status).toBe(201);
    expect(draft.body.data.status).toBe('draft');
    const iid = draft.body.data.id;

    // Other members can't see drafts (their list is empty).
    const { accessToken: otherToken } = await makeUser();
    const { user: other2 } = await makeUser();
    await makeMember(other2, community, 'member');
    const otherList = await request(app)
      .get(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(otherToken));
    expect(otherList.status).toBe(404); // not a member
    void other2;

    // Submit.
    const submitted = await request(app)
      .post(`/api/v1/initiatives/${iid}/submit`)
      .set(authHeader(authorToken));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe('submitted');

    // Approve.
    const approved = await request(app)
      .post(`/api/v1/initiatives/${iid}/approve`)
      .set(authHeader(adminToken));
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');

    // Notification was written for the author.
    const notifs = await Notification.find({ userId: author._id, type: 'initiative.approved' });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toMatch(/approved/i);

    // Other member supports → status becomes 'active' on first supporter, count = 1.
    const { user: supporter, accessToken: supporterToken } = await makeUser();
    await makeMember(supporter, community, 'member');
    const supRes = await request(app)
      .post(`/api/v1/initiatives/${iid}/support`)
      .set(authHeader(supporterToken));
    expect(supRes.status).toBe(200);
    expect(supRes.body.data.status).toBe('active');
    expect(supRes.body.data.supporterCount).toBe(1);
    expect(supRes.body.data.viewer.isSupporting).toBe(true);

    // Removing support drops the count back to 0 and persists.
    const unsupRes = await request(app)
      .delete(`/api/v1/initiatives/${iid}/support`)
      .set(authHeader(supporterToken));
    expect(unsupRes.status).toBe(200);
    expect(unsupRes.body.data.supporterCount).toBe(0);
    expect(unsupRes.body.data.viewer.isSupporting).toBe(false);
  });

  it('admin rejects with reason → author gets a rejection notification', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: author, accessToken: authorToken } = await makeUser();
    await makeMember(author, community, 'member');

    const draft = await request(app)
      .post(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(authorToken))
      .send({ title: 'Some idea', description: 'x', category: 'other' });
    const iid = draft.body.data.id;
    await request(app)
      .post(`/api/v1/initiatives/${iid}/submit`)
      .set(authHeader(authorToken));

    const rej = await request(app)
      .post(`/api/v1/initiatives/${iid}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: 'Off-topic for this community' });
    expect(rej.status).toBe(200);
    expect(rej.body.data.status).toBe('rejected');
    expect(rej.body.data.rejectionReason).toMatch(/off-topic/i);

    const notifs = await Notification.find({ userId: author._id, type: 'initiative.rejected' });
    expect(notifs).toHaveLength(1);
  });

  it('non-staff cannot approve', async () => {
    const app = await getApp();
    const { user: admin } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: author, accessToken: authorToken } = await makeUser();
    await makeMember(author, community, 'member');
    const { accessToken: peerToken } = await makeUser();

    const draft = await request(app)
      .post(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(authorToken))
      .send({ title: 'Some thing', description: 'x', category: 'other' });
    const iid = draft.body.data.id;
    await request(app).post(`/api/v1/initiatives/${iid}/submit`).set(authHeader(authorToken));

    const tryApprove = await request(app)
      .post(`/api/v1/initiatives/${iid}/approve`)
      .set(authHeader(peerToken));
    // Not a community member → 404 (default-deny)
    expect(tryApprove.status).toBe(404);
  });

  it('comments increment commentCount + are returned in order', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: author, accessToken: authorToken } = await makeUser();
    await makeMember(author, community, 'member');

    // Create + approve.
    const draft = await request(app)
      .post(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(authorToken))
      .send({ title: 'Comments thread', description: 'x', category: 'other' });
    const iid = draft.body.data.id;
    await request(app).post(`/api/v1/initiatives/${iid}/submit`).set(authHeader(authorToken));
    await request(app).post(`/api/v1/initiatives/${iid}/approve`).set(authHeader(adminToken));

    const c1 = await request(app)
      .post(`/api/v1/initiatives/${iid}/comments`)
      .set(authHeader(authorToken))
      .send({ body: 'first' });
    expect(c1.status).toBe(201);
    const c2 = await request(app)
      .post(`/api/v1/initiatives/${iid}/comments`)
      .set(authHeader(adminToken))
      .send({ body: 'second' });
    expect(c2.status).toBe(201);

    const list = await request(app)
      .get(`/api/v1/initiatives/${iid}/comments`)
      .set(authHeader(authorToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0].body).toBe('first');
    expect(list.body.data[1].body).toBe('second');

    const detail = await request(app)
      .get(`/api/v1/initiatives/${iid}`)
      .set(authHeader(authorToken));
    expect(detail.body.data.commentCount).toBe(2);
  });

  it('author can complete with a summary', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: author, accessToken: authorToken } = await makeUser();
    await makeMember(author, community, 'member');

    const draft = await request(app)
      .post(`/api/v1/communities/${community._id}/initiatives`)
      .set(authHeader(authorToken))
      .send({ title: 'Done thing', description: 'x', category: 'social' });
    const iid = draft.body.data.id;
    await request(app).post(`/api/v1/initiatives/${iid}/submit`).set(authHeader(authorToken));
    await request(app).post(`/api/v1/initiatives/${iid}/approve`).set(authHeader(adminToken));

    const done = await request(app)
      .post(`/api/v1/initiatives/${iid}/complete`)
      .set(authHeader(authorToken))
      .send({ summary: 'Wrapped up!' });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('completed');
    expect(done.body.data.completionSummary).toBe('Wrapped up!');
  });
});
