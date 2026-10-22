import { createHash, randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import sharp from 'sharp';
import {
  accountDetailSchema,
  accountListSchema,
  accountProfileSchema,
  accountSchema,
  createdInvitationSchema,
  invitationListSchema,
} from '@workspace/contracts/accounts';
import { AppModule } from '../src/app.module';
import applicationConfig, {
  type ApplicationConfig,
} from '../src/common/config/application.config';
import databaseConfig from '../src/common/config/database.config';
import { configureHttpApplication } from '../src/common/bootstrap/configure-http-application';
import { PrismaService } from '../src/common/database/prisma.service';
import { Argon2PasswordHasher } from '../src/modules/users/infrastructure/argon2-password-hasher';
import {
  createPostgreSqlTestSchema,
  type PostgreSqlTestSchema,
} from './support/postgresql-test-schema';

jest.setTimeout(45_000);
const config: ApplicationConfig = {
  environment: 'test',
  port: 3001,
  webOrigin: 'http://localhost:3000',
  sessionCookie: { name: 'assetnote_session', secure: false },
};
const PASSWORD = 'a long test passphrase';

describe('Account management (HTTP + PostgreSQL)', () => {
  let app: INestApplication<App>;
  let database: PostgreSqlTestSchema;
  let passwordHash: string;
  let superId: string;
  let adminId: string;
  let userId: string;
  let superCookie: string;
  let adminCookie: string;
  let userCookie: string;

  async function session(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await database.prisma.authSession.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return `assetnote_session=${token}`;
  }
  async function invite(
    email: string,
    role: 'ADMIN' | 'USER' = 'USER',
    cookie = superCookie,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Origin', config.webOrigin)
      .set('Cookie', cookie)
      .send({ email, role })
      .expect(201)
      .expect('Cache-Control', 'no-store');
    return createdInvitationSchema.parse(response.body);
  }
  function accept(token: string, nickname = '新用户') {
    return request(app.getHttpServer())
      .post('/api/invitations/accept')
      .set('Origin', config.webOrigin)
      .send({ token, nickname, password: PASSWORD });
  }
  function resolve(token: string) {
    return request(app.getHttpServer())
      .post('/api/invitations/resolve')
      .set('Origin', config.webOrigin)
      .send({ token });
  }

  beforeAll(async () => {
    database = await createPostgreSqlTestSchema();
    passwordHash = await new Argon2PasswordHasher().hash(PASSWORD);
  });
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(database.prisma)
      .overrideProvider(databaseConfig.KEY)
      .useValue({ url: 'postgresql://test:test@127.0.0.1:1/assetnote_test' })
      .overrideProvider(applicationConfig.KEY)
      .useValue(config)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app, config);
    await app.init();
    // This connection is confined to the randomly named disposable test schema.
    await database.prisma.userInvitation.deleteMany();
    await database.prisma.authSession.deleteMany();
    await database.prisma.user.deleteMany();
    const superUser = await database.prisma.user.create({
      data: {
        email: 'owner@example.test',
        nickname: '林然',
        passwordHash,
        role: 'SUPER_ADMIN',
      },
    });
    const admin = await database.prisma.user.create({
      data: {
        email: 'admin@example.test',
        nickname: '周晓',
        passwordHash,
        role: 'ADMIN',
      },
    });
    const user = await database.prisma.user.create({
      data: {
        email: 'user@example.test',
        nickname: '陈安',
        passwordHash,
        role: 'USER',
      },
    });
    superId = superUser.id;
    adminId = admin.id;
    userId = user.id;
    [superCookie, adminCookie, userCookie] = await Promise.all([
      session(superId),
      session(adminId),
      session(userId),
    ]);
  });
  afterEach(async () => {
    await app?.close();
  });
  afterAll(async () => {
    await database?.close();
  });

  it('requires authentication, runtime validation, manager access and exact-origin writes', async () => {
    await request(app.getHttpServer())
      .get('/api/account/profile')
      .expect(401)
      .expect('Cache-Control', 'no-store');
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Cookie', userCookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/users?page=501')
      .set('Cookie', superCookie)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/users/not-a-uuid')
      .set('Cookie', superCookie)
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', 'https://attacker.example')
      .send({ nickname: 'changed', version: 0 })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({ nickname: 'changed', version: 0, role: 'SUPER_ADMIN' })
      .expect(400);
    const response = await request(app.getHttpServer())
      .get('/api/account/profile')
      .set('Cookie', userCookie)
      .expect(200);
    expect(accountProfileSchema.parse(response.body)).toMatchObject({
      user: { id: userId, nickname: '陈安' },
      canManageUsers: false,
      inviteRoles: [],
    });
    expect(response.text).not.toContain('passwordHash');
    expect(response.text).not.toContain('tokenHash');
  });

  it('saves nickname and validated avatar, persists them, removes avatars and rejects stale writes', async () => {
    const bytes = await sharp({
      create: { width: 50, height: 80, channels: 3, background: '#b9ef46' },
    })
      .png()
      .toBuffer();
    const response = await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({
        nickname: '  新昵称  ',
        avatar: `data:image/png;base64,${bytes.toString('base64')}`,
        version: 0,
      })
      .expect(200);
    const saved = accountSchema.parse(response.body);
    expect(saved.nickname).toBe('新昵称');
    expect(saved.avatar).toMatch(/^data:image\/webp;base64,/);
    const persisted = await request(app.getHttpServer())
      .get('/api/account/profile')
      .set('Cookie', userCookie)
      .expect(200);
    expect(accountProfileSchema.parse(persisted.body).user.avatar).toBe(
      saved.avatar,
    );
    await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({ nickname: '过期内容', version: 0 })
      .expect(409);
    const removed = await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({ nickname: '新昵称', avatar: null, version: saved.version })
      .expect(200);
    expect(accountSchema.parse(removed.body).avatar).toBeNull();
    await request(app.getHttpServer())
      .patch('/api/account/profile')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({
        nickname: '新昵称',
        avatar: 'data:image/png;base64,aGVsbG8=',
        version: 2,
      })
      .expect(400);
  });

  it('filters users and limits results; protects super administrators, self and peer roles', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/users?search=%E9%99%88&role=USER&status=ACTIVE')
      .set('Cookie', superCookie)
      .expect(200);
    expect(
      accountListSchema.parse(list.body).users.map((user) => user.id),
    ).toEqual([userId]);
    for (const [actor, target, input] of [
      [superCookie, superId, { status: 'DISABLED', version: 0 }],
      [adminCookie, adminId, { role: 'USER', version: 0 }],
      [adminCookie, userId, { role: 'ADMIN', version: 0 }],
      [adminCookie, superId, { status: 'DISABLED', version: 0 }],
      [userCookie, adminId, { status: 'DISABLED', version: 0 }],
    ] as const)
      await request(app.getHttpServer())
        .patch(`/api/users/${target}/access`)
        .set('Cookie', actor)
        .set('Origin', config.webOrigin)
        .send(input)
        .expect(403);
    await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Cookie', adminCookie)
      .set('Origin', config.webOrigin)
      .send({ email: 'other@example.test', role: 'ADMIN' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Cookie', superCookie)
      .set('Origin', config.webOrigin)
      .send({ email: 'other@example.test', role: 'SUPER_ADMIN' })
      .expect(400);
  });

  it('disables and re-enables a user without restoring revoked sessions', async () => {
    const secondSession = await session(userId);
    const disabled = await request(app.getHttpServer())
      .patch(`/api/users/${userId}/access`)
      .set('Cookie', adminCookie)
      .set('Origin', config.webOrigin)
      .send({ status: 'DISABLED', version: 0 })
      .expect(200);
    expect(accountDetailSchema.parse(disabled.body).user.status).toBe(
      'DISABLED',
    );
    for (const cookie of [userCookie, secondSession])
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);
    await request(app.getHttpServer())
      .patch(`/api/users/${userId}/access`)
      .set('Cookie', adminCookie)
      .set('Origin', config.webOrigin)
      .send({ status: 'ACTIVE', version: 1 })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', userCookie)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', config.webOrigin)
      .send({ email: 'user@example.test', password: PASSWORD })
      .expect(200);
  });

  it('creates a hash-only invitation, accepts it once and permits the new user to log in', async () => {
    const created = await invite('  NEW@Example.test  ', 'ADMIN');
    const token = new URL(created.link).hash.slice(1);
    expect(created.link).toMatch(/^http:\/\/localhost:3000\/invite#/);
    const stored = await database.prisma.userInvitation.findUniqueOrThrow({
      where: { id: created.invitation.id },
    });
    expect(stored.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(JSON.stringify(stored)).not.toContain(token);
    await resolve(token).expect(200);
    await accept(token).expect(204);
    await accept(token).expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', config.webOrigin)
      .send({ email: 'new@example.test', password: PASSWORD })
      .expect(200);
    const history = await request(app.getHttpServer())
      .get('/api/invitations?status=ACCEPTED')
      .set('Cookie', superCookie)
      .expect(200);
    expect(
      invitationListSchema.parse(history.body).invitations[0]?.status,
    ).toBe('ACCEPTED');
    expect(history.text).not.toContain(token);
    expect(history.text).not.toContain('tokenHash');
    expect(history.text).not.toContain('passwordHash');
  });

  it('expires, rotates and revokes invitations; prevents duplicate existing accounts', async () => {
    const created = await invite('expired@example.test');
    const token = new URL(created.link).hash.slice(1);
    await database.prisma.userInvitation.update({
      where: { id: created.invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await resolve(token).expect(400);
    const next = await request(app.getHttpServer())
      .post(`/api/invitations/${created.invitation.id}/reinvite`)
      .set('Cookie', superCookie)
      .set('Origin', config.webOrigin)
      .expect(201);
    const renewed = createdInvitationSchema.parse(next.body);
    await resolve(token).expect(400);
    await resolve(new URL(renewed.link).hash.slice(1)).expect(200);
    await request(app.getHttpServer())
      .post(`/api/invitations/${renewed.invitation.id}/revoke`)
      .set('Cookie', superCookie)
      .set('Origin', config.webOrigin)
      .expect(204);
    await resolve(new URL(renewed.link).hash.slice(1)).expect(400);
    await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Cookie', superCookie)
      .set('Origin', config.webOrigin)
      .send({ email: 'user@example.test', role: 'USER' })
      .expect(409);
  });

  it('rechecks invitation authority and role changes against the current database state', async () => {
    const created = await invite('member@example.test', 'USER', adminCookie);
    const elevated = await invite('manager@example.test', 'ADMIN');
    await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Cookie', adminCookie)
      .set('Origin', config.webOrigin)
      .send({ email: elevated.invitation.email, role: 'USER' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/users/${adminId}/access`)
      .set('Cookie', superCookie)
      .set('Origin', config.webOrigin)
      .send({ role: 'USER', version: 0 })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Cookie', adminCookie)
      .expect(403);
    await resolve(new URL(created.link).hash.slice(1)).expect(400);
  });

  it('requires the current password, preserves exact new passwords and revokes every session atomically', async () => {
    const second = await session(userId);
    const nextPassword = '  new test passphrase  ';
    await request(app.getHttpServer())
      .post('/api/account/password')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({ currentPassword: 'wrong', newPassword: nextPassword })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', userCookie)
      .expect(200);
    const changed = await request(app.getHttpServer())
      .post('/api/account/password')
      .set('Cookie', userCookie)
      .set('Origin', config.webOrigin)
      .send({ currentPassword: PASSWORD, newPassword: nextPassword })
      .expect(204);
    expect(changed.headers['set-cookie']?.[0]).toContain('assetnote_session=;');
    for (const cookie of [userCookie, second])
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', config.webOrigin)
      .send({ email: 'user@example.test', password: PASSWORD })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', config.webOrigin)
      .send({ email: 'user@example.test', password: nextPassword })
      .expect(200);
    const stored = await database.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.passwordHash).not.toBe(nextPassword);
  });

  it('accepts an invitation at most once under concurrent requests', async () => {
    const created = await invite('race@example.test');
    const token = new URL(created.link).hash.slice(1);
    const results = await Promise.all([
      accept(token, 'first'),
      accept(token, 'second'),
    ]);
    expect(results.filter((result) => result.status === 204)).toHaveLength(1);
    expect(
      results.filter((result) => [400, 409].includes(result.status)),
    ).toHaveLength(1);
    expect(
      await database.prisma.user.count({
        where: { email: 'race@example.test' },
      }),
    ).toBe(1);
  });

  it('rejects one of two simultaneous edits to the same account version', async () => {
    const results = await Promise.all(
      ['first', 'second'].map((nickname) =>
        request(app.getHttpServer())
          .patch('/api/account/profile')
          .set('Cookie', userCookie)
          .set('Origin', config.webOrigin)
          .send({ nickname, version: 0 }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
  });
});
