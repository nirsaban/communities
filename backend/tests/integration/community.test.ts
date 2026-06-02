import request from 'supertest';
import { getApp } from '../helpers/app';
import {
  makeUser,
  makeSuperAdmin,
  makeCommunity,
  makeMember,
  authHeader,
} from '../helpers/factory';

describe('Community routes — isolation and roles', () => {
  it('blocks cross-tenant reads (user in A cannot read B)', async () => {
    const app = await getApp();
    const { user: u1, accessToken: t1 } = await makeUser();
    const c1 = await makeCommunity();
    const c2 = await makeCommunity();
    await makeMember(u1, c1, 'admin');

    const ownRes = await request(app)
      .get(`/api/v1/communities/${c1._id}`)
      .set(authHeader(t1));
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app)
      .get(`/api/v1/communities/${c2._id}`)
      .set(authHeader(t1));
    expect(otherRes.status).toBe(404); // intentionally not 403 (existence not leaked)
  });

  it('super admin bypasses membership checks', async () => {
    const app = await getApp();
    const { accessToken } = await makeSuperAdmin();
    const c = await makeCommunity();
    const res = await request(app)
      .get(`/api/v1/communities/${c._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
  });

  it('non-admin member cannot PATCH community settings', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const c = await makeCommunity();
    await makeMember(user, c, 'member');
    const res = await request(app)
      .patch(`/api/v1/communities/${c._id}`)
      .set(authHeader(accessToken))
      .send({ description: 'changed' });
    expect(res.status).toBe(403);
  });

  it('admin can PATCH community and invite members', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const c = await makeCommunity();
    await makeMember(user, c, 'admin');
    const patch = await request(app)
      .patch(`/api/v1/communities/${c._id}`)
      .set(authHeader(accessToken))
      .send({ description: 'updated' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.description).toBe('updated');

    const invite = await request(app)
      .post(`/api/v1/communities/${c._id}/members/invite`)
      .set(authHeader(accessToken))
      .send({ email: 'invitee@example.com', role: 'member' });
    expect(invite.status).toBe(201);
    expect(invite.body.data.token).toEqual(expect.any(String));
  });

  it('sub-admin cannot invite at admin or subadmin level', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const c = await makeCommunity();
    await makeMember(user, c, 'subadmin');
    const res = await request(app)
      .post(`/api/v1/communities/${c._id}/members/invite`)
      .set(authHeader(accessToken))
      .send({ email: 'x@example.com', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('accepts an invitation with inline signup', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const c = await makeCommunity();
    await makeMember(admin, c, 'admin');

    const invite = await request(app)
      .post(`/api/v1/communities/${c._id}/members/invite`)
      .set(authHeader(adminToken))
      .send({ email: 'newjoiner@example.com', role: 'member' });
    expect(invite.status).toBe(201);
    const token = invite.body.data.token;

    const accept = await request(app)
      .post(`/api/v1/invitations/${token}/accept`)
      .send({ password: 'JoinMe123!', name: 'Joiner' });
    expect(accept.status).toBe(200);
    expect(accept.body.data.createdAccount).toBe(true);
    expect(accept.body.data.membership.role).toBe('member');
    expect(accept.body.data.user.email).toBe('newjoiner@example.com');
  });
});
