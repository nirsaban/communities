import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, authHeader } from '../helpers/factory';

describe('Auth endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('creates a user and returns tokens', async () => {
      const app = await getApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'new@example.com',
        password: 'Password1!',
        name: 'New User',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('new@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
    });

    it('rejects weak passwords', async () => {
      const app = await getApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'weak@example.com',
        password: 'short',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects duplicate email', async () => {
      const app = await getApp();
      await request(app).post('/api/v1/auth/register').send({
        email: 'dup@example.com',
        password: 'Password1!',
      });
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'dup@example.com',
        password: 'Password1!',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const app = await getApp();
      const { user, password } = await makeUser({ email: 'login@example.com' });
      const res = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    });

    it('rejects wrong password with 401', async () => {
      const app = await getApp();
      const { user } = await makeUser({ email: 'wrong@example.com' });
      const res = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'WrongPass1!',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unknown email with 401 (no enumeration)', async () => {
      const app = await getApp();
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nope@example.com',
        password: 'Password1!',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates the refresh token and invalidates the old one', async () => {
      const app = await getApp();
      await makeUser({ email: 'rotate@example.com', password: 'Password1!' });
      const login = await request(app).post('/api/v1/auth/login').send({
        email: 'rotate@example.com',
        password: 'Password1!',
      });
      const oldRefresh = login.body.data.tokens.refreshToken;

      const res1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
      expect(res1.status).toBe(200);
      const newRefresh = res1.body.data.tokens.refreshToken;
      expect(newRefresh).not.toBe(oldRefresh);

      // Reusing the OLD refresh token must fail.
      const res2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
      expect(res2.status).toBe(401);

      // After reuse-detection, the new token is also revoked.
      const res3 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: newRefresh });
      expect(res3.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token', async () => {
      const app = await getApp();
      await makeUser({ email: 'logout@example.com', password: 'Password1!' });
      const login = await request(app).post('/api/v1/auth/login').send({
        email: 'logout@example.com',
        password: 'Password1!',
      });
      const refresh = login.body.data.tokens.refreshToken;
      const out = await request(app).post('/api/v1/auth/logout').send({ refreshToken: refresh });
      expect(out.status).toBe(200);

      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refresh });
      expect(refreshAttempt.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without token', async () => {
      const app = await getApp();
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user with valid token', async () => {
      const app = await getApp();
      const { user, accessToken } = await makeUser({ email: 'me@example.com' });
      const res = await request(app).get('/api/v1/auth/me').set(authHeader(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(Array.isArray(res.body.data.memberships)).toBe(true);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('updates profile fields', async () => {
      const app = await getApp();
      const { accessToken } = await makeUser();
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set(authHeader(accessToken))
        .send({ name: 'Updated', bio: 'Hello', interests: ['coding'] });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated');
      expect(res.body.data.bio).toBe('Hello');
      expect(res.body.data.interests).toEqual(['coding']);
    });
  });

  describe('Password reset flow', () => {
    it('issues a reset token and completes reset', async () => {
      const app = await getApp();
      await makeUser({ email: 'reset@example.com', password: 'OldPass1!' });
      const forgot = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset@example.com' });
      expect(forgot.status).toBe(200);

      // Pull the token directly out of the DB for testing (the mail service is a stub).
      const { User } = await import('../../src/models/User');
      const u = await User.findOne({ email: 'reset@example.com' }).select(
        '+passwordResetTokenHash +passwordResetExpiresAt',
      );
      expect(u?.passwordResetTokenHash).toBeTruthy();

      // We can't recover the raw token from a hash, so simulate the reset request flow
      // by re-issuing a fresh token directly via the service.
      const { startPasswordReset } = await import('../../src/services/auth.service');
      // Spy on mail service to capture token from the dev message.
      const { getMailService, _resetMailService } = await import('../../src/services/mail.service');
      const captured: { raw?: string } = {};
      _resetMailService({
        async send(msg) {
          captured.raw = (msg.data as { resetToken?: string }).resetToken;
        },
      });
      await startPasswordReset({ email: 'reset@example.com' });
      expect(captured.raw).toBeTruthy();

      const reset = await request(app).post('/api/v1/auth/reset-password').send({
        token: captured.raw,
        newPassword: 'NewPass1!',
      });
      expect(reset.status).toBe(200);

      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'reset@example.com', password: 'NewPass1!' });
      expect(login.status).toBe(200);

      _resetMailService(null);
      void getMailService;
    });

    it('returns 200 on forgot-password for unknown email (no enumeration)', async () => {
      const app = await getApp();
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@example.com' });
      expect(res.status).toBe(200);
    });
  });
});
